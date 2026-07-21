import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb, schema } from "../db.js";
import { router, protectedProcedure } from "../_core/trpc.js";
import { invokeLLM } from "../_core/llm.js";

const { firmMemoryProfiles, firmMemorySamples } = schema;

export const firmMemoryRouter = router({
  getProfile: protectedProcedure.input(z.object({ firmId: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const [profile] = await db
      .select()
      .from(firmMemoryProfiles)
      .where(eq(firmMemoryProfiles.firmId, input.firmId))
      .limit(1);
    return profile ?? null;
  }),

  upsertProfile: protectedProcedure
    .input(
      z.object({
        firmId: z.number(),
        writingTone: z.string().optional(),
        citationStyle: z.string().optional(),
        formattingPreferences: z.any().optional(),
        captionFormat: z.string().optional(),
        preferredArguments: z.any().optional(),
        additionalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { firmId, ...data } = input;
      const [existing] = await db
        .select()
        .from(firmMemoryProfiles)
        .where(eq(firmMemoryProfiles.firmId, firmId))
        .limit(1);

      if (existing) {
        await db.update(firmMemoryProfiles).set(data).where(eq(firmMemoryProfiles.id, existing.id));
        const [updated] = await db
          .select()
          .from(firmMemoryProfiles)
          .where(eq(firmMemoryProfiles.id, existing.id))
          .limit(1);
        return updated!;
      }

      const [result] = await db.insert(firmMemoryProfiles).values({ firmId, ...data });
      const [profile] = await db
        .select()
        .from(firmMemoryProfiles)
        .where(eq(firmMemoryProfiles.id, Number(result.insertId)))
        .limit(1);
      return profile!;
    }),

  uploadSample: protectedProcedure
    .input(
      z.object({
        firmId: z.number(),
        profileId: z.number(),
        fileName: z.string(),
        fileKey: z.string(),
        fileUrl: z.string(),
        documentType: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(firmMemorySamples).values(input);
      const [sample] = await db
        .select()
        .from(firmMemorySamples)
        .where(eq(firmMemorySamples.id, Number(result.insertId)))
        .limit(1);
      return sample!;
    }),

  listSamples: protectedProcedure.input(z.object({ firmId: z.number() })).query(async ({ input }) => {
    const db = getDb();
    return db
      .select()
      .from(firmMemorySamples)
      .where(eq(firmMemorySamples.firmId, input.firmId))
      .orderBy(desc(firmMemorySamples.createdAt));
  }),

  deleteSample: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    await db.delete(firmMemorySamples).where(eq(firmMemorySamples.id, input.id));
    return { ok: true };
  }),

  analyzeSample: protectedProcedure.input(z.object({ sampleId: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    const [sample] = await db
      .select()
      .from(firmMemorySamples)
      .where(eq(firmMemorySamples.id, input.sampleId))
      .limit(1);
    if (!sample) throw new TRPCError({ code: "NOT_FOUND" });

    const response = await invokeLLM({
      model: "claude-sonnet-4-6",
      messages: [
        {
          role: "system",
          content:
            "You are a legal writing analyst. Analyze the provided document and extract the writing style characteristics.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this legal document "${sample.fileName}" and extract: writing tone, citation style, formatting preferences, and distinctive argumentative patterns.`,
            },
            { type: "file_url", file_url: { url: sample.fileUrl, mime_type: "application/pdf" } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "style_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              writingTone: { type: "string" },
              citationStyle: { type: "string" },
              formattingNotes: { type: "string" },
              argumentativePatterns: { type: "string" },
              vocabularyLevel: { type: "string" },
              sentenceStructure: { type: "string" },
            },
            required: [
              "writingTone",
              "citationStyle",
              "formattingNotes",
              "argumentativePatterns",
              "vocabularyLevel",
              "sentenceStructure",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    await db.update(firmMemorySamples).set({ analysisResult: analysis }).where(eq(firmMemorySamples.id, input.sampleId));
    return analysis;
  }),
});

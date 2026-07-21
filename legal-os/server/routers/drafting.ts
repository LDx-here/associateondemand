import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb, schema } from "../db.js";
import { router, protectedProcedure } from "../_core/trpc.js";
import { invokeLLM, listLLMModels } from "../_core/llm.js";
import { buildDraftingPrompt } from "../../shared/types.js";

const { matters, llmTaskConfigs, firmMemoryProfiles, documents, agentTasks } = schema;

const DEFAULT_DRAFTING_PROMPT =
  "You are an experienced litigation associate attorney drafting a motion for a law firm client. You write with precision, cite relevant case law with proper Bluebook formatting, and structure arguments persuasively. Your writing is concise but thorough — every sentence advances the argument. You follow the firm's established style exactly as specified in the FIRM STYLE REQUIREMENTS section.";

export const draftingRouter = router({
  generateDraft: protectedProcedure
    .input(
      z.object({
        matterId: z.number(),
        taskType: z.string(),
        instructions: z.string(),
        additionalContext: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [matter] = await db.select().from(matters).where(eq(matters.id, input.matterId)).limit(1);
      if (!matter) throw new TRPCError({ code: "NOT_FOUND" });

      const [config] = await db
        .select()
        .from(llmTaskConfigs)
        .where(eq(llmTaskConfigs.taskType, input.taskType))
        .limit(1);

      let firmProfile = null;
      if (matter.firmId) {
        const [profile] = await db
          .select()
          .from(firmMemoryProfiles)
          .where(eq(firmMemoryProfiles.firmId, matter.firmId))
          .limit(1);
        firmProfile = profile ?? null;
      }

      const effectiveConfig = config ?? {
        systemPrompt: DEFAULT_DRAFTING_PROMPT,
        preferredModel: "claude" as const,
        temperature: "0.70",
        maxTokens: 4096,
      };

      const systemPrompt = buildDraftingPrompt(effectiveConfig, firmProfile, matter);
      const preferred = config?.preferredModel ?? "claude";
      const model = preferred === "gpt" ? "gpt-4o" : "claude-sonnet-4-6";

      const userContent = input.additionalContext
        ? `${input.instructions}\n\nAdditional context:\n${input.additionalContext}`
        : input.instructions;

      const response = await invokeLLM({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        ...(model.startsWith("claude") ? { thinking: { type: "enabled", budget_tokens: 4096 } } : {}),
        temperature: config?.temperature ? Number(config.temperature) : 0.7,
        max_tokens: config?.maxTokens ?? 4096,
      });

      const draftContent = response.choices[0].message.content;
      const fileName = `${input.taskType}-draft-${Date.now()}.md`;
      const fileKey = `drafts/${matter.id}/${fileName}`;

      await db.insert(documents).values({
        matterId: matter.id,
        fileName,
        fileUrl: `inline://${fileKey}`,
        fileKey,
        documentType: "draft",
        uploadedBy: "drafting-agent",
      });

      const pendingTasks = await db
        .select()
        .from(agentTasks)
        .where(eq(agentTasks.matterId, input.matterId));
      const draftingTask = pendingTasks.find((t) => t.taskType === "drafting" && t.status !== "completed");
      if (draftingTask) {
        await db
          .update(agentTasks)
          .set({ status: "completed", output: { draft: draftContent }, completedAt: new Date() })
          .where(eq(agentTasks.id, draftingTask.id));
      }

      return { draft: draftContent, model, fileName };
    }),

  updateConfig: protectedProcedure
    .input(
      z.object({
        taskType: z.string(),
        preferredModel: z.enum(["claude", "gpt"]),
        systemPrompt: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(llmTaskConfigs)
        .where(eq(llmTaskConfigs.taskType, input.taskType))
        .limit(1);

      const values = {
        taskType: input.taskType,
        preferredModel: input.preferredModel,
        systemPrompt: input.systemPrompt,
        temperature: input.temperature?.toString(),
        maxTokens: input.maxTokens,
      };

      if (existing) {
        await db.update(llmTaskConfigs).set(values).where(eq(llmTaskConfigs.id, existing.id));
        const [updated] = await db.select().from(llmTaskConfigs).where(eq(llmTaskConfigs.id, existing.id)).limit(1);
        return updated!;
      }

      const [result] = await db.insert(llmTaskConfigs).values(values);
      const [config] = await db
        .select()
        .from(llmTaskConfigs)
        .where(eq(llmTaskConfigs.id, Number(result.insertId)))
        .limit(1);
      return config!;
    }),

  listConfigs: protectedProcedure.query(async () => {
    const db = getDb();
    return db.select().from(llmTaskConfigs).orderBy(llmTaskConfigs.taskType);
  }),

  listModels: protectedProcedure.query(() => listLLMModels()),
});

export { DEFAULT_DRAFTING_PROMPT };

import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb, schema } from "../db.js";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc.js";
import { validateWorkEmail } from "../../shared/types.js";
import { STAGE_NEXT_ACTION } from "../../shared/types.js";
import { assignAgentForStage } from "./matters.js";

const { leads, firms, matters } = schema;

export const leadsRouter = router({
  create: publicProcedure
    .input(
      z.object({
        firmName: z.string().min(1),
        attorneyName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        intakePath: z.enum(["quick_upload", "guided_request"]).optional(),
        referringPage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!validateWorkEmail(input.email)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please use your firm's email address.",
        });
      }
      const db = getDb();
      const [result] = await db.insert(leads).values({
        ...input,
        status: "new",
      });
      const [lead] = await db.select().from(leads).where(eq(leads.id, Number(result.insertId))).limit(1);
      return lead!;
    }),

  updateSession: publicProcedure
    .input(
      z.object({
        leadId: z.number(),
        sessionData: z.any(),
        lastStepCompleted: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(leads)
        .set({
          sessionData: input.sessionData,
          lastStepCompleted: input.lastStepCompleted,
          status: "in_progress",
        })
        .where(eq(leads.id, input.leadId));
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      return lead!;
    }),

  list: protectedProcedure.query(async () => {
    const db = getDb();
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const [lead] = await db.select().from(leads).where(eq(leads.id, input.id)).limit(1);
    if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
    return lead;
  }),

  convertToMatter: protectedProcedure.input(z.object({ leadId: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
    if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

    const session = (lead.sessionData ?? {}) as Record<string, unknown>;

    const [firmResult] = await db.insert(firms).values({
      name: lead.firmName,
      contactName: lead.attorneyName,
      email: lead.email,
      phone: lead.phone ?? undefined,
      practiceArea: (session.practiceArea as string) ?? undefined,
      firmSize: (session.firmSize as string) ?? undefined,
    });
    const firmId = Number(firmResult.insertId);

    const [matterResult] = await db.insert(matters).values({
      firmId,
      leadId: lead.id,
      title: (session.title as string) ?? `${lead.firmName} — ${(session.serviceName as string) ?? "New matter"}`,
      matterType: ((session.matterType as string) ?? "employment") as "employment" | "pi" | "immigration",
      stage: lead.intakePath === "quick_upload" ? "quote" : "intake",
      status: "pending",
      nextAction: STAGE_NEXT_ACTION[lead.intakePath === "quick_upload" ? "quote" : "intake"] ?? undefined,
      urgency: ((session.urgency as string) ?? "flexible") as "24h" | "48h" | "this_week" | "flexible",
      jurisdiction: (session.jurisdiction as string) ?? undefined,
      opposingParty: (session.opposingParty as string) ?? undefined,
      opposingCounsel: (session.opposingCounsel as string) ?? undefined,
      caption: (session.caption as string) ?? undefined,
      description: (session.description as string) ?? undefined,
      serviceType: (session.serviceName as string) ?? undefined,
      totalFee: session.totalFee ? String(session.totalFee) : undefined,
    });
    const matterId = Number(matterResult.insertId);

    await db
      .update(leads)
      .set({ status: "converted", convertedToMatterId: matterId })
      .where(eq(leads.id, input.leadId));

    await assignAgentForStage(matterId, lead.intakePath === "quick_upload" ? "quote" : "intake");

    const [matter] = await db.select().from(matters).where(eq(matters.id, matterId)).limit(1);
    return matter!;
  }),
});

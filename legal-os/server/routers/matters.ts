import { eq, desc, sql, like, or, and, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb, schema } from "../db.js";
import { router, protectedProcedure } from "../_core/trpc.js";
import {
  MATTER_STAGES,
  isValidStageTransition,
  STAGE_AGENT_TYPE,
  STAGE_NEXT_ACTION,
  type MatterStage,
} from "../../shared/types.js";

const { matters, agents, agentTasks, firms } = schema;

async function getAgentByType(type: string) {
  const db = getDb();
  const [agent] = await db.select().from(agents).where(eq(agents.type, type as typeof agents.type.enumValues[number])).limit(1);
  return agent ?? null;
}

async function assignAgentForStage(matterId: number, stage: MatterStage) {
  const agentType = STAGE_AGENT_TYPE[stage];
  if (!agentType) return null;

  const agent = await getAgentByType(agentType);
  if (!agent) return null;

  const db = getDb();
  await db.update(matters).set({ assignedAgentId: agent.id }).where(eq(matters.id, matterId));

  await db.insert(agentTasks).values({
    matterId,
    agentId: agent.id,
    taskType: stage,
    status: "pending",
    input: { stage },
  });

  return agent;
}

export const mattersRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          stage: z.enum(MATTER_STAGES as unknown as [MatterStage, ...MatterStage[]]).optional(),
          firmId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.stage) conditions.push(eq(matters.stage, input.stage));
      if (input?.firmId) conditions.push(eq(matters.firmId, input.firmId));
      return db
        .select()
        .from(matters)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(matters.updatedAt));
    }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const [matter] = await db.select().from(matters).where(eq(matters.id, input.id)).limit(1);
    if (!matter) throw new TRPCError({ code: "NOT_FOUND" });
    return matter;
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        matterType: z.enum(["employment", "pi", "immigration"]),
        firmId: z.number().optional(),
        leadId: z.number().optional(),
        urgency: z.enum(["24h", "48h", "this_week", "flexible"]).default("flexible"),
        jurisdiction: z.string().optional(),
        opposingParty: z.string().optional(),
        opposingCounsel: z.string().optional(),
        caption: z.string().optional(),
        description: z.string().optional(),
        serviceType: z.string().optional(),
        totalFee: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(matters).values({
        ...input,
        totalFee: input.totalFee?.toString(),
        stage: "intake",
        status: "pending",
        nextAction: STAGE_NEXT_ACTION.intake ?? undefined,
      });
      const matterId = result.insertId;
      await assignAgentForStage(Number(matterId), "intake");
      const [matter] = await db.select().from(matters).where(eq(matters.id, Number(matterId))).limit(1);
      return matter!;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        jurisdiction: z.string().optional(),
        opposingParty: z.string().optional(),
        opposingCounsel: z.string().optional(),
        caption: z.string().optional(),
        description: z.string().optional(),
        deadline: z.date().optional(),
        totalFee: z.number().optional(),
        complexity: z.enum(["low", "medium", "high"]).optional(),
        estimatedPages: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, totalFee, ...rest } = input;
      await db
        .update(matters)
        .set({ ...rest, ...(totalFee !== undefined ? { totalFee: totalFee.toString() } : {}) })
        .where(eq(matters.id, id));
      const [matter] = await db.select().from(matters).where(eq(matters.id, id)).limit(1);
      return matter!;
    }),

  transitionStage: protectedProcedure
    .input(
      z.object({
        matterId: z.number(),
        targetStage: z.enum(MATTER_STAGES as unknown as [MatterStage, ...MatterStage[]]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [matter] = await db.select().from(matters).where(eq(matters.id, input.matterId)).limit(1);
      if (!matter) throw new TRPCError({ code: "NOT_FOUND" });

      if (!isValidStageTransition(matter.stage as MatterStage, input.targetStage)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid transition from ${matter.stage} to ${input.targetStage}`,
        });
      }

      const nextAction = STAGE_NEXT_ACTION[input.targetStage];
      await db
        .update(matters)
        .set({
          stage: input.targetStage,
          nextAction: nextAction ?? null,
          status: input.targetStage === "closed" ? "closed" : "active",
          closedAt: input.targetStage === "closed" ? new Date() : null,
        })
        .where(eq(matters.id, input.matterId));

      await assignAgentForStage(input.matterId, input.targetStage);

      const [updated] = await db.select().from(matters).where(eq(matters.id, input.matterId)).limit(1);
      return updated!;
    }),

  assignAgent: protectedProcedure
    .input(z.object({ matterId: z.number(), agentId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(matters).set({ assignedAgentId: input.agentId }).where(eq(matters.id, input.matterId));
      const [matter] = await db.select().from(matters).where(eq(matters.id, input.matterId)).limit(1);
      return matter!;
    }),

  getPipeline: protectedProcedure.query(async () => {
    const db = getDb();
    const all = await db.select().from(matters).orderBy(desc(matters.updatedAt));
    const pipeline: Record<MatterStage, typeof all> = {
      intake: [],
      conflict_check: [],
      quote: [],
      engagement: [],
      drafting: [],
      review: [],
      delivery: [],
      closed: [],
    };
    for (const m of all) {
      pipeline[m.stage as MatterStage].push(m);
    }
    return pipeline;
  }),
});

export { assignAgentForStage, getAgentByType };

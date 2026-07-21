import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb, schema } from "../db.js";
import { router, protectedProcedure } from "../_core/trpc.js";

const { agents, agentTasks } = schema;

export const agentsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = getDb();
    return db.select().from(agents).orderBy(agents.name);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["intake", "conflict", "research", "drafting", "discovery", "calendar", "communication", "review"]),
        description: z.string().optional(),
        llmModel: z.enum(["claude", "gpt"]).default("claude"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(agents).values(input);
      const [agent] = await db.select().from(agents).where(eq(agents.id, Number(result.insertId))).limit(1);
      return agent!;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        llmModel: z.enum(["claude", "gpt"]).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...rest } = input;
      await db.update(agents).set(rest).where(eq(agents.id, id));
      const [agent] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
      return agent!;
    }),

  listTasks: protectedProcedure
    .input(
      z
        .object({
          matterId: z.number().optional(),
          agentId: z.number().optional(),
          status: z.enum(["pending", "in_progress", "completed", "failed"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.matterId) conditions.push(eq(agentTasks.matterId, input.matterId));
      if (input?.agentId) conditions.push(eq(agentTasks.agentId, input.agentId));
      if (input?.status) conditions.push(eq(agentTasks.status, input.status));
      return db
        .select()
        .from(agentTasks)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(agentTasks.createdAt));
    }),

  updateTaskStatus: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        status: z.enum(["pending", "in_progress", "completed", "failed"]),
        output: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const updates: Record<string, unknown> = {
        status: input.status,
        output: input.output,
      };
      if (input.status === "in_progress") updates.startedAt = new Date();
      if (input.status === "completed" || input.status === "failed") updates.completedAt = new Date();

      await db.update(agentTasks).set(updates).where(eq(agentTasks.id, input.taskId));
      const [task] = await db.select().from(agentTasks).where(eq(agentTasks.id, input.taskId)).limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      return task;
    }),
});

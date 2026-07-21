import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb, schema } from "../db.js";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc.js";
import { calculatePrice, type Urgency } from "../../shared/types.js";

const { services } = schema;

function parseDecimal(v: string | null | undefined): number {
  return v ? Number(v) : 0;
}

export const servicesRouter = router({
  list: publicProcedure.query(async () => {
    const db = getDb();
    return db.select().from(services).where(eq(services.isActive, true));
  }),

  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const [service] = await db.select().from(services).where(eq(services.id, input.id)).limit(1);
    if (!service) throw new TRPCError({ code: "NOT_FOUND" });
    return service;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        category: z.string().optional(),
        baseFee: z.number(),
        standardTurnaround: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(services).values({
        ...input,
        baseFee: input.baseFee.toString(),
      });
      const [service] = await db.select().from(services).where(eq(services.id, Number(result.insertId))).limit(1);
      return service!;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        baseFee: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, baseFee, ...rest } = input;
      await db
        .update(services)
        .set({ ...rest, ...(baseFee !== undefined ? { baseFee: baseFee.toString() } : {}) })
        .where(eq(services.id, id));
      const [service] = await db.select().from(services).where(eq(services.id, id)).limit(1);
      return service!;
    }),

  calculatePrice: publicProcedure
    .input(
      z.object({
        serviceId: z.number(),
        urgency: z.enum(["24h", "48h", "this_week", "flexible"]),
        hasFirmMemorySamples: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const [service] = await db.select().from(services).where(eq(services.id, input.serviceId)).limit(1);
      if (!service) throw new TRPCError({ code: "NOT_FOUND" });

      return calculatePrice(
        parseDecimal(service.baseFee),
        input.urgency as Urgency,
        {
          rush24h: parseDecimal(service.rushMultiplier24h),
          rush48h: parseDecimal(service.rushMultiplier48h),
          rushWeek: parseDecimal(service.rushMultiplierWeek),
        },
        parseDecimal(service.sampleDiscount),
        input.hasFirmMemorySamples
      );
    }),
});

import { eq, desc, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db.js";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc.js";

const { conflictChecks, matters } = schema;

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export const conflictsRouter = router({
  check: publicProcedure
    .input(
      z.object({
        opposingParty: z.string().min(1),
        opposingCounsel: z.string().optional(),
        leadId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const partyPattern = `%${normalize(input.opposingParty)}%`;
      const counselPattern = input.opposingCounsel ? `%${normalize(input.opposingCounsel)}%` : null;

      const partyMatches = await db
        .select()
        .from(matters)
        .where(
          or(
            sql`LOWER(${matters.opposingParty}) LIKE ${partyPattern}`,
            sql`LOWER(${matters.title}) LIKE ${partyPattern}`
          )
        );

      let counselMatches: typeof partyMatches = [];
      if (counselPattern) {
        counselMatches = await db
          .select()
          .from(matters)
          .where(sql`LOWER(${matters.opposingCounsel}) LIKE ${counselPattern}`);
      }

      const matches = [...partyMatches, ...counselMatches];
      const uniqueIds = new Set(matches.map((m) => m.id));
      const result = uniqueIds.size > 0 ? "review_required" : "clear";
      const details =
        uniqueIds.size > 0
          ? `Found ${uniqueIds.size} potential match(es). Human review required.`
          : "No matches found.";

      const [inserted] = await db.insert(conflictChecks).values({
        leadId: input.leadId,
        opposingParty: input.opposingParty,
        opposingCounsel: input.opposingCounsel,
        result: result as "clear" | "review_required",
        details,
      });

      return {
        result,
        details,
        matchCount: uniqueIds.size,
        checkId: inserted.insertId,
      };
    }),

  list: protectedProcedure.query(async () => {
    const db = getDb();
    return db.select().from(conflictChecks).orderBy(desc(conflictChecks.checkedAt));
  }),
});

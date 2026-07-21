import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db.js";
import { router, protectedProcedure } from "../_core/trpc.js";

const { documents } = schema;

export const filesRouter = router({
  listByMatter: protectedProcedure.input(z.object({ matterId: z.number() })).query(async ({ input }) => {
    const db = getDb();
    return db
      .select()
      .from(documents)
      .where(eq(documents.matterId, input.matterId))
      .orderBy(desc(documents.createdAt));
  }),

  registerUpload: protectedProcedure
    .input(
      z.object({
        matterId: z.number().optional(),
        firmId: z.number().optional(),
        fileName: z.string(),
        contentType: z.string(),
        fileKey: z.string(),
        fileUrl: z.string(),
        documentType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      if (!input.matterId) {
        return { key: input.fileKey, url: input.fileUrl, fileName: input.fileName };
      }
      const [result] = await db.insert(documents).values({
        matterId: input.matterId,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileKey: input.fileKey,
        documentType: input.documentType,
        uploadedBy: ctx.user.email ?? "admin",
      });
      return { id: result.insertId, key: input.fileKey, url: input.fileUrl, fileName: input.fileName };
    }),
});

import { router, protectedProcedure, publicProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),
  login: publicProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(({ input }) => {
      if (input.apiKey !== process.env.ADMIN_API_KEY) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials." });
      }
      return { ok: true, cookie: "legal_os_session=admin; Path=/; HttpOnly; SameSite=Lax" };
    }),
  logout: publicProcedure.mutation(() => ({ ok: true })),
});

export type AuthRouter = typeof authRouter;

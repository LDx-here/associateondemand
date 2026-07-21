import { router, publicProcedure } from "./trpc.js";

export const systemRouter = router({
  health: publicProcedure.query(() => ({
    ok: true,
    service: "rmv-legal-os",
    timestamp: new Date().toISOString(),
  })),
});

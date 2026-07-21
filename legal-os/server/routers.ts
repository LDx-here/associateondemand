import { router } from "./_core/trpc.js";
import { systemRouter } from "./_core/systemRouter.js";
import { authRouter } from "./routers/auth.js";
import { mattersRouter } from "./routers/matters.js";
import { leadsRouter } from "./routers/leads.js";
import { conflictsRouter } from "./routers/conflicts.js";
import { agentsRouter } from "./routers/agents.js";
import { firmMemoryRouter } from "./routers/firmMemory.js";
import { servicesRouter } from "./routers/services.js";
import { draftingRouter } from "./routers/drafting.js";
import { clioRouter } from "./routers/clio.js";
import { filesRouter } from "./routers/files.js";
import { paymentsRouter } from "./routers/payments.js";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  matters: mattersRouter,
  leads: leadsRouter,
  conflicts: conflictsRouter,
  agents: agentsRouter,
  firmMemory: firmMemoryRouter,
  services: servicesRouter,
  drafting: draftingRouter,
  clio: clioRouter,
  files: filesRouter,
  payments: paymentsRouter,
});

export type AppRouter = typeof appRouter;

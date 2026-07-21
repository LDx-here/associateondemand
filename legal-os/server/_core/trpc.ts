import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

export type SessionUser = {
  id: number;
  openId: string;
  email: string | null;
  role: "user" | "admin";
  isCron?: boolean;
};

export type Context = {
  user: SessionUser | null;
};

function parseSession(req: CreateExpressContextOptions["req"]): SessionUser | null {
  const apiKey = req.headers["x-admin-key"] as string | undefined;
  if (apiKey && apiKey === process.env.ADMIN_API_KEY) {
    return { id: 0, openId: "admin", email: "admin@rmv.local", role: "admin" };
  }
  const cronSecret = req.headers["x-cron-secret"] as string | undefined;
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    return { id: -1, openId: "cron", email: null, role: "admin", isCron: true };
  }
  const cookie = req.headers.cookie ?? "";
  const match = cookie.match(/legal_os_session=([^;]+)/);
  if (match?.[1] === "admin") {
    return { id: 0, openId: "admin", email: "admin@rmv.local", role: "admin" };
  }
  return null;
}

export async function createContext({ req }: CreateExpressContextOptions): Promise<Context> {
  return { user: parseSession(req) };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin authentication required." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const cronProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user?.isCron) {
    throw new TRPCError({ code: "FORBIDDEN", message: "cron-only" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

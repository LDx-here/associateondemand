/**
 * Clio integration — per LEGAL_BOUNDARIES.md:
 * No production connector until paying Clio subscription + scoped business need.
 * Router returns explicit "not configured" when credentials absent.
 */
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb, schema } from "../db.js";
import { router, protectedProcedure } from "../_core/trpc.js";
import {
  getClioAuthUrl,
  exchangeClioCode,
  clioApiRequest,
  isClioConfigured,
  clioNotConfiguredError,
} from "../clio.js";

const { clioTokens, clioWebhookEvents, matters } = schema;

export const clioRouter = router({
  getAuthUrl: protectedProcedure.mutation(async ({ ctx }) => {
    if (!isClioConfigured()) throw clioNotConfiguredError();
    const state = crypto.randomBytes(16).toString("hex");
    return { url: getClioAuthUrl(state), state };
  }),

  getConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
    if (!isClioConfigured()) {
      return {
        configured: false,
        connected: false,
        message: "Clio integration disabled per LEGAL_BOUNDARIES — requires paying subscription.",
      };
    }
    const db = getDb();
    const [token] = await db
      .select()
      .from(clioTokens)
      .where(eq(clioTokens.userId, ctx.user.id))
      .limit(1);
    return {
      configured: true,
      connected: !!token && token.expiresAt > new Date(),
      expiresAt: token?.expiresAt ?? null,
    };
  }),

  syncMatters: protectedProcedure.mutation(async ({ ctx }) => {
    if (!isClioConfigured()) throw clioNotConfiguredError();
    const db = getDb();
    const [token] = await db.select().from(clioTokens).where(eq(clioTokens.userId, ctx.user.id)).limit(1);
    if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Clio not connected." });

    const clioMatters = await clioApiRequest(token.accessToken, "/matters?limit=50");
    return { synced: true, count: clioMatters?.data?.length ?? 0, note: "Pull-only stub — map to local matters in production." };
  }),

  syncContacts: protectedProcedure.mutation(async ({ ctx }) => {
    if (!isClioConfigured()) throw clioNotConfiguredError();
    const db = getDb();
    const [token] = await db.select().from(clioTokens).where(eq(clioTokens.userId, ctx.user.id)).limit(1);
    if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Clio not connected." });

    const contacts = await clioApiRequest(token.accessToken, "/contacts?limit=50");
    return { synced: true, count: contacts?.data?.length ?? 0 };
  }),

  syncDocuments: protectedProcedure
    .input(z.object({ matterId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!isClioConfigured()) throw clioNotConfiguredError();
      const db = getDb();
      const [matter] = await db.select().from(matters).where(eq(matters.id, input.matterId)).limit(1);
      if (!matter?.clioMatterId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Matter not linked to Clio." });
      }
      return { uploaded: false, message: "Document sync stub — wire when Clio credentials active." };
    }),

  storeTokens: protectedProcedure
    .input(
      z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
        expiresIn: z.number(),
        scope: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isClioConfigured()) throw clioNotConfiguredError();
      const db = getDb();
      const expiresAt = new Date(Date.now() + input.expiresIn * 1000);
      await db.insert(clioTokens).values({
        userId: ctx.user.id,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt,
        scope: input.scope,
      });
      return { ok: true };
    }),

  listWebhookEvents: protectedProcedure.query(async () => {
    const db = getDb();
    return db.select().from(clioWebhookEvents).limit(50);
  }),
});

export async function handleClioOAuthCallback(code: string, userId: number) {
  if (!isClioConfigured()) return { error: "Clio not configured" };
  const tokens = await exchangeClioCode(code);
  if (!tokens.access_token) return { error: "Token exchange failed" };

  const db = getDb();
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);
  await db.insert(clioTokens).values({
    userId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    scope: tokens.scope,
  });
  return { ok: true };
}

export async function handleClioWebhook(payload: unknown, signature: string | undefined) {
  const secret = process.env.CLIO_WEBHOOK_SECRET;
  if (!secret) return { status: 503, body: { error: "Clio webhooks not configured" } };

  if (signature) {
    const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
    if (signature !== expected) {
      return { status: 401, body: { error: "Invalid signature" } };
    }
  }

  const db = getDb();
  const event = payload as { type?: string; resource?: { type?: string; id?: string } };
  await db.insert(clioWebhookEvents).values({
    eventType: event.type ?? "unknown",
    resourceType: event.resource?.type ?? "unknown",
    resourceId: String(event.resource?.id ?? ""),
    payload,
  });

  return { status: 200, body: { received: true } };
}

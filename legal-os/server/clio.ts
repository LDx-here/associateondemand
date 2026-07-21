import { TRPCError } from "@trpc/server";

const CLIO_API_BASE = "https://app.clio.com/api/v4";
const CLIO_AUTH_URL = "https://app.clio.com/oauth/authorize";
const CLIO_TOKEN_URL = "https://app.clio.com/oauth/token";

export function isClioConfigured(): boolean {
  return !!(
    process.env.CLIO_CLIENT_ID &&
    process.env.CLIO_CLIENT_SECRET &&
    process.env.CLIO_REDIRECT_URI &&
    process.env.CLIO_ENABLED === "true"
  );
}

export function clioNotConfiguredError(): TRPCError {
  return new TRPCError({
    code: "PRECONDITION_FAILED",
    message:
      "Clio integration is disabled. Per LEGAL_BOUNDARIES.md, enable only with paying Clio subscription. Set CLIO_ENABLED=true and OAuth credentials.",
  });
}

export function getClioAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CLIO_CLIENT_ID!,
    redirect_uri: process.env.CLIO_REDIRECT_URI!,
    state,
  });
  return `${CLIO_AUTH_URL}?${params}`;
}

export async function exchangeClioCode(code: string): Promise<{
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}> {
  const response = await fetch(CLIO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.CLIO_CLIENT_ID!,
      client_secret: process.env.CLIO_CLIENT_SECRET!,
      redirect_uri: process.env.CLIO_REDIRECT_URI!,
    }),
  });
  return response.json();
}

export async function clioApiRequest(accessToken: string, endpoint: string, method = "GET", body?: unknown) {
  const response = await fetch(`${CLIO_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

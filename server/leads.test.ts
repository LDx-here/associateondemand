import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("leads.submit", () => {
  it("validates required fields", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.leads.submit({
        firstName: "",
        lastName: "Test",
        email: "test@example.com",
        state: "Ohio",
        description: "Test description",
      })
    ).rejects.toThrow();
  });

  it("validates email format", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.leads.submit({
        firstName: "Test",
        lastName: "User",
        email: "not-an-email",
        state: "Ohio",
        description: "Test description",
      })
    ).rejects.toThrow();
  });
});

describe("leads.list", () => {
  it("requires admin role", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.leads.list()).rejects.toThrow();
  });
});

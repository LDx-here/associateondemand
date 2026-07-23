import { NextResponse } from "next/server";

import { createContact, listContacts, isDemoMode } from "@/lib/data-store";
import { CONTACT_ROLES } from "@/lib/types";

export async function GET() {
  const contacts = await listContacts();
  return NextResponse.json({ contacts, demoMode: isDemoMode() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const displayName = String(body.displayName ?? body.name ?? "").trim();
    if (!displayName) {
      return NextResponse.json({ error: "displayName is required" }, { status: 400 });
    }
    const roleRaw = String(body.role ?? "Client").trim() || "Client";
    const role = CONTACT_ROLES.includes(roleRaw as (typeof CONTACT_ROLES)[number])
      ? roleRaw
      : roleRaw || "Other";

    const contact = await createContact({
      displayName,
      role,
      email: body.email ? String(body.email).trim() : undefined,
      phone: body.phone ? String(body.phone).trim() : undefined,
      organization: body.organization ? String(body.organization).trim() : undefined,
      notes: body.notes ? String(body.notes).trim() : undefined,
      matterCode: body.matterCode ? String(body.matterCode).trim() : undefined,
    });
    return NextResponse.json({ contact, demoMode: isDemoMode() }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Create failed" },
      { status: 500 },
    );
  }
}

"use client";

import Link from "next/link";
import { useState } from "react";

import {
  hasResumableIntake,
  intakeResumeHref,
  loadIntakeSession,
  type IntakeSession,
} from "@/lib/intake-session";

export function ResumeIntakeBanner() {
  const [session] = useState<IntakeSession | null>(() => loadIntakeSession());

  if (!hasResumableIntake(session)) return null;

  const href = intakeResumeHref(session!);
  const label =
    session?.deliverableType ||
    (session?.deliverableId ? session.deliverableId.replace(/-/g, " ") : "assignment");

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
      <span className="font-medium">Resume your assignment</span>
      <span className="text-sky-800"> — you started a {label} intake but did not submit.</span>{" "}
      <Link href={href as "/assignments/new"} className="font-medium underline-offset-2 hover:underline">
        Continue where you left off →
      </Link>
    </div>
  );
}

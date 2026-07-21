"use client";

import { Brain } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type FirmMemoryStatus = {
  templateCount: number;
  sampleCount: number;
  stylePreferenceCount: number;
  configured: boolean;
};

/** Firm Memory status badge — shows configured vs setup needed. */
export function FirmMemoryBadge({
  compact = false,
  linked = false,
  showStatus = false,
}: {
  compact?: boolean;
  linked?: boolean;
  /** When true, fetches /api/firm-memory and shows active vs setup-needed. */
  showStatus?: boolean;
}) {
  const [status, setStatus] = useState<FirmMemoryStatus | null>(null);

  useEffect(() => {
    if (!showStatus) return;
    let cancelled = false;
    void fetch("/api/firm-memory")
      .then((r) => r.json())
      .then((data: FirmMemoryStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [showStatus]);

  const configured = status?.configured;
  const label = compact
    ? configured
      ? "Firm Memory active"
      : "Firm Memory"
    : configured
      ? "Firm Memory — applied to drafting"
      : "Firm Memory — setup recommended";

  const className = configured
    ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900 ring-1 ring-emerald-200"
    : "inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-900 ring-1 ring-violet-200";

  const title = configured
    ? `Firm Memory configured: ${status?.templateCount ?? 0} templates, ${status?.sampleCount ?? 0} samples, ${status?.stylePreferenceCount ?? 0} style prefs.`
    : "AssociateOnDemand learns your firm's writing style from samples and edits — set up before your first pilot assignment.";

  const inner = (
    <>
      <Brain className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </>
  );

  if (linked) {
    return (
      <Link href="/templates#firm-memory" className={`${className} hover:opacity-90`} title={title}>
        {inner}
      </Link>
    );
  }

  return (
    <span className={className} title={title}>
      {inner}
    </span>
  );
}

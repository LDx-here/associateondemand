"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { FirmMemoryBadge } from "@/components/FirmMemoryBadge";

type FirmMemoryStatus = {
  templateCount: number;
  sampleCount: number;
  stylePreferenceCount: number;
  configured: boolean;
};

/** Intake prompt when Firm Memory is not yet configured. */
export function FirmMemoryPrompt({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<FirmMemoryStatus | null>(null);

  useEffect(() => {
    void fetch("/api/firm-memory")
      .then((r) => r.json())
      .then((data: FirmMemoryStatus) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);

  if (status?.configured) {
    return <FirmMemoryBadge compact={compact} linked />;
  }

  return (
    <Link
      href="/templates#firm-memory"
      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-950 ring-1 ring-amber-200 hover:bg-amber-100"
      title="Set up Firm Memory so overflow work matches your firm's style"
    >
      Set up Firm Memory →
    </Link>
  );
}

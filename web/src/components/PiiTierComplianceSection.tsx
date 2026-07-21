"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

const TIER = Number(process.env.NEXT_PUBLIC_PII_TIER ?? "0");

export function PiiTierComplianceSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3 text-sm text-slate-700">
      <p>
        Current tier: <strong>{TIER}</strong>. Attorney-facing upload screens use simple copy; tier policy is
        enforced on the API using <code className="text-xs">AOD_PII_TIER</code> /{" "}
        <code className="text-xs">NEXT_PUBLIC_PII_TIER</code>.
      </p>

      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-800"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>Technical / compliance — PII tiers &amp; Strong Reader</span>
        {open ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
      </button>

      {open ? (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          {TIER >= 1 ? (
            <>
              <p className="font-medium">Tier {TIER}: Strong Reader enabled</p>
              <p className="text-amber-900">
                When the Presidio sidecar is healthy, uploads may be auto-processed with PII scrubbing. Attorney
                sign-off still applies before deliverables export.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Tier 0: manual attorney approval required</p>
              <p className="text-amber-900">
                Documents with client PII are not auto-processed until Strong Reader tier 1 is enabled by IT. The
                API rejects tier-0 uploads unless the authenticated attorney session sends manual review approval
                headers — attorney upload actions in the main UI pass that approval automatically.
              </p>
              <p className="text-amber-900">
                For controlled testing on de-identified or synthetic scans, use the legacy intake upload pages under
                More tools → Intake, or enable tier 1 after Presidio is deployed.
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

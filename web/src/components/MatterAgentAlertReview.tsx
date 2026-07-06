"use client";

import { Bot } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AgentAlertInline } from "@/components/AgentAlertInline";
import type { InboxItem } from "@/lib/types";
import { linkMatter } from "@/lib/ui-classes";

type Props = {
  matterId: string;
  initialAlerts: InboxItem[];
  demoMode?: boolean;
  refreshKey?: number;
  onResolved?: () => void;
};

export function MatterAgentAlertReview({
  matterId,
  initialAlerts,
  demoMode = false,
  refreshKey = 0,
  onResolved,
}: Props) {
  const [alerts, setAlerts] = useState(initialAlerts);

  const refreshAlerts = useCallback(async () => {
    const resp = await fetch(`/api/matters/${matterId}/agent-alerts`);
    if (resp.ok) {
      const data = (await resp.json()) as { alerts: InboxItem[] };
      setAlerts(data.alerts);
    }
  }, [matterId]);

  useEffect(() => {
    setAlerts(initialAlerts);
  }, [initialAlerts, refreshKey]);

  const pending = alerts.filter((a) => a.status === "Pending");
  if (pending.length === 0) return null;

  return (
    <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/30 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Agent alerts</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Gaps and escalations from associate runs — resolve inline without visiting the inbox.
            </p>
          </div>
        </div>
        <Link href="/inbox" className={`text-xs ${linkMatter}`}>
          All alerts →
        </Link>
      </div>

      {pending.map((item) => (
        <AgentAlertInline
          key={item.id}
          item={item}
          demoMode={demoMode}
          onResolved={() => {
            onResolved?.();
            void refreshAlerts();
          }}
        />
      ))}
    </section>
  );
}

"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/Toast";
import {
  closeMatterStatus,
  isClosedMatterStatus,
  reopenMatterStatus,
} from "@/lib/matter-status";
import type { Matter } from "@/lib/types";
import { btnSecondary } from "@/lib/ui-classes";

export function CloseMatterButton({
  matter,
  onStatusChanged,
}: {
  matter: Matter;
  onStatusChanged: (updated: Matter) => void;
}) {
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const closed = isClosedMatterStatus(matter.status);

  async function applyStatus(nextStatus: string, message: string) {
    setBusy(true);
    try {
      const resp = await fetch(`/api/matters/${matter.matterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!resp.ok) {
        const data = (await resp.json()) as { error?: string };
        throw new Error(data.error ?? "Could not update matter status");
      }
      const data = (await resp.json()) as { matter: Matter };
      onStatusChanged(data.matter);
      showToast(message, "success");
      setConfirmOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Status update failed", "error");
    } finally {
      setBusy(false);
    }
  }

  if (closed) {
    return (
      <button
        type="button"
        className={`${btnSecondary} inline-flex items-center gap-1.5`}
        disabled={busy}
        onClick={() => void applyStatus(reopenMatterStatus(matter.status), "Matter reopened — visible in active list.")}
      >
        <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
        Reopen matter
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`${btnSecondary} inline-flex items-center gap-1.5 text-slate-700`}
        onClick={() => setConfirmOpen(true)}
      >
        <Archive className="h-3.5 w-3.5" aria-hidden />
        Close matter
      </button>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-matter-title"
        >
          <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 id="close-matter-title" className="text-lg font-semibold text-slate-900">
              Close {matter.matterId}?
            </h3>
            <p className="text-sm text-slate-600">
              The matter will be marked <strong>Closed</strong> and hidden from the default matters list.
              Nothing is deleted from Airtable — you can reopen anytime.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecondary} disabled={busy} onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
                disabled={busy}
                onClick={() =>
                  void applyStatus(closeMatterStatus(), `${matter.matterId} closed — use Show closed on Matters to view.`)
                }
              >
                {busy ? "Closing…" : "Close matter"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

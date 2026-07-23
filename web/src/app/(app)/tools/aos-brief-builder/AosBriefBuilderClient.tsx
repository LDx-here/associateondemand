"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

/**
 * Attorney AOS brief builder — hosts Kingdom Counsel selection menu HTML
 * (paragraph variants) and can save selections onto drafting facts for a matter.
 *
 * Static assets:
 *   /aos/AOS_Selection_Menu.html
 *   /aos/AOS_Paragraph_Library.json
 *
 * Selection → drafting facts mapping:
 *   paragraphSelections.section_a / section_d_adverse / section_e_balancing
 *   (e.g. caregiver_autistic_dependent.v3)
 */
export default function AosBriefBuilderClient() {
  const searchParams = useSearchParams();
  const matterId = searchParams.get("matterId") || "";
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const menuSrc = useMemo(() => "/aos/AOS_Selection_Menu.html", []);

  const saveSelections = useCallback(async () => {
    if (!matterId.trim()) {
      setStatus("Add ?matterId=AOD-XXXX to the URL to save selections onto that matter.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const raw = window.localStorage.getItem("aod_aos_selection_menu_v1");
      let selections: Record<string, string> = {};
      let fields: Record<string, unknown> = {};
      if (raw) {
        const parsed = JSON.parse(raw) as {
          selections?: Record<string, string>;
          fields?: Record<string, unknown>;
        };
        selections = parsed.selections || {};
        fields = parsed.fields || {};
      }
      const mapped: Record<string, string> = {};
      if (selections["section-a"]) mapped.section_a = selections["section-a"];
      if (selections.adverse) mapped.section_d_adverse = selections.adverse;
      if (selections.balancing) mapped.section_e_balancing = selections.balancing;

      const res = await fetch(`/api/matters/${encodeURIComponent(matterId)}/drafting-facts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            ...fields,
            paragraphSelections: mapped,
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      setStatus(
        `Saved paragraph selections to ${matterId}. Dispatch drafting for aos-discretionary-brief (library FILL by default).`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }, [matterId]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">AOS brief builder</h1>
          <p className="text-sm text-slate-400">
            Select paragraph variants for equities, adverse, and balancing. Library prose is used by
            default (no API). Optional LLM FILL: set{" "}
            <code className="text-slate-300">AOD_AOS_USE_API=1</code> on the API.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={"/aos/AOS_Paragraph_Library.json" as never}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            target="_blank"
          >
            Library JSON
          </Link>
          <Link
            href="/templates"
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Templates
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveSelections()}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-50"
          >
            {busy ? "Saving…" : matterId ? `Save to ${matterId}` : "Save selections"}
          </button>
        </div>
      </div>
      {status ? (
        <p className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
          {status}
        </p>
      ) : null}
      <iframe
        title="AOS Selection Menu"
        src={menuSrc}
        className="min-h-0 w-full flex-1 rounded-lg border border-slate-700 bg-[#0f1117]"
      />
    </div>
  );
}

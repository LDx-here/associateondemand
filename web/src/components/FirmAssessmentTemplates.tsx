"use client";

import { FileText, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  attorneyUploadApproved,
  uploadDocument,
} from "@/components/IntakeUploadShared";
import { useToast } from "@/components/Toast";
import {
  encodeAssessmentTemplateCategory,
  FIRM_TEMPLATE_MATTER_ID,
  practiceAreaLabel,
} from "@/lib/assessment-documents";
import type { DocumentRow } from "@/lib/types";
import { btnPrimary } from "@/lib/ui-classes";
import { formatDate } from "@/lib/utils";

const PRACTICE_AREAS = ["immigration", "personal_injury"] as const;

export function FirmAssessmentTemplates() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<DocumentRow[]>([]);
  const [area, setArea] = useState<(typeof PRACTICE_AREAS)[number]>("immigration");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const resp = await fetch("/api/assessment-templates");
    const data = (await resp.json()) as { templates?: DocumentRow[] };
    setTemplates(data.templates ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/assessment-templates")
      .then((resp) => resp.json())
      .then((data: { templates?: DocumentRow[] }) => {
        if (cancelled) return;
        setTemplates(data.templates ?? []);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("template-file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const category = encodeAssessmentTemplateCategory(area);
      const data = await uploadDocument(FIRM_TEMPLATE_MATTER_ID, file, attorneyUploadApproved(), "single", {
        documentCategory: category,
      });
      if (data.error) {
        showToast(data.error, "error");
        return;
      }
      const resp = await fetch("/api/assessment-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.filename ?? file.name,
          practiceArea: area,
          airtableDocumentId: data.airtable_document_id,
        }),
      });
      if (!resp.ok) {
        const err = (await resp.json()) as { error?: string };
        showToast(err.error ?? "Template save failed", "error");
        return;
      }
      showToast(`${practiceAreaLabel(area)} assessment template saved.`, "success");
      await refresh();
      input.value = "";
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="firm-assessment-templates" className="space-y-4 rounded-lg border border-violet-200 bg-violet-50/40 p-4">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-5 w-5 text-violet-800" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold text-violet-950">Firm assessment templates</h2>
          <p className="mt-0.5 text-xs text-violet-900">
            Upload your blank assessment form once per practice area. Every new matter can download
            the same template; clients upload their filled version on the matter Documents tab.
          </p>
        </div>
      </div>

      {!loaded ? (
        <p className="text-sm text-slate-500">Loading templates…</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {PRACTICE_AREAS.map((pa) => {
            const match = templates.find((t) => t.category === encodeAssessmentTemplateCategory(pa));
            return (
              <li
                key={pa}
                className="rounded-md border border-white bg-white px-3 py-2 text-sm shadow-sm"
              >
                <p className="font-medium text-slate-900">{practiceAreaLabel(pa)}</p>
                {match ? (
                  <p className="mt-0.5 text-xs text-emerald-800">
                    Template on file: {match.title} ({formatDate(match.uploadedAt)})
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-slate-500">No firm template uploaded yet</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form className="space-y-3 rounded-md border border-violet-200 bg-white p-3" onSubmit={onUpload}>
        <label className="block text-sm">
          <span className="text-slate-700">Practice area</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={area}
            onChange={(e) => setArea(e.target.value as (typeof PRACTICE_AREAS)[number])}
          >
            <option value="immigration">Immigration</option>
            <option value="personal_injury">Personal injury</option>
          </select>
        </label>
        <input
          accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.xlsx,.docx"
          className="w-full text-sm"
          name="template-file"
          type="file"
          required
        />
        <button
          type="submit"
          disabled={busy}
          className={`${btnPrimary} inline-flex items-center gap-2 disabled:opacity-50`}
        >
          <Upload className="h-4 w-4" aria-hidden />
          {busy ? "Uploading…" : "Upload firm assessment template"}
        </button>
      </form>
    </section>
  );
}

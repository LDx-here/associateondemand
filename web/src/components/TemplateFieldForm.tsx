"use client";

import { ChevronDown, ChevronRight, ExternalLink, FileDown, FileText, Lock } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/Toast";
import {
  editableFieldsForMap,
  renderFilledTemplate,
  sampleAssetPathForMap,
  type TemplateFieldMap,
} from "@/lib/template-field-maps";
import { specForTemplateFieldMap } from "@/lib/deliverable-template-specs";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

type TemplateFieldFormProps = {
  map: TemplateFieldMap;
  values: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
  onClear?: () => void;
  compact?: boolean;
  showGenerate?: boolean;
  matterId?: string;
};

function LockedSection({
  title,
  preview,
  defaultOpen = false,
}: {
  title: string;
  preview?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/80">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-800"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
        )}
        <Lock className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
        {title}
        <span className="ml-auto font-normal text-slate-400">read-only</span>
      </button>
      {open && preview ? (
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap border-t border-slate-200 px-3 py-2 font-mono text-[11px] text-slate-600">
          {preview}
        </pre>
      ) : null}
    </div>
  );
}

/** Interactive editable fields + locked sections + generate/download. */
export function TemplateFieldForm({
  map,
  values,
  onValuesChange,
  onClear,
  compact = false,
  showGenerate = true,
  matterId,
}: TemplateFieldFormProps) {
  const { showToast } = useToast();
  const [output, setOutput] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const editable = editableFieldsForMap(map);
  const spec = specForTemplateFieldMap(map.id);
  const samplePath = sampleAssetPathForMap(map);

  function setField(id: string, value: string) {
    onValuesChange({ ...values, [id]: value });
  }

  function generate() {
    const text = renderFilledTemplate(map, values);
    setOutput(text);
    setModalOpen(true);
    showToast("Filled template ready — review, copy, or download.", "success");
  }

  async function downloadDocx() {
    const text = output ?? renderFilledTemplate(map, values);
    if (!text.trim()) return;
    setDownloadBusy(true);
    try {
      const r = await fetch("/api/research/memo-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matterId: matterId ?? values.matter_id ?? "template-preview",
          memo: text,
          format: "docx",
        }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        showToast(err.error ?? "Export failed — try Copy instead.", "error");
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${map.id}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("DOCX downloaded.", "success");
    } catch {
      showToast("Export failed.", "error");
    } finally {
      setDownloadBusy(false);
    }
  }

  function copyOutput() {
    const text = output ?? renderFilledTemplate(map, values);
    void navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard.", "success"));
  }

  return (
    <div className={`space-y-3 ${compact ? "" : "mt-2"}`}>
      {samplePath ? (
        <a
          href={samplePath}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btnSecondary} inline-flex items-center gap-1.5 text-xs`}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          View blank form
        </a>
      ) : null}

      {map.boilerplateSections.length ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-700">Locked sections (click to preview)</p>
          {map.boilerplateSections.map((section) => (
            <LockedSection
              key={section}
              title={section}
              preview={spec?.boilerplatePreviews[section]}
            />
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {editable.map((field) => (
          <label key={field.id} className="block text-xs font-medium text-slate-700">
            <span className="text-violet-800">{field.label}</span>
            <span className="ml-1 font-normal text-slate-400">(editable)</span>
            {field.type === "textarea" ? (
              <textarea
                className="mt-1 w-full rounded-md border border-violet-300 bg-white px-2 py-1.5 text-sm ring-1 ring-violet-100 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                rows={3}
                placeholder={field.placeholder}
                value={values[field.id] ?? ""}
                onChange={(e) => setField(field.id, e.target.value)}
              />
            ) : field.type === "select" && field.options?.length ? (
              <select
                className="mt-1 w-full rounded-md border border-violet-300 bg-white px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                value={values[field.id] ?? ""}
                onChange={(e) => setField(field.id, e.target.value)}
              >
                <option value="">Select…</option>
                {field.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="mt-1 w-full rounded-md border border-violet-300 bg-white px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                type={field.type === "date" ? "date" : "text"}
                placeholder={field.placeholder}
                value={values[field.id] ?? ""}
                onChange={(e) => setField(field.id, e.target.value)}
              />
            )}
          </label>
        ))}
      </div>

      {showGenerate ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={generate}>
            <FileText className="mr-1 inline h-4 w-4" aria-hidden />
            Generate
          </button>
          {onClear ? (
            <button type="button" className={btnSecondary} onClick={onClear}>
              Clear fields
            </button>
          ) : null}
        </div>
      ) : null}

      {modalOpen && output ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-output-title"
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 id="template-output-title" className="text-sm font-semibold text-slate-900">
                Generated — {map.name}
              </h3>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-800"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs text-slate-800">
              {output}
            </pre>
            <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-3">
              <button type="button" className={btnPrimary} onClick={copyOutput}>
                Copy
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => void downloadDocx()}
                disabled={downloadBusy}
              >
                <FileDown className="mr-1 inline h-4 w-4" aria-hidden />
                {downloadBusy ? "Exporting…" : "Download DOCX"}
              </button>
              <button type="button" className={btnSecondary} onClick={() => setModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

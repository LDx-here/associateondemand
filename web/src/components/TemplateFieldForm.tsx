"use client";

import { ChevronDown, ChevronRight, ExternalLink, FileDown, FileText, Lock, Pencil } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useToast } from "@/components/Toast";
import { lockKindForSection, SECTION_LOCK_LABELS, specForTemplateFieldMap } from "@/lib/deliverable-template-specs";
import {
  editableFieldsForMap,
  renderFilledTemplate,
  resolveSectionPreview,
  sampleAssetPathForMap,
  type TemplateFieldMap,
} from "@/lib/template-field-maps";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

type TemplateFieldFormProps = {
  map: TemplateFieldMap;
  values: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
  onClear?: () => void;
  compact?: boolean;
  showGenerate?: boolean;
  matterId?: string;
  /** When firm DOCX is on file, hide default HTML blank as "the template". */
  hasFirmTemplateFile?: boolean;
};

function StructureSection({
  title,
  preview,
  lockLabel,
  firmEditable,
  defaultOpen = false,
}: {
  title: string;
  preview?: string;
  lockLabel: string;
  firmEditable: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || firmEditable);
  return (
    <div
      className={`rounded-md border ${
        firmEditable ? "border-violet-200 bg-violet-50/40" : "border-slate-200 bg-slate-50/80"
      }`}
    >
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
        {firmEditable ? (
          <Pencil className="h-3 w-3 shrink-0 text-violet-700" aria-hidden />
        ) : (
          <Lock className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          {title}
          <span className="mt-0.5 block font-normal text-[10px] leading-snug text-slate-500">
            {lockLabel}
          </span>
        </span>
        <span className="shrink-0 font-normal text-slate-400">
          {firmEditable ? "firm-editable" : "structure"}
        </span>
      </button>
      {open && preview ? (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap border-t border-slate-200 px-3 py-2 font-mono text-[11px] text-slate-600">
          {preview}
        </pre>
      ) : null}
      {open && firmEditable ? (
        <p className="border-t border-violet-100 px-3 py-1.5 text-[10px] text-violet-900">
          Edit in{" "}
          <Link href="/settings#firm-profile" className="font-medium underline">
            Settings → Firm profile
          </Link>{" "}
          (letterhead / certificate of service).
        </p>
      ) : null}
    </div>
  );
}

/** Interactive editable fields + structure sections + generate/download. */
export function TemplateFieldForm({
  map,
  values,
  onValuesChange,
  onClear,
  compact = false,
  showGenerate = true,
  matterId,
  hasFirmTemplateFile = false,
}: TemplateFieldFormProps) {
  const { showToast } = useToast();
  const [output, setOutput] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [sectionPreviews, setSectionPreviews] = useState<
    Record<string, { text: string; lockLabel: string; firmEditable: boolean }>
  >({});

  const editable = editableFieldsForMap(map);
  const spec = specForTemplateFieldMap(map.id);
  const samplePath = sampleAssetPathForMap(map);

  useEffect(() => {
    const next: Record<string, { text: string; lockLabel: string; firmEditable: boolean }> = {};
    for (const section of map.boilerplateSections) {
      const resolved = resolveSectionPreview(section, spec, values);
      next[section] = {
        text: resolved.text,
        lockLabel: resolved.lockLabel,
        firmEditable: resolved.lockKind === "firm_editable",
      };
    }
    setSectionPreviews(next);
  }, [map, spec, values]);

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
      {hasFirmTemplateFile ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-950">
          Firm DOCX/PDF is on file for this SKU — preview uses that structure (Templates → View preview), not the
          default system blank HTML.
        </p>
      ) : samplePath ? (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={samplePath}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnSecondary} inline-flex items-center gap-1.5 text-xs`}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            View default system blank
          </a>
          <span className="text-[11px] text-slate-500">
            Not your firm template — upload DOCX on Templates to replace
          </span>
        </div>
      ) : null}

      {map.boilerplateSections.length ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-700">
            Template structure
            <span className="ml-1 font-normal text-slate-500">
              (built-in outline vs firm-editable letterhead / certificate)
            </span>
          </p>
          {map.boilerplateSections.map((section) => {
            const meta = sectionPreviews[section];
            const kind = lockKindForSection(spec, section);
            return (
              <StructureSection
                key={section}
                title={section}
                preview={meta?.text}
                lockLabel={meta?.lockLabel ?? SECTION_LOCK_LABELS[kind]}
                firmEditable={meta?.firmEditable ?? kind === "firm_editable"}
              />
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {editable.map((field) => (
          <label key={field.id} className="block text-xs font-medium text-slate-700">
            <span className="text-violet-800">{field.label}</span>
            <span className="ml-1 font-normal text-slate-400">(merge field)</span>
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
                Assembled — {map.name}
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

"use client";

import {
  attorneyUploadApproved,
  uploadDocument,
} from "@/components/IntakeUploadShared";
import { useToast } from "@/components/Toast";
import { FIRM_TEMPLATE_MATTER_ID } from "@/lib/assessment-documents";
import type { DeliverableTemplateCatalogItem } from "@/lib/deliverable-template-sources";
import { documentFilePreviewUrl } from "@/lib/document-display";
import { fieldsForDeliverable } from "@/lib/practice-area-facts";
import { getTemplateFieldMapByDeliverable } from "@/lib/template-field-maps";
import {
  AOS_FACT_CREAC_MAP,
  CREAC_ROLE_LABELS,
  DEFAULT_AOS_CREAC_SECTIONS,
  parseTemplateStructure,
  roleBadgeClass,
  type CreacRole,
  type TemplateSection,
} from "@/lib/template-structure";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";
import { cn, formatDate } from "@/lib/utils";
import { FileText, Pencil, Replace, Eye, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type PreviewTab = "structure" | "file" | "ocr" | "tweaks";

function sourceLabel(item: DeliverableTemplateCatalogItem): string {
  if (item.meta?.source === "firm_uploaded" || item.document) {
    return `Firm upload v${item.meta?.version ?? 1}${
      item.meta?.filename || item.document?.title
        ? ` — ${item.meta?.filename ?? item.document?.title}`
        : ""
    }`;
  }
  return item.defaultSource.label;
}

export function DeliverableTemplateCatalog() {
  const { showToast } = useToast();
  const [items, setItems] = useState<DeliverableTemplateCatalogItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tweakDraft, setTweakDraft] = useState("");
  const [previewTextDraft, setPreviewTextDraft] = useState("");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("structure");

  const refresh = useCallback(async () => {
    const resp = await fetch("/api/deliverable-templates");
    const data = (await resp.json()) as { templates?: DeliverableTemplateCatalogItem[] };
    setItems(data.templates ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const previewItem = items.find((i) => i.deliverableId === previewId) ?? null;
  const editItem = items.find((i) => i.deliverableId === editId) ?? null;

  async function onReplace(deliverableId: string, file: File) {
    setBusyId(deliverableId);
    try {
      const data = await uploadDocument(
        FIRM_TEMPLATE_MATTER_ID,
        file,
        attorneyUploadApproved(),
        "single",
        { documentCategory: `deliverable_template:${deliverableId}` },
      );
      if (data.error && !data.airtable_document_id) {
        showToast(data.error, "error");
        return;
      }
      if (data.error) {
        showToast(`${data.error} File was saved — you can still edit notes.`, "error");
      }
      const resp = await fetch("/api/deliverable-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverableId,
          title: data.filename ?? file.name,
          airtableDocumentId: data.airtable_document_id,
          postgresDocumentId: data.document_id,
          textPreview: data.text_preview,
          fileType: file.type || file.name.split(".").pop(),
          source: "firm_uploaded",
          sections: data.sections,
          htmlPreview: data.html_preview,
        }),
      });
      if (!resp.ok) {
        const err = (await resp.json()) as { error?: string };
        showToast(err.error ?? "Template save failed", "error");
        return;
      }
      if (!data.text_preview?.trim()) {
        showToast(
          "Template file saved, but no text was extracted. Check Extracted text tab / re-upload DOCX or PDF.",
          "error",
        );
      } else {
        showToast(`Template replaced for ${deliverableId}. Structure detected automatically.`, "success");
      }
      setReplaceId(null);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function onSaveTweaks() {
    if (!editItem) return;
    setBusyId(editItem.deliverableId);
    try {
      const resp = await fetch("/api/deliverable-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverableId: editItem.deliverableId,
          tweakNotes: tweakDraft,
          textPreview: previewTextDraft || undefined,
        }),
      });
      if (!resp.ok) {
        const err = (await resp.json()) as { error?: string };
        showToast(err.error ?? "Save failed", "error");
        return;
      }
      showToast("Template notes saved.", "success");
      setEditId(null);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  const phase0 = items.filter((i) => i.phase0);
  const rest = items.filter((i) => !i.phase0);

  return (
    <section id="deliverable-templates" className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Deliverable templates</h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Each SKU shows what it is based on, a preview of the current structure/file, and controls to
          replace or tweak the firm template (PDF or DOCX).
        </p>
      </div>

      {!loaded ? (
        <p className="text-sm text-slate-500">Loading templates…</p>
      ) : (
        <>
          <TemplateGroup
            heading="Phase 0 launch SKUs"
            items={phase0}
            busyId={busyId}
            replaceId={replaceId}
            onPreview={(id) => {
              setPreviewId(id);
              setPreviewTab("structure");
            }}
            onEdit={(item) => {
              setEditId(item.deliverableId);
              setTweakDraft(item.meta?.tweakNotes ?? "");
              setPreviewTextDraft(item.meta?.textPreview ?? item.defaultSource.defaultPreviewText);
            }}
            onReplaceToggle={(id) => setReplaceId(replaceId === id ? null : id)}
            onReplaceFile={onReplace}
          />
          <TemplateGroup
            heading="Full catalog"
            items={rest}
            busyId={busyId}
            replaceId={replaceId}
            onPreview={(id) => {
              setPreviewId(id);
              setPreviewTab("structure");
            }}
            onEdit={(item) => {
              setEditId(item.deliverableId);
              setTweakDraft(item.meta?.tweakNotes ?? "");
              setPreviewTextDraft(item.meta?.textPreview ?? item.defaultSource.defaultPreviewText);
            }}
            onReplaceToggle={(id) => setReplaceId(replaceId === id ? null : id)}
            onReplaceFile={onReplace}
          />
        </>
      )}

      {previewItem ? (
        <PreviewModal
          item={previewItem}
          tab={previewTab}
          onTabChange={setPreviewTab}
          onClose={() => setPreviewId(null)}
        />
      ) : null}

      {editItem ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-template-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
            <h3 id="edit-template-title" className="text-sm font-semibold text-slate-900">
              Edit notes / tweaks — {editItem.name}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Notes are injected into drafting context when present. You can also paste an excerpt of the
              preferred template wording below.
            </p>
            <label className="mt-3 block text-xs font-medium text-slate-700">
              Attorney notes / tweaks
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={4}
                value={tweakDraft}
                onChange={(e) => setTweakDraft(e.target.value)}
              />
            </label>
            <label className="mt-3 block text-xs font-medium text-slate-700">
              Template text excerpt (optional)
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                rows={8}
                value={previewTextDraft}
                onChange={(e) => setPreviewTextDraft(e.target.value)}
              />
            </label>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={() => setEditId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={busyId === editItem.deliverableId}
                onClick={() => void onSaveTweaks()}
              >
                {busyId === editItem.deliverableId ? "Saving…" : "Save tweaks"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TemplateGroup({
  heading,
  items,
  busyId,
  replaceId,
  onPreview,
  onEdit,
  onReplaceToggle,
  onReplaceFile,
}: {
  heading: string;
  items: DeliverableTemplateCatalogItem[];
  busyId: string | null;
  replaceId: string | null;
  onPreview: (id: string) => void;
  onEdit: (item: DeliverableTemplateCatalogItem) => void;
  onReplaceToggle: (id: string) => void;
  onReplaceFile: (deliverableId: string, file: File) => Promise<void>;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{heading}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const hasFile = Boolean(item.document || item.meta?.airtableDocumentId);
          const hasInteractive = Boolean(getTemplateFieldMapByDeliverable(item.deliverableId));
          return (
            <article
              key={item.deliverableId}
              className={cn(
                "flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm",
                item.phase0 ? "border-emerald-200 ring-1 ring-emerald-600/10" : "border-slate-200",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-900">{item.name}</h4>
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                    item.phase0
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20"
                      : "bg-slate-50 text-slate-600 ring-slate-500/20",
                  )}
                >
                  {item.phase0 ? "Available now" : item.tier}
                </span>
              </div>
              <p className="text-sm text-slate-600">{item.description}</p>
              <p className="text-xs text-slate-700">
                <span className="font-medium">Source:</span> {sourceLabel(item)}
              </p>
              <p className="text-sm font-medium text-slate-800">{item.pricingLabel}</p>
              {hasFile ? (
                <p className="text-xs text-emerald-800">
                  File on file
                  {item.meta?.uploadedAt || item.document?.uploadedAt
                    ? ` · ${formatDate(item.meta?.uploadedAt ?? item.document?.uploadedAt ?? "")}`
                    : ""}
                  {item.meta?.version ? ` · v${item.meta.version}` : ""}
                </p>
              ) : (
                <p className="text-xs text-amber-900">
                  No file on file — upload PDF or DOCX to set template
                </p>
              )}
              {item.meta?.tweakNotes ? (
                <p className="line-clamp-2 text-xs text-violet-800">Tweaks: {item.meta.tweakNotes}</p>
              ) : null}

              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className={`${btnSecondary} inline-flex items-center gap-1 text-xs`}
                  onClick={() => onPreview(item.deliverableId)}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  View preview
                </button>
                <button
                  type="button"
                  className={`${btnSecondary} inline-flex items-center gap-1 text-xs`}
                  onClick={() => onReplaceToggle(item.deliverableId)}
                >
                  <Replace className="h-3.5 w-3.5" aria-hidden />
                  Replace template
                </button>
                <button
                  type="button"
                  className={`${btnSecondary} inline-flex items-center gap-1 text-xs`}
                  onClick={() => onEdit(item)}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Edit notes
                </button>
                {hasInteractive ? (
                  <Link href="/templates#smart-templates" className={`${btnSecondary} text-xs`}>
                    Smart fields
                  </Link>
                ) : null}
                <Link
                  href={`/assignments/new?deliverable=${item.deliverableId}`}
                  className={`${btnPrimary} text-xs`}
                >
                  Start assignment
                </Link>
              </div>

              {replaceId === item.deliverableId ? (
                <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs">
                  <span className="font-medium text-slate-700">Upload PDF or DOCX replacement</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="mt-2 w-full"
                    disabled={busyId === item.deliverableId}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onReplaceFile(item.deliverableId, file);
                    }}
                  />
                  {busyId === item.deliverableId ? (
                    <p className="mt-1 text-slate-600">Uploading & extracting text…</p>
                  ) : null}
                </label>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function PreviewModal({
  item,
  tab,
  onTabChange,
  onClose,
}: {
  item: DeliverableTemplateCatalogItem;
  tab: PreviewTab;
  onTabChange: (t: PreviewTab) => void;
  onClose: () => void;
}) {
  const docId = item.meta?.airtableDocumentId ?? item.document?.id;
  const title = item.meta?.filename ?? item.document?.title ?? item.name;
  const fileType = (item.meta?.fileType ?? item.document?.fileType ?? title).toLowerCase();
  const isPdf = fileType.includes("pdf") || title.toLowerCase().endsWith(".pdf");
  const isDocx =
    fileType.includes("word") ||
    fileType.includes("docx") ||
    title.toLowerCase().endsWith(".docx");
  const samplePath = item.defaultSource.sampleAssetPath;
  const ocrText = (item.meta?.textPreview || "").trim();
  const hasOcr = Boolean(ocrText);
  const ocrDisplay =
    ocrText ||
    item.defaultSource.defaultPreviewText ||
    "No extracted text yet. Upload a PDF or DOCX — if extraction fails, you will see a clear error.";

  const sections = useMemo((): TemplateSection[] => {
    const stored = item.meta?.sections;
    if (stored?.length) {
      return stored.map((s, i) => ({
        id: s.id || `sec-${i}`,
        label: s.label,
        role: (s.role as CreacRole) || "other",
        contentExcerpt: s.contentExcerpt || "",
        order: s.order ?? i,
      }));
    }
    if (ocrText) {
      return parseTemplateStructure(ocrText, { deliverableId: item.deliverableId });
    }
    if (item.deliverableId === "aos-discretionary-brief") {
      return DEFAULT_AOS_CREAC_SECTIONS;
    }
    return [];
  }, [item.deliverableId, item.meta?.sections, ocrText]);

  const fileUrl =
    docId && isPdf
      ? documentFilePreviewUrl(
          FIRM_TEMPLATE_MATTER_ID,
          docId,
          title,
          item.meta?.postgresDocumentId,
        )
      : samplePath && samplePath.endsWith(".html")
        ? samplePath
        : null;

  const htmlPreview = item.meta?.htmlPreview?.trim() || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-template-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 id="preview-template-title" className="text-sm font-semibold text-slate-900">
              {item.name}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              <FileText className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Source: {sourceLabel(item)}
            </p>
          </div>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Close
          </button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-2">
          {(
            [
              ["structure", "Structure"],
              ["file", isDocx && !isPdf ? "DOCX preview" : "PDF / sample"],
              ["ocr", "Extracted text"],
              ["tweaks", "Notes"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium",
                tab === id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700",
              )}
              onClick={() => onTabChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="overflow-auto p-4 text-sm text-slate-700">
          {tab === "structure" ? (
            <StructureTab
              item={item}
              sections={sections}
              hasFirmText={hasOcr || Boolean(item.meta?.source === "firm_uploaded")}
            />
          ) : null}
          {tab === "file" ? (
            fileUrl ? (
              <iframe
                src={fileUrl}
                title={`Preview: ${item.name}`}
                className="h-[min(480px,60vh)] w-full rounded-md border border-slate-200 bg-white"
              />
            ) : htmlPreview ? (
              <iframe
                srcDoc={htmlPreview}
                title={`DOCX preview: ${item.name}`}
                className="h-[min(480px,60vh)] w-full rounded-md border border-slate-200 bg-white"
                sandbox=""
              />
            ) : docId && isDocx ? (
              <div className="space-y-2 text-xs text-slate-600">
                <p>
                  Firm file <strong>{title}</strong> is DOCX. Structure is auto-detected — use the{" "}
                  <button
                    type="button"
                    className="font-medium text-slate-900 underline"
                    onClick={() => onTabChange("structure")}
                  >
                    Structure
                  </button>{" "}
                  tab (primary) or{" "}
                  <button
                    type="button"
                    className="font-medium text-slate-900 underline"
                    onClick={() => onTabChange("ocr")}
                  >
                    Extracted text
                  </button>
                  . PDF conversion is not required on Vercel; optional HTML preview appears here when
                  the Fly API returns rich DOCX HTML.
                </p>
              </div>
            ) : (
              <p className="text-xs text-amber-900">
                No PDF or HTML sample on file for this SKU yet. Upload a PDF/DOCX with Replace template,
                then open Structure for the outline preview.
              </p>
            )
          ) : null}
          {tab === "ocr" ? (
            hasOcr ? (
              <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
                {ocrDisplay}
              </pre>
            ) : (
              <div className="space-y-2">
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  No extracted text on file for this template. Re-upload a .docx (not legacy .doc) or a
                  PDF with a text layer. Structure preview will still show the default CREAC outline for
                  AOS briefs until extraction succeeds.
                </p>
                <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-500">
                  {ocrDisplay}
                </pre>
              </div>
            )
          ) : null}
          {tab === "tweaks" ? (
            item.meta?.tweakNotes ? (
              <p className="whitespace-pre-wrap text-sm">{item.meta.tweakNotes}</p>
            ) : (
              <p className="text-xs text-slate-500">No attorney notes yet. Use Edit notes on the card.</p>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StructureTab({
  item,
  sections,
  hasFirmText,
}: {
  item: DeliverableTemplateCatalogItem;
  sections: TemplateSection[];
  hasFirmText: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(sections[0]?.id ?? null);
  const isAos = item.deliverableId === "aos-discretionary-brief";
  const factFields = isAos
    ? fieldsForDeliverable("aos-discretionary-brief", "immigration")
    : [];

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{item.defaultSource.detail}</p>
      {item.defaultSource.skillDoc ? (
        <p className="text-xs">
          SKILL: <code className="rounded bg-slate-100 px-1">{item.defaultSource.skillDoc}</code>
        </p>
      ) : null}

      {isAos ? (
        <div className="rounded-md border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-950">
          <p className="font-medium">CREAC brief structure</p>
          <p className="mt-1 text-indigo-900/90">
            Conclusion → Rule → Explanation → Analysis → Conclusion. Rule/Explanation stay from the firm
            template; Analysis is filled from matter facts. Upload is auto-detected — no special
            formatting required beyond normal headings or CREAC labels.
          </p>
        </div>
      ) : null}

      {!hasFirmText && isAos ? (
        <p className="text-xs text-slate-600">
          Showing default CREAC outline until a firm DOCX/PDF is uploaded.
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Outline ({sections.length} section{sections.length === 1 ? "" : "s"})
        </p>
        {sections.length === 0 ? (
          <p className="text-xs text-slate-500">No sections detected yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {sections.map((sec) => {
              const open = openId === sec.id;
              return (
                <li key={sec.id} className="rounded-md border border-slate-200 bg-white">
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-3 py-2 text-left"
                    onClick={() => setOpenId(open ? null : sec.id)}
                    aria-expanded={open}
                  >
                    {open ? (
                      <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-slate-900">{sec.label}</span>
                      <span
                        className={cn(
                          "ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                          roleBadgeClass(sec.role),
                        )}
                      >
                        {CREAC_ROLE_LABELS[sec.role] ?? sec.role}
                      </span>
                    </span>
                  </button>
                  {open ? (
                    <div className="border-t border-slate-100 px-3 py-2">
                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-slate-700">
                        {sec.contentExcerpt || "(no excerpt)"}
                      </pre>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isAos ? (
        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-xs font-semibold text-slate-800">CREAC map — facts → Analysis</p>
          <p className="text-xs text-slate-600">
            Template <strong>Rule</strong> / <strong>Explanation</strong> text is preserved. These
            drafting facts feed <strong>Analysis</strong> (and conclusion guidance):
          </p>
          <ul className="space-y-1 text-xs text-slate-700">
            {factFields.map((f) => {
              const slot = AOS_FACT_CREAC_MAP[f.id] ?? "analysis";
              return (
                <li key={f.id} className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{f.label}</span>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                      roleBadgeClass(slot),
                    )}
                  >
                    → {CREAC_ROLE_LABELS[slot]}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

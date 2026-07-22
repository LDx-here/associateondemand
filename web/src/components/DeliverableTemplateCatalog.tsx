"use client";

import {
  attorneyUploadApproved,
  uploadDocument,
} from "@/components/IntakeUploadShared";
import { useToast } from "@/components/Toast";
import { FIRM_TEMPLATE_MATTER_ID } from "@/lib/assessment-documents";
import {
  CATALOG_PRACTICE_AREAS,
  catalogPracticeAreaLabel,
  practiceAreaForDeliverable,
  type CatalogPracticeArea,
} from "@/lib/deliverable-catalog";
import type { DeliverableTemplateCatalogItem } from "@/lib/deliverable-template-sources";
import { documentFilePreviewUrl } from "@/lib/document-display";
import { annotateStructureWithMergeHints } from "@/lib/merge-fields";
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
import {
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  LayoutGrid,
  List,
  Pencil,
  Replace,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

type PreviewTab = "structure" | "file" | "ocr" | "tweaks";
type ViewMode = "cards" | "list";
type AreaFilter = "all" | CatalogPracticeArea;
type AvailabilityFilter = "all" | "launch" | "coming";

function isFirmUpload(item: DeliverableTemplateCatalogItem): boolean {
  return item.meta?.source === "firm_uploaded" || Boolean(item.document);
}

function sourceLabel(item: DeliverableTemplateCatalogItem): string {
  if (isFirmUpload(item)) {
    return `Firm upload v${item.meta?.version ?? 1}${
      item.meta?.filename || item.document?.title
        ? ` — ${item.meta?.filename ?? item.document?.title}`
        : ""
    }`;
  }
  return item.defaultSource.label;
}

function sourceBadge(item: DeliverableTemplateCatalogItem): { label: string; className: string } {
  if (isFirmUpload(item)) {
    return {
      label: "Firm upload",
      className: "bg-violet-50 text-violet-800 ring-violet-600/20",
    };
  }
  return {
    label: "Built-in",
    className: "bg-slate-50 text-slate-700 ring-slate-500/20",
  };
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
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");

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

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const area = practiceAreaForDeliverable(item.deliverableId);
      if (areaFilter !== "all" && area !== areaFilter) return false;
      if (availability === "launch" && !item.phase0) return false;
      if (availability === "coming" && item.phase0) return false;
      return true;
    });
  }, [items, areaFilter, availability]);

  const grouped = useMemo(() => {
    const areas =
      areaFilter === "all" ? CATALOG_PRACTICE_AREAS : ([areaFilter] as CatalogPracticeArea[]);
    return areas
      .map((area) => {
        const inArea = filtered.filter((i) => practiceAreaForDeliverable(i.deliverableId) === area);
        const launch = inArea.filter((i) => i.phase0);
        const coming = inArea.filter((i) => !i.phase0);
        return { area, launch, coming };
      })
      .filter((g) => g.launch.length + g.coming.length > 0);
  }, [filtered, areaFilter]);

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

  function openPreview(id: string) {
    setPreviewId(id);
    setPreviewTab("structure");
  }

  const cardActions = {
    busyId,
    replaceId,
    viewMode,
    onPreview: openPreview,
    onEdit: (item: DeliverableTemplateCatalogItem) => {
      setEditId(item.deliverableId);
      setTweakDraft(item.meta?.tweakNotes ?? "");
      setPreviewTextDraft(item.meta?.textPreview ?? item.defaultSource.defaultPreviewText);
    },
    onReplaceToggle: (id: string) => setReplaceId(replaceId === id ? null : id),
    onReplaceFile: onReplace,
  };

  return (
    <section id="deliverable-templates" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Browse templates</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Filter by practice area, then open preview to see structure mapping first.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-md border border-slate-200 bg-white p-0.5"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium",
                viewMode === "cards" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50",
              )}
              onClick={() => setViewMode("cards")}
              aria-pressed={viewMode === "cards"}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              Cards
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium",
                viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50",
              )}
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
            >
              <List className="h-3.5 w-3.5" aria-hidden />
              List
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={areaFilter === "all"} onClick={() => setAreaFilter("all")}>
          All areas
        </FilterChip>
        {CATALOG_PRACTICE_AREAS.map((area) => (
          <FilterChip
            key={area}
            active={areaFilter === area}
            onClick={() => setAreaFilter(area)}
          >
            {catalogPracticeAreaLabel(area)}
          </FilterChip>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:inline" aria-hidden />
        <FilterChip active={availability === "all"} onClick={() => setAvailability("all")}>
          All status
        </FilterChip>
        <FilterChip active={availability === "launch"} onClick={() => setAvailability("launch")}>
          Available now
        </FilterChip>
        <FilterChip active={availability === "coming"} onClick={() => setAvailability("coming")}>
          Coming soon
        </FilterChip>
      </div>

      {!loaded ? (
        <p className="text-sm text-slate-500">Loading templates…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
          No templates match these filters.
        </p>
      ) : (
        grouped.map(({ area, launch, coming }) => (
          <div key={area} className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {catalogPracticeAreaLabel(area)}
            </h3>
            {launch.length ? (
              <TemplateGroup
                heading="Available now"
                items={launch}
                {...cardActions}
              />
            ) : null}
            {coming.length ? (
              <TemplateGroup
                heading="Coming soon / full catalog"
                items={coming}
                {...cardActions}
              />
            ) : null}
          </div>
        ))
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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        active
          ? "bg-slate-900 text-white ring-slate-900"
          : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function TemplateGroup({
  heading,
  items,
  busyId,
  replaceId,
  viewMode,
  onPreview,
  onEdit,
  onReplaceToggle,
  onReplaceFile,
}: {
  heading: string;
  items: DeliverableTemplateCatalogItem[];
  busyId: string | null;
  replaceId: string | null;
  viewMode: ViewMode;
  onPreview: (id: string) => void;
  onEdit: (item: DeliverableTemplateCatalogItem) => void;
  onReplaceToggle: (id: string) => void;
  onReplaceFile: (deliverableId: string, file: File) => Promise<void>;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{heading}</h4>
      {viewMode === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <TemplateCard
              key={item.deliverableId}
              item={item}
              busyId={busyId}
              replaceId={replaceId}
              layout="card"
              onPreview={onPreview}
              onEdit={onEdit}
              onReplaceToggle={onReplaceToggle}
              onReplaceFile={onReplaceFile}
            />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {items.map((item) => (
            <li key={item.deliverableId}>
              <TemplateCard
                item={item}
                busyId={busyId}
                replaceId={replaceId}
                layout="list"
                onPreview={onPreview}
                onEdit={onEdit}
                onReplaceToggle={onReplaceToggle}
                onReplaceFile={onReplaceFile}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TemplateCard({
  item,
  busyId,
  replaceId,
  layout,
  onPreview,
  onEdit,
  onReplaceToggle,
  onReplaceFile,
}: {
  item: DeliverableTemplateCatalogItem;
  busyId: string | null;
  replaceId: string | null;
  layout: "card" | "list";
  onPreview: (id: string) => void;
  onEdit: (item: DeliverableTemplateCatalogItem) => void;
  onReplaceToggle: (id: string) => void;
  onReplaceFile: (deliverableId: string, file: File) => Promise<void>;
}) {
  const area = practiceAreaForDeliverable(item.deliverableId);
  const badge = sourceBadge(item);
  const hasInteractive = Boolean(getTemplateFieldMapByDeliverable(item.deliverableId));
  const isList = layout === "list";

  return (
    <article
      className={cn(
        isList
          ? "flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          : cn(
              "flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm",
              item.phase0 ? "border-emerald-200 ring-1 ring-emerald-600/10" : "border-slate-200",
            ),
      )}
    >
      <div className={cn("min-w-0", isList && "flex-1")}>
        <div className="flex flex-wrap items-start gap-2">
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
          <span
            className={cn(
              "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          {catalogPracticeAreaLabel(area)}
          {item.pricingLabel ? ` · ${item.pricingLabel}` : ""}
        </p>
        {!isList ? <p className="mt-2 text-sm text-slate-600 line-clamp-2">{item.description}</p> : null}
      </div>

      <div className={cn("flex flex-wrap gap-2", isList ? "shrink-0" : "mt-auto pt-1")}>
        <button
          type="button"
          className={`${btnPrimary} inline-flex items-center gap-1 text-xs`}
          onClick={() => onPreview(item.deliverableId)}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden />
          Open preview
        </button>
        <button
          type="button"
          className={`${btnSecondary} inline-flex items-center gap-1 text-xs`}
          onClick={() => onReplaceToggle(item.deliverableId)}
        >
          <Replace className="h-3.5 w-3.5" aria-hidden />
          Replace
        </button>
        <button
          type="button"
          className={`${btnSecondary} inline-flex items-center gap-1 text-xs`}
          onClick={() => onEdit(item)}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Notes
        </button>
        {hasInteractive ? (
          <Link href="/templates#smart-templates" className={`${btnSecondary} text-xs`}>
            Smart fields
          </Link>
        ) : null}
        <Link
          href={`/assignments/new?deliverable=${item.deliverableId}`}
          className={`${btnSecondary} text-xs`}
        >
          Start assignment
        </Link>
      </div>

      {replaceId === item.deliverableId ? (
        <label
          className={cn(
            "block rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs",
            isList && "sm:col-span-2 w-full",
          )}
        >
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
  const hasFirmFile = Boolean(docId || item.meta?.source === "firm_uploaded" || item.document);
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
      : !hasFirmFile && samplePath && samplePath.endsWith(".html")
        ? samplePath
        : null;

  const htmlPreview = item.meta?.htmlPreview?.trim() || "";
  const area = practiceAreaForDeliverable(item.deliverableId);
  const badge = sourceBadge(item);

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
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              {catalogPracticeAreaLabel(area)}
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                  badge.className,
                )}
              >
                {badge.label}
              </span>
              <span className="text-slate-400">·</span>
              {sourceLabel(item)}
            </p>
          </div>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Close
          </button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-2">
          {(
            [
              ["structure", "Structure mapping"],
              ["file", isDocx && !isPdf ? "DOCX / file" : "PDF / sample"],
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
                  Firm file <strong>{title}</strong> is DOCX. Structure mapping is primary — switch to that
                  tab, or view Extracted text. Optional HTML preview appears when the API returns rich DOCX
                  HTML.
                </p>
              </div>
            ) : (
              <p className="text-xs text-amber-900">
                {hasFirmFile
                  ? "Firm file is on file — use Structure mapping or Extracted text."
                  : "No PDF/HTML sample on file yet. Upload with Replace, then open Structure mapping."}
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
                  No extracted text on file. Re-upload a .docx or text-layer PDF. Structure mapping still
                  shows the default outline when available.
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
              <p className="text-xs text-slate-500">No attorney notes yet. Use Notes on the card.</p>
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
  const area = practiceAreaForDeliverable(item.deliverableId);
  const isAos = item.deliverableId === "aos-discretionary-brief";
  const factFields = fieldsForDeliverable(
    item.deliverableId,
    area === "personal_injury" ? "personal_injury" : area === "other" ? "generic" : "immigration",
  );

  const factsForRole = (role: CreacRole) => {
    if (isAos) {
      return factFields.filter((f) => (AOS_FACT_CREAC_MAP[f.id] ?? "analysis") === role);
    }
    if (role === "analysis") {
      return factFields.filter((f) =>
        /analysis|argument|fact|hardship|equity|damage|liability/i.test(
          `${f.id} ${f.label} ${f.feedsSection ?? ""}`,
        ),
      );
    }
    return factFields.filter((f) =>
      (f.feedsSection ?? "").toLowerCase().includes(CREAC_ROLE_LABELS[role].toLowerCase().slice(0, 8)),
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Structure mapping</h4>
        <p className="mt-1 text-xs text-slate-600">
          Sections with CREAC roles. Analysis slots show which matter facts feed them; Rule / Explanation
          stay from the template.
        </p>
      </div>

      {!hasFirmText ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <strong>Default system outline</strong> — upload a firm DOCX with Replace to pin your structure.
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sections ({sections.length})
        </p>
        {sections.length === 0 ? (
          <p className="text-xs text-slate-500">No sections detected yet.</p>
        ) : (
          <ul className="space-y-2">
            {sections.map((sec) => {
              const open = openId === sec.id;
              const feeds = factsForRole(sec.role);
              const mergeHints = annotateStructureWithMergeHints(sec.label, sec.role);
              return (
                <li key={sec.id} className="rounded-md border border-slate-200 bg-white">
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
                    onClick={() => setOpenId(open ? null : sec.id)}
                    aria-expanded={open}
                  >
                    {open ? (
                      <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                    )}
                    <span className="min-w-0 flex-1 space-y-1.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{sec.label}</span>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                            roleBadgeClass(sec.role),
                          )}
                        >
                          {CREAC_ROLE_LABELS[sec.role] ?? sec.role}
                        </span>
                      </span>
                      {feeds.length > 0 || mergeHints.length > 0 ? (
                        <span className="block text-xs text-slate-600">
                          <span className="font-medium text-slate-700">Feeds from: </span>
                          {feeds.length
                            ? feeds.map((f) => f.label).join(", ")
                            : mergeHints.join(", ")}
                        </span>
                      ) : sec.role === "rule" || sec.role === "explanation" ? (
                        <span className="block text-xs text-indigo-800">
                          Preserved from template (not overwritten by matter facts)
                        </span>
                      ) : null}
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

      {isAos && factFields.length > 0 ? (
        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-xs font-semibold text-slate-800">Fact → CREAC summary</p>
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

      <p className="text-[11px] text-slate-400">
        Architecture / TXDocs-style assembly explained in{" "}
        <Link href="/help#templates" className="underline underline-offset-2">
          How this works
        </Link>
        .
      </p>
    </div>
  );
}

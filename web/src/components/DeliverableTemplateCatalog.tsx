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
  CLASSIFICATION_LABELS,
  CREAC_ROLE_LABELS,
  DEFAULT_AOS_CREAC_SECTIONS,
  classificationBadgeClass,
  classificationNodeClass,
  inferSectionDepth,
  parseTemplateStructure,
  roleBadgeClass,
  type CreacRole,
  type TemplateSection,
} from "@/lib/template-structure";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";
import { cn, formatDate } from "@/lib/utils";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  LayoutGrid,
  List,
  Lock,
  Pencil,
  Replace,
  Scale,
  Stamp,
  Variable,
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: load catalog on mount
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
          briefTemplate: data.brief_template,
          briefType: data.brief_type,
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
  const isAos = item.deliverableId === "aos-discretionary-brief";

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
          {isAos ? "Draft with variants" : "Start assignment"}
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
        classification: s.classification,
        depth: inferSectionDepth({ id: s.id || `sec-${i}`, label: s.label }),
        slots: s.slots,
      }));
    }
    if (ocrText) {
      return parseTemplateStructure(ocrText, { deliverableId: item.deliverableId }).map((s) => ({
        ...s,
        depth: inferSectionDepth(s),
      }));
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
  const textCharCount = item.meta?.textCharCount ?? ocrText.length;
  const textTruncatedAtStore = Boolean(item.meta?.textPreviewTruncated);

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
        <div className="min-h-0 flex-1 overflow-auto p-4 text-sm text-slate-700">
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
            <ExtractedTextPanel
              text={hasOcr ? ocrText : ocrDisplay}
              hasOcr={hasOcr}
              charCount={hasOcr ? textCharCount || ocrText.length : 0}
              truncatedAtStore={textTruncatedAtStore}
            />
          ) : null}
          {tab === "tweaks" ? (
            item.meta?.tweakNotes ? (
              <p className="whitespace-pre-wrap text-sm">{item.meta.tweakNotes}</p>
            ) : (
              <p className="text-xs text-slate-500">No attorney notes yet. Use Notes on the card.</p>
            )
          ) : null}
        </div>
        {item.deliverableId === "aos-discretionary-brief" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-600">
              Pick attorney-reviewed argument variants (Section A / adverse / balancing) inside the standard
              drafting flow — same PRESERVE/FILL path shown above.
            </p>
            <Link
              href="/assignments/new?deliverable=aos-discretionary-brief"
              className={`${btnPrimary} shrink-0 text-xs`}
            >
              Draft with variants
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ExtractedTextPanel({
  text,
  hasOcr,
  charCount,
  truncatedAtStore,
}: {
  text: string;
  hasOcr: boolean;
  charCount: number;
  truncatedAtStore: boolean;
}) {
  const displayCount = charCount || text.length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Full document</h4>
          <p className="text-xs text-slate-500">
            {hasOcr
              ? `${displayCount.toLocaleString()} characters extracted`
              : "No extracted text on file yet"}
          </p>
        </div>
        {truncatedAtStore ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-950">
            Prior save was capped — re-upload DOCX to store the full text
          </p>
        ) : null}
      </div>
      {!hasOcr ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          No extracted text on file. Re-upload a .docx or text-layer PDF. Structure mapping still shows
          the default outline when available.
        </p>
      ) : null}
      <pre className="min-h-[320px] max-h-[min(70vh,640px)] overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800">
        {text}
      </pre>
    </div>
  );
}

function structureSectionIcon(classification?: string, role?: CreacRole) {
  if (classification === "PRESERVE" || role === "rule") {
    return Lock;
  }
  if (classification === "CAPTION" || role === "caption") {
    return FileText;
  }
  if (classification === "BOILERPLATE") {
    return Stamp;
  }
  if (classification === "FILL") {
    return Variable;
  }
  if (role === "explanation") {
    return BookOpen;
  }
  return Scale;
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
  const [openId, setOpenId] = useState<string | null>(null);
  const area = practiceAreaForDeliverable(item.deliverableId);
  const isAos = item.deliverableId === "aos-discretionary-brief";
  const factFields = fieldsForDeliverable(
    item.deliverableId,
    area === "personal_injury" ? "personal_injury" : area === "other" ? "generic" : "immigration",
  );
  const briefType = (item.meta?.briefType as string | undefined) || (isAos ? "AOS_DISCRETIONARY" : undefined);
  const hasClassification = sections.some((s) => s.classification);
  const usingDefaultOutline = !hasFirmText && isAos;

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

  const factsForSlots = (sec: TemplateSection) => {
    const keys = new Set(
      (sec.slots || [])
        .map((s) => s.replacement_key || "")
        .filter(Boolean)
        .map((k) => k.replace(/_/g, "").toLowerCase()),
    );
    if (keys.size === 0) return factsForRole(sec.role);
    return factFields.filter(
      (f) => keys.has(f.id.toLowerCase()) || keys.has(f.id.replace(/_/g, "").toLowerCase()),
    );
  };

  const numberedSections = sections.map((sec, i) => ({
    sec,
    step: i + 1,
    depth: inferSectionDepth(sec),
  }));

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Brief structure map</h4>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {isAos
            ? "Outline of this AOS discretionary brief — PRESERVE sections copy law verbatim; FILL sections pull matter facts."
            : "Vertical map of template sections with CREAC roles and fact feeds."}
        </p>
        {briefType ? (
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Brief type: {briefType}
          </p>
        ) : null}
      </div>

      {usingDefaultOutline ? (
        <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
          <strong>Default system outline</strong> from the AOS System Guide. Re-upload DOCX to refine from
          firm file.
        </p>
      ) : !hasFirmText ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <strong>Default system outline</strong> — Re-upload DOCX to refine from firm file
          {isAos ? " and run the PRESERVE/FILL parser" : ""}.
        </p>
      ) : null}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-wide">
        {(
          [
            ["CAPTION", "Caption"],
            ["PRESERVE", "Preserve (law)"],
            ["FILL", "Fill (facts)"],
            ["BOILERPLATE", "Boilerplate"],
          ] as const
        ).map(([key, label]) => (
          <span
            key={key}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ring-inset",
              classificationBadgeClass(key),
            )}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", classificationNodeClass(key).rail)}
              aria-hidden
            />
            {label}
          </span>
        ))}
      </div>

      {numberedSections.length === 0 ? (
        <p className="text-xs text-slate-500">No sections detected yet.</p>
      ) : (
        <div className="relative pl-2">
          {/* Vertical connector */}
          <div
            className="absolute bottom-3 left-[1.15rem] top-3 w-px bg-gradient-to-b from-slate-300 via-slate-200 to-slate-100"
            aria-hidden
          />
          <ol className="relative space-y-0">
            {numberedSections.map(({ sec, step, depth }, idx) => {
              const open = openId === sec.id;
              const classification = sec.classification;
              const node = classificationNodeClass(classification);
              const Icon = structureSectionIcon(classification, sec.role);
              const feeds =
                classification === "FILL" || !classification ? factsForSlots(sec) : [];
              const mergeHints = annotateStructureWithMergeHints(sec.label, sec.role);
              const slotKeys = (sec.slots || [])
                .map((s) => s.replacement_key || s.label)
                .filter(Boolean) as string[];
              const feedLabels = slotKeys.length
                ? slotKeys
                : feeds.length
                  ? feeds.map((f) => f.label)
                  : mergeHints;
              const excerpt = (sec.contentExcerpt || "").trim();
              const excerptPreview =
                excerpt.length > 220 ? `${excerpt.slice(0, 220).trim()}…` : excerpt;
              const isLast = idx === numberedSections.length - 1;

              return (
                <li
                  key={sec.id}
                  className={cn("relative flex gap-3", depth > 0 ? "ml-6 pl-1" : "")}
                >
                  <div className="relative z-[1] flex w-7 shrink-0 flex-col items-center">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm ring-2 ring-white",
                        node.rail,
                      )}
                      title={`Step ${step}`}
                    >
                      {depth > 0 ? (
                        <span className="text-[9px]">{sec.label.match(/^([A-E])\./)?.[1] ?? "·"}</span>
                      ) : (
                        step
                      )}
                    </span>
                    {!isLast ? <span className="mt-0 w-px flex-1 bg-transparent" aria-hidden /> : null}
                  </div>

                  <div
                    className={cn(
                      "mb-3 min-w-0 flex-1 overflow-hidden rounded-lg border shadow-sm",
                      node.card,
                      depth > 0 && "border-dashed",
                    )}
                  >
                    <button
                      type="button"
                      className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
                      onClick={() => setOpenId(open ? null : sec.id)}
                      aria-expanded={open}
                    >
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", node.icon)} aria-hidden />
                      <span className="min-w-0 flex-1 space-y-1.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{sec.label || "(untitled)"}</span>
                          {classification ? (
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                                classificationBadgeClass(classification),
                              )}
                            >
                              {CLASSIFICATION_LABELS[classification] ?? classification}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                              roleBadgeClass(sec.role),
                            )}
                          >
                            {CREAC_ROLE_LABELS[sec.role] ?? sec.role}
                          </span>
                        </span>

                        {classification === "PRESERVE" ? (
                          <span className="block text-xs text-slate-600">
                            Stable law — copied verbatim; does not change with matter facts
                          </span>
                        ) : classification === "CAPTION" ? (
                          <span className="block text-xs text-sky-800">
                            Case identifying info — replace each filing
                          </span>
                        ) : classification === "BOILERPLATE" ? (
                          <span className="block text-xs text-stone-600">
                            Procedural language — firm name / date only
                          </span>
                        ) : null}

                        {feedLabels.length > 0 &&
                        (classification === "FILL" || !classification) ? (
                          <span className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Feeds from
                            </span>
                            {feedLabels.slice(0, 8).map((label) => (
                              <span
                                key={label}
                                className="inline-flex rounded-md bg-teal-50/90 px-1.5 py-0.5 text-[10px] font-medium text-teal-900 ring-1 ring-inset ring-teal-600/20"
                              >
                                {label}
                              </span>
                            ))}
                            {feedLabels.length > 8 ? (
                              <span className="text-[10px] text-slate-500">
                                +{feedLabels.length - 8} more
                              </span>
                            ) : null}
                          </span>
                        ) : null}

                        {!open && excerptPreview ? (
                          <span className="block text-xs leading-relaxed text-slate-600 line-clamp-3">
                            {excerptPreview}
                          </span>
                        ) : null}
                      </span>
                      {open ? (
                        <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      )}
                    </button>
                    {open ? (
                      <div className="border-t border-slate-200/70 bg-white/60 px-3 py-2.5">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Excerpt
                        </p>
                        <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-700">
                          {excerpt || "(no excerpt)"}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {isAos && hasClassification ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
          <p className="font-medium">How this brief type works</p>
          <p className="mt-0.5 text-slate-600">
            Re-upload your firm DOCX via Replace — the parser classifies every section. On draft, PRESERVE
            law is injected verbatim; FILL sections use AOS architecture facts from the matter checklist.
          </p>
        </div>
      ) : null}

      {isAos && factFields.length > 0 && !hasClassification ? (
        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-xs font-semibold text-slate-800">Fact → section summary</p>
          <ul className="space-y-1 text-xs text-slate-700">
            {factFields.slice(0, 12).map((f) => {
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
        Architecture explained in{" "}
        <Link href="/help#templates" className="underline underline-offset-2">
          How this works
        </Link>
        .
      </p>
    </div>
  );
}

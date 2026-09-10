"use client";

import {
  BookOpen,
  ChevronRight,
  FileText,
  LayoutGrid,
  ListTree,
  Scale,
  AlertTriangle,
  CheckSquare,
  Link2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { KnowledgeCategory, KnowledgeMapData, KnowledgeTopic } from "@/lib/knowledge-map/types";
import { tabActive, tabInactive } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type ViewMode = "outline" | "cards";

function sectionIcon(heading: string) {
  const h = heading.toLowerCase();
  if (h.includes("pitfall")) return AlertTriangle;
  if (h.includes("facts") || h.includes("prove")) return CheckSquare;
  if (h.includes("require") || h.includes("element")) return Scale;
  if (h.includes("related")) return Link2;
  return FileText;
}

function TopicDetail({ topic }: { topic: KnowledgeTopic }) {
  return (
    <article className="space-y-5">
      <header className="space-y-2 border-b border-slate-200 pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Element outline</p>
        <h2 className="text-xl font-semibold text-slate-900">{topic.title}</h2>
        {topic.notes ? <p className="text-sm text-slate-600">{topic.notes}</p> : null}
        <div className="flex flex-wrap gap-2 text-xs">
          {topic.cite ? (
            <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-950 ring-1 ring-amber-200">
              {topic.cite}
            </span>
          ) : null}
          {topic.practiceAreas ? (
            <span className="rounded-md bg-sky-50 px-2 py-1 text-sky-950 ring-1 ring-sky-200">
              {topic.practiceAreas}
            </span>
          ) : null}
          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-600">
            {topic.file}
          </span>
        </div>
      </header>

      <ol className="relative space-y-4 border-l-2 border-violet-200 pl-5">
        {topic.sections.map((section, idx) => {
          const Icon = sectionIcon(section.heading);
          return (
            <li key={section.heading} className="relative">
              <span
                className="absolute -left-[1.65rem] flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-800 ring-2 ring-white"
                aria-hidden
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-slate-900">
                <span className="mr-2 text-xs font-medium text-violet-600">{idx + 1}.</span>
                {section.heading}
              </h3>
              {section.bullets.length ? (
                <ul className="mt-2 space-y-1.5">
                  {section.bullets.map((b) => (
                    <li
                      key={b}
                      className="rounded-md bg-slate-50 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-100"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No bullets in this section.</p>
              )}
            </li>
          );
        })}
      </ol>

      {topic.related.length ? (
        <footer className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Related</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {topic.related.map((r) => (
              <li key={r} className="rounded-md bg-white px-2 py-1 font-mono text-xs ring-1 ring-slate-200">
                {r}
              </li>
            ))}
          </ul>
        </footer>
      ) : null}
    </article>
  );
}

function CategoryTree({
  category,
  selectedId,
  onSelect,
}: {
  category: KnowledgeCategory;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {category.title}
        <span className="ml-1 font-normal text-slate-400">({category.topics.length})</span>
      </p>
      <ul className="space-y-0.5">
        {category.topics.map((t) => {
          const active = t.id === selectedId;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
                  active
                    ? "bg-violet-100 font-medium text-violet-950"
                    : "text-slate-700 hover:bg-slate-100",
                )}
                aria-current={active ? "true" : undefined}
              >
                <ChevronRight
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    active ? "text-violet-700" : "text-slate-400",
                  )}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block leading-snug">{t.topic}</span>
                  {t.notes ? (
                    <span className="mt-0.5 block text-[11px] font-normal text-slate-500">{t.notes}</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CardGrid({
  categories,
  selectedId,
  onSelect,
}: {
  categories: KnowledgeCategory[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <section key={cat.id}>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">{cat.title}</h3>
          <p className="mb-3 text-xs text-slate-500">{cat.description}</p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {cat.topics.map((t) => {
              const active = t.id === selectedId;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(t.id)}
                    className={cn(
                      "h-full w-full rounded-lg border p-3 text-left transition",
                      active
                        ? "border-violet-400 bg-violet-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40",
                    )}
                  >
                    <p className="text-sm font-semibold text-slate-900">{t.topic}</p>
                    {t.notes ? <p className="mt-1 text-xs text-slate-500">{t.notes}</p> : null}
                    <p className="mt-2 text-[11px] text-violet-700">
                      {t.sections.length} sections · outline →
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function readTopicFilterFromUrl(): { filterIds: string[] | null; selectedId: string | null } {
  if (typeof window === "undefined") return { filterIds: null, selectedId: null };
  const params = new URLSearchParams(window.location.search);
  const topicsParam = params.get("topics")?.trim();
  const filterIds = topicsParam
    ? topicsParam
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : null;
  const hash = window.location.hash.replace(/^#/, "");
  const topicMatch = hash.match(/(?:^|&)topic=([^&]+)/);
  const selectedId = topicMatch ? decodeURIComponent(topicMatch[1]) : filterIds?.[0] ?? null;
  return { filterIds, selectedId };
}

export function FirmKnowledgeMap({ data }: { data: KnowledgeMapData }) {
  const firstId = data.categories[0]?.topics[0]?.id ?? null;
  const initial = typeof window !== "undefined" ? readTopicFilterFromUrl() : { filterIds: null, selectedId: null };
  const [filterIds, setFilterIds] = useState<string[] | null>(initial.filterIds);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId ?? firstId);
  const [view, setView] = useState<ViewMode>("outline");

  useEffect(() => {
    const { filterIds: nextFilter, selectedId: nextSelected } = readTopicFilterFromUrl();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: correct SSR-unavailable URL read after hydration
    if (nextFilter?.length) setFilterIds(nextFilter);
    if (nextSelected) setSelectedId(nextSelected);
  }, []);

  const topicById = useMemo(() => {
    const map = new Map<string, KnowledgeTopic>();
    for (const cat of data.categories) {
      for (const t of cat.topics) map.set(t.id, t);
    }
    return map;
  }, [data]);

  const filteredCategories = useMemo(() => {
    if (!filterIds?.length) return data.categories;
    const allow = new Set(filterIds);
    return data.categories
      .map((cat) => ({
        ...cat,
        topics: cat.topics.filter((t) => allow.has(t.id)),
      }))
      .filter((cat) => cat.topics.length > 0);
  }, [data, filterIds]);

  const selected = selectedId ? topicById.get(selectedId) ?? null : null;
  const filterActive = Boolean(filterIds?.length);

  function clearFilter() {
    setFilterIds(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("topics");
      url.hash = "firm-knowledge";
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }

  function selectTopic(id: string) {
    setSelectedId(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.hash = `firm-knowledge&topic=${encodeURIComponent(id)}`;
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-violet-800">
            <BookOpen className="h-5 w-5" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wide">{data.label}</p>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Topic tree and element outlines (cites, facts that prove it, pitfalls) from the firm
            brain. Attorney browsing reference — agents inject the same Markdown into prompts.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Synced from {data.source} · {new Date(data.generatedAt).toLocaleString()}
          </p>
          {filterActive ? (
            <p className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-md bg-violet-50 px-2 py-1 text-xs text-violet-950 ring-1 ring-violet-200">
              Showing {filterIds!.length} topics for this matter type
              <button type="button" className="font-medium underline-offset-2 hover:underline" onClick={clearFilter}>
                Show all
              </button>
            </p>
          ) : null}
        </div>
        <div className="flex rounded-md ring-1 ring-slate-200" role="group" aria-label="View mode">
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-l-md px-3 py-1.5 text-xs font-medium",
              view === "outline" ? tabActive : tabInactive,
            )}
            onClick={() => setView("outline")}
          >
            <ListTree className="h-3.5 w-3.5" aria-hidden />
            Outline
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-r-md px-3 py-1.5 text-xs font-medium",
              view === "cards" ? tabActive : tabInactive,
            )}
            onClick={() => setView("cards")}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            Cards
          </button>
        </div>
      </div>

      {view === "cards" ? (
        <div className="space-y-6">
          <CardGrid
            categories={filteredCategories}
            selectedId={selectedId}
            onSelect={selectTopic}
          />
          {selected ? (
            <div className="rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
              <TopicDetail topic={selected} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
          <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
            {filteredCategories.map((cat) => (
              <CategoryTree
                key={cat.id}
                category={cat}
                selectedId={selectedId}
                onSelect={selectTopic}
              />
            ))}
          </aside>
          <div className="rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
            {selected ? (
              <TopicDetail topic={selected} />
            ) : (
              <p className="text-sm text-slate-500">Select a topic from the tree.</p>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        After editing brain Markdown, regenerate with{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
          npm run sync:knowledge-map
        </code>{" "}
        in <code className="font-mono text-[11px]">web/</code>.
      </p>
    </div>
  );
}

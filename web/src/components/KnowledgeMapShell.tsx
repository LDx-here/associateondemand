"use client";

import { BookOpen, Network } from "lucide-react";
import { useEffect, useState } from "react";

import { FirmKnowledgeMap } from "@/components/FirmKnowledgeMap";
import { KnowledgeMapGraph } from "@/components/KnowledgeMapGraph";
import type { KnowledgeMapData } from "@/lib/knowledge-map/types";
import { cn } from "@/lib/utils";
import { tabActive, tabInactive } from "@/lib/ui-classes";

type Tab = "firm" | "patterns";

export function KnowledgeMapShell({ firmKnowledge }: { firmKnowledge: KnowledgeMapData }) {
  const [tab, setTab] = useState<Tab>("firm");

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (hash.startsWith("patterns") || hash === "pattern-graph") setTab("patterns");
    if (hash.startsWith("firm-knowledge") || hash === "firm" || hash.startsWith("firm&")) setTab("firm");
  }, []);

  function selectTab(next: Tab) {
    setTab(next);
    if (typeof window === "undefined") return;
    if (next === "patterns") {
      window.history.replaceState(null, "", "#patterns");
      return;
    }
    // Preserve topic highlight when switching back to firm knowledge.
    const current = window.location.hash.replace(/^#/, "");
    const topicMatch = current.match(/(?:^|&)topic=([^&]+)/);
    const hash = topicMatch
      ? `firm-knowledge&topic=${topicMatch[1]}`
      : "firm-knowledge";
    window.history.replaceState(null, "", `#${hash}`);
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Knowledge map</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Obsidian-style firm brain: browse immigration and firm-ops outlines, or explore the matter
          pattern graph. Agents use the same firm knowledge content in drafting prompts.
        </p>
      </header>

      <div className="flex flex-wrap gap-1 rounded-md p-0.5 ring-1 ring-slate-200" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "firm"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
            tab === "firm" ? tabActive : tabInactive,
          )}
          onClick={() => selectTab("firm")}
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Firm knowledge
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "patterns"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
            tab === "patterns" ? tabActive : tabInactive,
          )}
          onClick={() => selectTab("patterns")}
        >
          <Network className="h-3.5 w-3.5" aria-hidden />
          Pattern graph
        </button>
      </div>

      {tab === "firm" ? (
        <section id="firm-knowledge" aria-label="Firm knowledge outlines">
          <FirmKnowledgeMap data={firmKnowledge} />
        </section>
      ) : (
        <section id="patterns" aria-label="Pattern knowledge graph" className="space-y-2">
          <p className="text-sm text-slate-600">
            Force-directed graph of matters linked to relief types and jurisdictions (Qdrant-backed when
            available). Scroll to zoom, drag the background to pan, or use Fit to view so every node is
            visible. Click a node for details.
          </p>
          <KnowledgeMapGraph />
        </section>
      )}
    </div>
  );
}

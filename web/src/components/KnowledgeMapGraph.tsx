"use client";

import * as d3 from "d3";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { btnSecondary } from "@/lib/ui-classes";

type Node = { id: string; group: string; label: string; matterId?: string; snippet?: string };

const ADJACENT_MATTER_LINK_LIMIT = 10;

function linkEndpoint(id: unknown): string {
  if (typeof id === "string") return id;
  if (id && typeof id === "object" && "id" in id) return String((id as { id: string }).id);
  return "";
}

/** Neighbors linked to `selectedId` whose node has group "matter". */
function adjacentMatterIds(selectedId: string, allNodes: Node[], graphLinks: Link[]): string[] {
  const matterKey = new Map<string, string>();
  for (const n of allNodes) {
    if (n.group === "matter") {
      matterKey.set(n.id, n.matterId ?? n.id);
    }
  }
  const out = new Set<string>();
  for (const l of graphLinks) {
    const s = linkEndpoint(l.source);
    const t = linkEndpoint(l.target);
    if (s === selectedId && matterKey.has(t)) out.add(matterKey.get(t)!);
    if (t === selectedId && matterKey.has(s)) out.add(matterKey.get(s)!);
  }
  return Array.from(out);
}
type Link = { source: string; target: string; weight: number };
type SimNode = d3.SimulationNodeDatum & Node;

export function KnowledgeMapGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [insufficient, setInsufficient] = useState(false);
  const [selected, setSelected] = useState<Node | null>(null);

  useEffect(() => {
    fetch("/api/knowledge-graph")
      .then((r) => r.json())
      .then((g) => {
        setNodes(g.nodes ?? []);
        setLinks(g.links ?? []);
        setInsufficient(Boolean(g.insufficient));
      })
      .catch(() => {
        setNodes([]);
        setLinks([]);
        setInsufficient(true);
      });
  }, []);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = 640;
    const height = 420;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const color = d3
      .scaleOrdinal<string>()
      .domain(["matter", "relief", "jurisdiction"])
      .range(["#334155", "#059669", "#7c3aed"]);

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const simLinks = links.map((l) => ({ ...l }));

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        "link",
        d3
          .forceLink(simLinks)
          .id((d) => (d as Node).id)
          .distance(90),
      )
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append("g")
      .attr("stroke", "#cbd5e1")
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke-width", (d) => Math.max(1, (d as Link).weight * 2));

    const node = svg
      .append("g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(simNodes)
      .join("circle")
      .attr("r", 14)
      .attr("fill", (d) => color(d.group))
      .attr("cursor", "pointer")
      .on("click", (_, d) => setSelected(d));

    const drag = d3
      .drag<SVGCircleElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    const label = svg
      .append("g")
      .selectAll("text")
      .data(simNodes)
      .join("text")
      .text((d) => d.label)
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .attr("dy", 28)
      .attr("fill", "#334155")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as d3.SimulationNodeDatum).x ?? 0)
        .attr("y1", (d) => (d.source as d3.SimulationNodeDatum).y ?? 0)
        .attr("x2", (d) => (d.target as d3.SimulationNodeDatum).x ?? 0)
        .attr("y2", (d) => (d.target as d3.SimulationNodeDatum).y ?? 0);
      node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      label.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  const matterId =
    selected?.matterId ??
    (selected?.group === "matter" ? selected.id : null);

  const adjacentMatters = useMemo(() => {
    if (!selected) return [];
    return adjacentMatterIds(selected.id, nodes, links);
  }, [selected, nodes, links]);

  const showAdjacentList = Boolean(selected && !matterId && adjacentMatters.length > 0);
  const adjacentShown = adjacentMatters.slice(0, ADJACENT_MATTER_LINK_LIMIT);
  const adjacentMore =
    adjacentMatters.length > ADJACENT_MATTER_LINK_LIMIT
      ? adjacentMatters.length - ADJACENT_MATTER_LINK_LIMIT
      : 0;

  const matterSnippetById = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of nodes) {
      if (n.group === "matter" && n.snippet?.trim()) {
        map.set(n.matterId ?? n.id, n.snippet.trim());
      }
    }
    return map;
  }, [nodes]);

  return (
    <div className="relative flex gap-4">
      <div className="min-w-0 flex-1">
        {insufficient && nodes.length <= 2 ? (
          <p className="mb-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Insufficient pattern data to draw a rich graph. Add matters and legal elements, or index patterns
            from the API when Qdrant is running.
          </p>
        ) : null}
        <svg
          ref={svgRef}
          viewBox="0 0 640 420"
          className="w-full rounded-lg border border-slate-200 bg-white"
          role="img"
          aria-label="Knowledge map graph"
        />
      </div>
      {selected ? (
        <aside className="w-72 max-w-[min(18rem,100%)] shrink-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">{selected.label}</h3>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{selected.group}</p>
          {selected.snippet ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{selected.snippet}</p>
          ) : null}
          {matterId ? (
            <Link className="mt-3 inline-block text-sm font-medium text-slate-800 underline-offset-2 hover:underline" href={`/matters/${matterId}`}>
              Open matter {matterId}
            </Link>
          ) : null}
          {showAdjacentList ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-700">Linked matters</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {adjacentShown.map((id) => (
                  <li key={id}>
                    <Link
                      className="font-medium text-slate-800 underline-offset-2 hover:underline"
                      href={`/matters/${id}`}
                    >
                      {id}
                    </Link>
                    {matterSnippetById.get(id) ? (
                      <p className="mt-0.5 text-xs leading-snug text-slate-500">{matterSnippetById.get(id)}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
              {adjacentMore > 0 ? (
                <p className="mt-2 text-xs text-slate-500">...and {adjacentMore} more</p>
              ) : null}
            </div>
          ) : null}
          {!matterId && !showAdjacentList ? (
            <p className="mt-3 text-xs text-slate-500">
              Concept node with no linked matter in this graph. Select a gray matter node to open its record.
            </p>
          ) : null}
          <button type="button" className={`${btnSecondary} mt-4 w-full`} onClick={() => setSelected(null)}>
            Close
          </button>
        </aside>
      ) : (
        <p className="hidden w-56 shrink-0 text-xs text-slate-500 lg:block">
          Click a node to see details and open the linked matter.
        </p>
      )}
    </div>
  );
}

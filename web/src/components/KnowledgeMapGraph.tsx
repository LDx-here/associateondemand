"use client";

import * as d3 from "d3";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { btnSecondary } from "@/lib/ui-classes";

type Node = { id: string; group: string; label: string; matterId?: string; snippet?: string };

const ADJACENT_MATTER_LINK_LIMIT = 10;
const VIEW_W = 800;
const VIEW_H = 560;
const SCALE_EXTENT: [number, number] = [0.15, 4];
const ZOOM_STEP = 1.35;

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
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const fitToViewRef = useRef<(animate?: boolean) => void>(() => {});
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

    const width = VIEW_W;
    const height = VIEW_H;
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
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05));

    // Zoomable content layer (links + nodes + labels)
    const root = svg.append("g").attr("class", "km-zoom-root");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent(SCALE_EXTENT)
      .filter((event) => {
        // Allow wheel/pinch always; skip pan when interacting with a node.
        if (event.type === "wheel") return true;
        const t = event.target as Element | null;
        if (t && (t.closest("circle") || t.closest("text"))) return false;
        return !event.ctrlKey && !event.button;
      })
      .on("zoom", (event) => {
        root.attr("transform", event.transform.toString());
      });

    svg.call(zoom);
    // Obsidian-like: double-click zooms in; reset uses Fit control.
    svg.on("dblclick.zoom", null);

    zoomBehaviorRef.current = zoom;

    function fitToView(animate = true) {
      const el = root.node();
      if (!el || !svgRef.current) return;
      const bounds = el.getBBox();
      if (!bounds.width || !bounds.height) return;

      const pad = 48;
      const scale = Math.min(
        SCALE_EXTENT[1],
        Math.max(
          SCALE_EXTENT[0],
          0.92 / Math.max(bounds.width / (width - pad * 2), bounds.height / (height - pad * 2)),
        ),
      );
      const midX = bounds.x + bounds.width / 2;
      const midY = bounds.y + bounds.height / 2;
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-midX, -midY);

      const sel = d3.select(svgRef.current);
      if (animate) {
        sel.transition().duration(450).ease(d3.easeCubicOut).call(zoom.transform, transform);
      } else {
        sel.call(zoom.transform, transform);
      }
    }

    fitToViewRef.current = fitToView;

    const link = root
      .append("g")
      .attr("stroke", "#cbd5e1")
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke-width", (d) => Math.max(1, (d as Link).weight * 2));

    const node = root
      .append("g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(simNodes)
      .join("circle")
      .attr("r", 14)
      .attr("fill", (d) => color(d.group))
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelected(d);
      })
      .on("mousedown", (event) => {
        // Keep node drag from starting a background pan.
        event.stopPropagation();
      });

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

    const label = root
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

    let fittedOnce = false;
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as d3.SimulationNodeDatum).x ?? 0)
        .attr("y1", (d) => (d.source as d3.SimulationNodeDatum).y ?? 0)
        .attr("x2", (d) => (d.target as d3.SimulationNodeDatum).x ?? 0)
        .attr("y2", (d) => (d.target as d3.SimulationNodeDatum).y ?? 0);
      node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      label.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
    });

    // Fit once the layout has mostly settled so all nodes are in view.
    simulation.on("end", () => {
      if (!fittedOnce) {
        fittedOnce = true;
        fitToView(true);
      }
    });

    // Fallback if simulation stays hot (alpha never hits end) — fit after a short settle.
    const settleTimer = window.setTimeout(() => {
      if (!fittedOnce) {
        fittedOnce = true;
        fitToView(true);
      }
    }, 900);

    return () => {
      window.clearTimeout(settleTimer);
      simulation.stop();
      zoomBehaviorRef.current = null;
    };
  }, [nodes, links]);

  function zoomBy(factor: number) {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(200)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  }

  function resetView() {
    fitToViewRef.current(true);
  }

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
    <div className="relative flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1">
        {insufficient && nodes.length <= 2 ? (
          <p className="mb-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Insufficient pattern data to draw a rich graph. Add matters and legal elements, or index patterns
            from the API when Qdrant is running.
          </p>
        ) : null}
        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80">
          <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-md border border-slate-200 bg-white/95 p-0.5 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Zoom in"
              title="Zoom in"
              disabled={nodes.length === 0}
              onClick={() => zoomBy(ZOOM_STEP)}
            >
              <ZoomIn className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Zoom out"
              title="Zoom out"
              disabled={nodes.length === 0}
              onClick={() => zoomBy(1 / ZOOM_STEP)}
            >
              <ZoomOut className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Fit to view"
              title="Fit to view"
              disabled={nodes.length === 0}
              onClick={resetView}
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="h-[min(70vh,36rem)] w-full cursor-grab bg-white active:cursor-grabbing"
            role="img"
            aria-label="Knowledge map graph. Scroll to zoom, drag background to pan."
          />
          {nodes.length > 0 ? (
            <p className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-500 ring-1 ring-slate-200/80">
              Scroll to zoom · Drag background to pan · Drag nodes to rearrange
            </p>
          ) : null}
        </div>
      </div>
      {selected ? (
        <aside className="w-full shrink-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:w-72 lg:max-w-[min(18rem,100%)]">
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
          Click a node for details. Use scroll / pinch to zoom, drag the background to pan, or Fit to view to
          see the full graph.
        </p>
      )}
    </div>
  );
}

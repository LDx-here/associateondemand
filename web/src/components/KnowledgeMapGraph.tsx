"use client";

import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

type Node = { id: string; group: string; label: string };
type Link = { source: string; target: string; weight: number };

export function KnowledgeMapGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);

  useEffect(() => {
    fetch("/api/knowledge-graph")
      .then((r) => r.json())
      .then((g) => {
        setNodes(g.nodes ?? []);
        setLinks(g.links ?? []);
      })
      .catch(() => {
        setNodes([]);
        setLinks([]);
      });
  }, []);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = 640;
    const height = 420;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const color = d3.scaleOrdinal<string>().domain(["matter", "relief", "jurisdiction"]).range(["#0284c7", "#059669", "#7c3aed"]);

    const simNodes = nodes.map((n) => ({ ...n }));
    const simLinks = links.map((l) => ({ ...l }));

    const simulation = d3
      .forceSimulation(simNodes as d3.SimulationNodeDatum & Node[])
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
      .selectAll("circle")
      .data(simNodes)
      .join("circle")
      .attr("r", 14)
      .attr("fill", (d) => color((d as Node).group))
      .call(
        d3
          .drag<SVGCircleElement, Node>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            (d as d3.SimulationNodeDatum & Node).fx = d.x;
            (d as d3.SimulationNodeDatum & Node).fy = d.y;
          })
          .on("drag", (event, d) => {
            (d as d3.SimulationNodeDatum & Node).fx = event.x;
            (d as d3.SimulationNodeDatum & Node).fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            (d as d3.SimulationNodeDatum & Node).fx = null;
            (d as d3.SimulationNodeDatum & Node).fy = null;
          }),
      );

    const label = svg
      .append("g")
      .selectAll("text")
      .data(simNodes)
      .join("text")
      .text((d) => (d as Node).label)
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .attr("dy", 28)
      .attr("fill", "#334155");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as d3.SimulationNodeDatum).x ?? 0)
        .attr("y1", (d) => (d.source as d3.SimulationNodeDatum).y ?? 0)
        .attr("x2", (d) => (d.target as d3.SimulationNodeDatum).x ?? 0)
        .attr("y2", (d) => (d.target as d3.SimulationNodeDatum).y ?? 0);
      node.attr("cx", (d) => (d as d3.SimulationNodeDatum).x ?? 0).attr("cy", (d) => (d as d3.SimulationNodeDatum).y ?? 0);
      label.attr("x", (d) => (d as d3.SimulationNodeDatum).x ?? 0).attr("y", (d) => (d as d3.SimulationNodeDatum).y ?? 0);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  return (
    <svg ref={svgRef} viewBox="0 0 640 420" className="w-full rounded-lg border border-slate-200 bg-white" role="img" aria-label="Knowledge map graph" />
  );
}

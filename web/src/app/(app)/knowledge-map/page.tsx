"use client";

import { KnowledgeMapGraph } from "@/components/KnowledgeMapGraph";

export default function KnowledgeMapPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Knowledge map</h1>
      <p className="text-sm text-slate-600">
        Pattern agent graph — matters linked to relief types and jurisdictions (Qdrant-backed in production).
      </p>
      <KnowledgeMapGraph />
    </div>
  );
}

import { KnowledgeMapShell } from "@/components/KnowledgeMapShell";
import knowledgeMapData from "@/lib/knowledge-map/data.json";
import type { KnowledgeMapData } from "@/lib/knowledge-map/types";

export default function KnowledgeMapPage() {
  return <KnowledgeMapShell firmKnowledge={knowledgeMapData as KnowledgeMapData} />;
}

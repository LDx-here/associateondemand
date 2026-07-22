export type KnowledgeSection = {
  heading: string;
  bullets: string[];
};

export type KnowledgeTopic = {
  id: string;
  file: string;
  title: string;
  topic: string;
  notes: string;
  cite: string;
  practiceAreas: string;
  sections: KnowledgeSection[];
  related: string[];
};

export type KnowledgeCategory = {
  id: string;
  title: string;
  description: string;
  topics: KnowledgeTopic[];
};

export type KnowledgeMapData = {
  generatedAt: string;
  source: string;
  label: string;
  categories: KnowledgeCategory[];
};

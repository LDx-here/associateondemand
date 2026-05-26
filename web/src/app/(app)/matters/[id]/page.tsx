import { notFound } from "next/navigation";

import { MatterWorkbench } from "@/components/MatterWorkbench";
import {
  buildTimeline,
  getCaseAssessment,
  getMatterByCode,
  listDocumentsForMatter,
  listLegalElements,
  listNotesForMatter,
  listTasksForMatter,
  useDemoMode,
} from "@/lib/data-store";
import { getMutableSeed } from "@/lib/demo-store-mutable";

type Props = { params: Promise<{ id: string }> };

export default async function MatterDetailPage({ params }: Props) {
  const { id } = await params;
  const matter = await getMatterByCode(id);
  if (!matter) notFound();

  const [tasks, notes, elements, timeline, documents, assessment] = await Promise.all([
    listTasksForMatter(matter.matterId),
    listNotesForMatter(matter.matterId),
    listLegalElements(matter.matterId),
    buildTimeline(matter.matterId),
    listDocumentsForMatter(matter.matterId),
    getCaseAssessment(matter.matterId),
  ]);

  let events: Awaited<ReturnType<typeof loadEvents>> = [];
  if (useDemoMode()) {
    events = await loadEvents(matter.matterId);
  }

  return (
    <MatterWorkbench
      matter={matter}
      initialTasks={tasks}
      initialNotes={notes}
      initialElements={elements}
      initialTimeline={timeline}
      initialDocuments={documents}
      initialAssessment={assessment}
      initialEvents={events}
    />
  );
}

async function loadEvents(matterId: string) {
  const seed = await getMutableSeed();
  return seed.events.filter((e) => e.matterId === matterId);
}

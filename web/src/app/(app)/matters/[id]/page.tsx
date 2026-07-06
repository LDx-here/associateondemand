import { notFound } from "next/navigation";

import { MatterWorkbench } from "@/components/MatterWorkbench";
import {
  buildTimeline,
  getCaseAssessment,
  getMatterByCode,
  listDocumentsForMatter,
  listEventsForMatter,
  listLegalElements,
  listNotesForMatter,
  listTasksForMatter,
  isDemoMode,
} from "@/lib/data-store";

type Props = { params: Promise<{ id: string }> };

export default async function MatterDetailPage({ params }: Props) {
  const { id } = await params;
  const matter = await getMatterByCode(id);
  if (!matter) notFound();

  const [tasks, notes, elements, timeline, documents, assessment, events] = await Promise.all([
    listTasksForMatter(matter.matterId),
    listNotesForMatter(matter.matterId),
    listLegalElements(matter.matterId),
    buildTimeline(matter.matterId),
    listDocumentsForMatter(matter.matterId),
    getCaseAssessment(matter.matterId),
    listEventsForMatter(matter.matterId),
  ]);

  const demo = isDemoMode();

  return (
    <MatterWorkbench
      demoMode={demo}
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

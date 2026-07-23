import { notFound } from "next/navigation";

import { MatterWorkbench } from "@/components/MatterWorkbench";
import {
  buildTimeline,
  getMatterByCode,
  listAgentAlertsForMatter,
  listAssignmentsForMatter,
  listContacts,
  listContactsForMatter,
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

  const [
    tasks,
    notes,
    elements,
    timeline,
    documents,
    events,
    assignments,
    agentAlerts,
    contacts,
    allContacts,
  ] = await Promise.all([
    listTasksForMatter(matter.matterId),
    listNotesForMatter(matter.matterId),
    listLegalElements(matter.matterId),
    buildTimeline(matter.matterId),
    listDocumentsForMatter(matter.matterId),
    listEventsForMatter(matter.matterId),
    listAssignmentsForMatter(matter.matterId),
    listAgentAlertsForMatter(matter.matterId),
    listContactsForMatter(matter.matterId),
    listContacts(),
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
      initialEvents={events}
      initialAssignments={assignments}
      initialAgentAlerts={agentAlerts}
      initialContacts={contacts}
      allContacts={allContacts}
    />
  );
}

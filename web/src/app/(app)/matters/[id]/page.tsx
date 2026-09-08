import { notFound } from "next/navigation";

import { CaseJourneyPanel } from "@/components/CaseJourneyPanel";
import { CaseStoryPanel } from "@/components/CaseStoryPanel";
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
  usesGoogleSheets,
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
  const sheetsEnabled = demo || usesGoogleSheets();

  return (
    <div className="space-y-4">
      {/* Prose first: where this stands and when it was last worked, before
          the tabbed workbench where the work actually happens. */}
      <CaseStoryPanel
        matter={matter}
        notes={notes}
        tasks={tasks}
        contacts={contacts}
        documents={documents}
      />
      {/* Where this sits in the arc of its case type — read before the tabs,
          since "where are we and what is next" is the first question. */}
      <CaseJourneyPanel
        matterId={matter.matterId}
        caseType={matter.caseType}
        proceduralPosture={matter.proceduralPosture}
      />
      <MatterWorkbench
      demoMode={demo}
      sheetsEnabled={sheetsEnabled}
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
    </div>
  );
}

import Link from "next/link";

import type { Contact, Matter, Note, Task } from "@/lib/types";
import { buildCaseStory, buildStoryTimeline } from "@/lib/case-story";

/**
 * The matter as prose — what the attorney reads first when reopening a file.
 *
 * Sits above the tabbed workbench rather than replacing it: the tabs are how
 * work gets done, but landing on six tabs of fields is what made picking a
 * case back up feel like reconstructing it. This answers "where does this
 * stand and when did I last touch it" in a paragraph.
 */
export function CaseStoryPanel({
  matter,
  notes,
  tasks,
  contacts = [],
  documents = [],
}: {
  matter: Matter;
  notes: Note[];
  tasks: Task[];
  contacts?: Contact[];
  documents?: { title: string; uploadedAt?: string | null }[];
}) {
  const now = new Date();
  const story = buildCaseStory(matter, notes, tasks, contacts, now);
  const timeline = buildStoryTimeline(matter, notes, tasks, documents, 6);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{story.headline}</h2>

      {/* One flowing paragraph. Emphasis carries urgency without turning the
          page back into a grid of labels. */}
      <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-slate-700">
        {story.sentences.map((sentence, i) => (
          <span
            key={i}
            className={sentence.tone === "attention" ? "font-medium text-rose-900" : undefined}
          >
            {sentence.text}{" "}
          </span>
        ))}
      </p>

      {matter.summary?.trim() ? (
        <p className="mt-3 max-w-3xl border-l-2 border-slate-200 pl-3 text-sm italic text-slate-600">
          {matter.summary.trim()}
        </p>
      ) : null}

      {timeline.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recently on this matter
          </p>
          <ol className="mt-2 space-y-1.5">
            {timeline.map((event, i) => (
              <li key={`${event.at}-${i}`} className="flex gap-3 text-sm">
                <span className="w-24 shrink-0 font-mono text-xs text-slate-500">
                  {event.at.slice(0, 10)}
                </span>
                <span className="text-slate-700">{event.label}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          Nothing logged here yet.{" "}
          <Link
            href={`/matters/${matter.matterId}`}
            className="font-medium text-sky-800 underline-offset-2 hover:underline"
          >
            Add a note on the Case activity tab
          </Link>{" "}
          and it will start building a history.
        </p>
      )}
    </section>
  );
}

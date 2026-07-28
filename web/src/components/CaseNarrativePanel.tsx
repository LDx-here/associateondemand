"use client";

import { BookOpen } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { buildCaseNarrative } from "@/lib/note-fact-extraction";
import type { Note } from "@/lib/types";

export function CaseNarrativePanel({
  notes,
  matterTitle,
}: {
  notes: Note[];
  matterTitle?: string;
}) {
  const entries = buildCaseNarrative(notes, matterTitle);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-2">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Case story</h3>
          <p className="text-xs text-slate-600">
            Your work notes in order — reads like a journal about this client, not a database export.
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No story yet."
          description="Save notes on this matter and they appear here as a readable timeline."
        />
      ) : (
        <article className="space-y-4 text-sm leading-relaxed text-slate-800">
          {entries.map((entry) => (
            <p key={entry.id} className="border-l-2 border-slate-200 pl-3">
              {entry.paragraph}
            </p>
          ))}
        </article>
      )}
    </section>
  );
}

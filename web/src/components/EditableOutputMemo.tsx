"use client";

import { useEffect, useRef, useState } from "react";

import { SaveAsSkillModal } from "@/components/SaveAsSkillModal";
import { useToast } from "@/components/Toast";
import { btnSecondary } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type SaveMode = "agent-output" | "note";

export function EditableOutputMemo({
  content,
  matterId,
  agent,
  noteId,
  saveMode = "agent-output",
  className,
  compact = false,
  onSaved,
}: {
  content: string;
  matterId?: string;
  agent?: string;
  noteId?: string;
  saveMode?: SaveMode;
  className?: string;
  compact?: boolean;
  onSaved?: (saved: { content: string; noteId?: string }) => void;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [savedContent, setSavedContent] = useState(content);
  const [persistedNoteId, setPersistedNoteId] = useState(noteId);
  const [saving, setSaving] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);
  const [firmMemoryOpen, setFirmMemoryOpen] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(content);
    setSavedContent(content);
  }, [content]);

  useEffect(() => {
    setPersistedNoteId(noteId);
  }, [noteId]);

  const dirty = draft.trim() !== savedContent.trim();
  const canPersist = Boolean(matterId) && dirty;

  async function persist(showSuccessToast = true) {
    if (!matterId || !draft.trim()) return false;
    setSaving(true);
    try {
      const endpoint =
        saveMode === "note" && persistedNoteId
          ? `/api/matters/${matterId}/notes/${persistedNoteId}`
          : `/api/matters/${matterId}/agent-output`;
      const resp = await fetch(endpoint, {
        method: saveMode === "note" && persistedNoteId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draft.trim(),
          agent,
          noteId: persistedNoteId,
        }),
      });
      const data = (await resp.json()) as { error?: string; note?: { id: string; content: string } };
      if (!resp.ok) {
        showToast(data.error ?? `Save failed (${resp.status})`, "error");
        return false;
      }
      const nextContent = data.note?.content ?? draft.trim();
      setSavedContent(nextContent);
      setDraft(nextContent);
      if (data.note?.id) setPersistedNoteId(data.note.id);
      if (showSuccessToast) showToast("Output saved to matter notes.", "success");
      onSaved?.({ content: nextContent, noteId: data.note?.id ?? persistedNoteId });
      setEditing(false);
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Network error saving output.", "error");
      return false;
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!editing || !canPersist) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void persist(false);
    }, 2500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [draft, editing, canPersist]);

  function cancelEdit() {
    setDraft(savedContent);
    setEditing(false);
  }

  const defaultSkillName =
    agent && matterId ? `${agent} refinement — ${matterId}` : agent ? `${agent} refinement` : "Attorney refinement";

  return (
    <>
      <div className={cn("space-y-2", className)}>
        <div className="flex flex-wrap items-center gap-2">
          {!editing ? (
            <button
              type="button"
              className={cn(btnSecondary, "py-0.5 px-2 text-[0.65rem]")}
              onClick={() => setEditing(true)}
            >
              Edit output
            </button>
          ) : (
            <>
              <button
                type="button"
                className={cn(btnSecondary, "py-0.5 px-2 text-[0.65rem]")}
                disabled={saving || !canPersist}
                onClick={() => void persist()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className={cn(btnSecondary, "py-0.5 px-2 text-[0.65rem]")}
                disabled={saving}
                onClick={cancelEdit}
              >
                Cancel
              </button>
            </>
          )}
          {dirty && matterId ? (
            <>
              <button
                type="button"
                className={cn(btnSecondary, "py-0.5 px-2 text-[0.65rem]")}
                onClick={() => setSkillOpen(true)}
              >
                Save as skill
              </button>
              <button
                type="button"
                className={cn(btnSecondary, "py-0.5 px-2 text-[0.65rem]")}
                onClick={() => setFirmMemoryOpen(true)}
              >
                Save to Firm Memory
              </button>
            </>
          ) : null}
          {dirty && editing ? (
            <span className="text-[0.65rem] text-amber-800">Unsaved changes · autosaves after 2.5s</span>
          ) : null}
        </div>

        {editing ? (
          <textarea
            className={cn(
              "w-full overflow-auto whitespace-pre-wrap rounded border border-sky-300 bg-white p-2 font-mono text-[0.7rem] leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400",
              compact ? "max-h-64" : "min-h-[12rem]",
            )}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        ) : (
          <pre
            className={cn(
              "overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-white p-2 font-mono text-[0.7rem] leading-relaxed text-slate-800",
              compact ? "max-h-64" : "",
            )}
          >
            {savedContent}
          </pre>
        )}
      </div>

      <SaveAsSkillModal
        open={skillOpen}
        onClose={() => setSkillOpen(false)}
        defaultName={defaultSkillName}
        defaultBody={draft.trim()}
        originalOutput={savedContent}
        matterId={matterId}
        agent={agent}
      />
      <SaveAsSkillModal
        open={firmMemoryOpen}
        onClose={() => setFirmMemoryOpen(false)}
        defaultName={defaultSkillName}
        defaultBody={draft.trim()}
        originalOutput={savedContent}
        matterId={matterId}
        agent={agent}
        variant="firm_memory"
      />
    </>
  );
}

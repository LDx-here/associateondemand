"use client";

import { FileText, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/Toast";
import {
  buildTemplateFieldDefaults,
  editableFieldsForMap,
  getTemplateFieldMap,
  listTemplateFieldMaps,
  renderFilledTemplate,
  type TemplateFieldMap,
} from "@/lib/template-field-maps";
import {
  emptyValuesForMap,
  listTemplateProfiles,
  saveTemplateProfile,
  type TemplateProfile,
} from "@/lib/template-profiles";
import type { Matter } from "@/lib/types";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

type MatterHints = {
  client_name?: string;
  a_number?: string;
  matter_id?: string;
  court?: string;
  hearing_date?: string;
  firm_name?: string;
};

function matterHintsFromMatter(matter: Matter): MatterHints {
  return {
    matter_id: matter.matterId,
    court: matter.court ?? "",
    hearing_date: matter.nextHearing ?? "",
    client_name: matter.title?.trim() && matter.title !== matter.matterId ? matter.title : "",
  };
}

export function TemplateApplyPanel({
  matter,
  compact = false,
}: {
  matter: Matter;
  compact?: boolean;
}) {
  const { showToast } = useToast();
  const maps = listTemplateFieldMaps();
  const [templateId, setTemplateId] = useState(maps[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<TemplateProfile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");

  const map: TemplateFieldMap | undefined = getTemplateFieldMap(templateId);
  const hints = useMemo(() => matterHintsFromMatter(matter), [matter]);

  useEffect(() => {
    if (!map) return;
    setProfiles(listTemplateProfiles(map.id));
    const profile = profileId ? listTemplateProfiles(map.id).find((p) => p.id === profileId) : undefined;
    const defaults = buildTemplateFieldDefaults(map, {
      profileValues: profile?.values,
      matterHints: hints,
    });
    setValues(defaults);
  }, [map, templateId, profileId, hints]);

  function onTemplateChange(id: string) {
    setTemplateId(id);
    setProfileId("");
    setOutput(null);
    const next = getTemplateFieldMap(id);
    if (next) setValues(buildTemplateFieldDefaults(next, { matterHints: hints }));
  }

  function applyProfile(id: string) {
    setProfileId(id);
    setOutput(null);
  }

  function saveProfile() {
    if (!map) return;
    const name = profileName.trim() || `${map.name} — ${matter.matterId} defaults`;
    saveTemplateProfile({ templateId: map.id, name, values, id: profileId || undefined });
    setProfiles(listTemplateProfiles(map.id));
    showToast(`Template profile "${name}" saved.`, "success");
    setProfileName("");
  }

  function generate() {
    if (!map) return;
    setOutput(renderFilledTemplate(map, values));
    showToast("Filled template preview ready — copy or save to matter notes.", "success");
  }

  if (!maps.length) return null;

  const editable = map ? editableFieldsForMap(map) : [];

  return (
    <section
      className={`space-y-4 rounded-lg border border-sky-200 bg-sky-50/40 p-4 ${compact ? "" : "shadow-sm"}`}
      id="smart-templates"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-sky-950">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            Smart templates
          </h2>
          <p className="mt-1 text-xs text-sky-900/80">
            Select a firm template — editable fields pre-fill from this matter and saved profiles. Locked
            boilerplate preserves format.
          </p>
        </div>
        {!compact ? (
          <Link href="/templates#smart-templates" className={`${btnSecondary} text-xs`}>
            All templates →
          </Link>
        ) : null}
      </div>

      <label className="block text-xs font-medium text-slate-700">
        Template
        <select
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          value={templateId}
          onChange={(e) => onTemplateChange(e.target.value)}
        >
          {maps.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      {map ? (
        <>
          <p className="text-xs text-slate-600">{map.description}</p>

          {map.boilerplateSections.length ? (
            <div className="rounded-md border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600">
              <p className="mb-1 flex items-center gap-1 font-medium text-slate-800">
                <Lock className="h-3 w-3" aria-hidden />
                Locked boilerplate (structure preserved)
              </p>
              <ul className="list-inside list-disc">
                {map.boilerplateSections.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {profiles.length ? (
            <label className="block text-xs font-medium text-slate-700">
              Apply saved profile
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                value={profileId}
                onChange={(e) => applyProfile(e.target.value)}
              >
                <option value="">— Matter + defaults only —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {editable.map((field) => (
              <label key={field.id} className="block text-xs font-medium text-slate-700">
                <span className="text-violet-800">{field.label}</span>
                <span className="ml-1 font-normal text-slate-400">(customize)</span>
                {field.type === "textarea" ? (
                  <textarea
                    className="mt-1 w-full rounded-md border border-violet-200 bg-white px-2 py-1.5 text-sm ring-1 ring-violet-100"
                    rows={3}
                    placeholder={field.placeholder}
                    value={values[field.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  />
                ) : field.type === "select" && field.options?.length ? (
                  <select
                    className="mt-1 w-full rounded-md border border-violet-200 bg-white px-2 py-1.5 text-sm"
                    value={values[field.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    {field.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="mt-1 w-full rounded-md border border-violet-200 bg-white px-2 py-1.5 text-sm"
                    type={field.type === "date" ? "date" : "text"}
                    placeholder={field.placeholder}
                    value={values[field.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  />
                )}
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={generate}>
              <FileText className="mr-1 inline h-4 w-4" aria-hidden />
              Generate filled preview
            </button>
            <button type="button" className={btnSecondary} onClick={() => map && setValues(emptyValuesForMap(map))}>
              Clear fields
            </button>
          </div>

          <div className="space-y-2 rounded-md border border-dashed border-violet-200 bg-white/60 p-3">
            <p className="text-xs font-medium text-violet-950">Save as reusable profile</p>
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-[12rem] flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder={`e.g. ${map.name} — RMV defaults`}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
              <button type="button" className={btnSecondary} onClick={saveProfile}>
                Save profile
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Profiles apply on any matter when you select this template. Also configure firm-wide defaults in{" "}
              <Link href="/templates#firm-memory" className="font-medium text-violet-800 underline">
                Firm Memory
              </Link>
              .
            </p>
          </div>

          {output ? (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Filled output (structured note)
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 font-mono text-xs">
                {output}
              </pre>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

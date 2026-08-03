"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { TemplateFieldForm } from "@/components/TemplateFieldForm";
import { useToast } from "@/components/Toast";
import { formatSpecIncludes, specForTemplateFieldMap } from "@/lib/deliverable-template-specs";
import {
  buildTemplateFieldDefaults,
  editableFieldsForMap,
  getTemplateFieldMap,
  listTemplateFieldMaps,
  type TemplateFieldMap,
} from "@/lib/template-field-maps";
import {
  emptyValuesForMap,
  listTemplateProfiles,
  saveTemplateProfile,
} from "@/lib/template-profiles";
import type { Matter } from "@/lib/types";
import { btnSecondary } from "@/lib/ui-classes";

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
  initialTemplateId,
}: {
  matter: Matter;
  compact?: boolean;
  initialTemplateId?: string;
}) {
  const { showToast } = useToast();
  const maps = listTemplateFieldMaps();
  const [templateId, setTemplateId] = useState(initialTemplateId ?? maps[0]?.id ?? "");
  const [profileId, setProfileId] = useState("");
  const [profileName, setProfileName] = useState("");

  const map: TemplateFieldMap | undefined = getTemplateFieldMap(templateId);
  const hints = useMemo(() => matterHintsFromMatter(matter), [matter]);
  const profiles = useMemo(() => (map ? listTemplateProfiles(map.id) : []), [map]);
  const defaultValues = useMemo(() => {
    if (!map) return {};
    const profile = profileId ? profiles.find((p) => p.id === profileId) : undefined;
    return buildTemplateFieldDefaults(map, {
      profileValues: profile?.values,
      matterHints: hints,
    });
  }, [map, profileId, profiles, hints]);

  const [values, setValues] = useState<Record<string, string>>(defaultValues);
  const sourceKey = `${templateId}:${profileId}:${JSON.stringify(hints)}`;

  // Reset the editable values whenever the effective template/profile/matter-hints
  // combination changes. Doing this during render (rather than in an effect) avoids
  // an extra cascading render — see https://react.dev/learn/you-might-not-need-an-effect.
  const [prevSourceKey, setPrevSourceKey] = useState(sourceKey);
  if (sourceKey !== prevSourceKey) {
    setPrevSourceKey(sourceKey);
    setValues(defaultValues);
  }

  function onTemplateChange(id: string) {
    setTemplateId(id);
    setProfileId("");
    const next = getTemplateFieldMap(id);
    if (next) setValues(buildTemplateFieldDefaults(next, { matterHints: hints }));
  }

  function saveProfile() {
    if (!map) return;
    const name = profileName.trim() || `${map.name} — ${matter.matterId} defaults`;
    saveTemplateProfile({ templateId: map.id, name, values, id: profileId || undefined });
    showToast(`Template profile "${name}" saved.`, "success");
    setProfileName("");
  }

  if (!maps.length) return null;

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
            Fill violet merge fields — letterhead and certificate come from Firm profile; built-in sections
            preserve outline until you replace the firm DOCX. Generate to assemble or download.
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
          {(() => {
            const spec = specForTemplateFieldMap(map.id);
            if (!spec) return null;
            return (
              <p className="text-xs text-slate-500">
                Includes: {formatSpecIncludes(spec)}
              </p>
            );
          })()}

          {profiles.length ? (
            <label className="block text-xs font-medium text-slate-700">
              Apply saved profile
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
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

          <TemplateFieldForm
            map={map}
            values={values}
            onValuesChange={setValues}
            onClear={() => setValues(emptyValuesForMap(map))}
            compact={compact}
            matterId={matter.matterId}
          />

          <div className="space-y-2 rounded-md border border-dashed border-violet-200 bg-white/60 p-3">
            <p className="text-xs font-medium text-violet-950">Save as reusable profile</p>
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-[12rem] flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder={`e.g. ${map.name} — firm defaults`}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
              <button type="button" className={btnSecondary} onClick={saveProfile}>
                Save profile
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Profiles apply on any matter when you select this template. Firm-wide tone and citation prefs
              live in{" "}
              <Link href="/firm-memory" className="font-medium text-violet-800 underline">
                Firm Memory
              </Link>
              .
            </p>
          </div>
        </>
      ) : null}
    </section>
  );
}

/** Standalone preview for /templates page (no matter context). */
export function TemplatePreviewStandalone({
  templateId,
  onClose,
}: {
  templateId: string;
  onClose?: () => void;
}) {
  const map = getTemplateFieldMap(templateId);
  const [values, setValues] = useState<Record<string, string>>(() =>
    map ? buildTemplateFieldDefaults(map, {}) : {},
  );

  if (!map) return null;

  return (
    <div className="space-y-2 rounded-md border border-sky-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{map.name}</p>
          <p className="text-xs text-slate-600">{map.description}</p>
          <p className="mt-1 text-xs text-violet-800">
            {editableFieldsForMap(map).length} merge fields · {map.boilerplateSections.length} structure
            sections
          </p>
        </div>
        {onClose ? (
          <button type="button" className="text-xs text-slate-500 hover:text-slate-800" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>
      <TemplateFieldForm
        map={map}
        values={values}
        onValuesChange={setValues}
        onClear={() => map && setValues(emptyValuesForMap(map))}
      />
    </div>
  );
}

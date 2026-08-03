"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useToast } from "@/components/Toast";
import {
  DEFAULT_CERTIFICATE_OF_SERVICE,
  EMPTY_FIRM_LETTERHEAD,
  formatFirmLetterhead,
  getFirmLetterhead,
  hasFirmLetterhead,
  saveFirmLetterhead,
  type FirmLetterheadProfile,
} from "@/lib/firm-letterhead";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

/** Editable firm letterhead + certificate of service (Settings → Firm profile). */
export function FirmLetterheadSettings() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<FirmLetterheadProfile>(EMPTY_FIRM_LETTERHEAD);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Intentional: `getFirmLetterhead` reads localStorage, a browser-only
    // external system unavailable at render time (and during SSR) — this
    // must run post-mount, not be computed during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external-system (localStorage) sync
    setProfile(getFirmLetterhead());
    setLoaded(true);
  }, []);

  function setField<K extends keyof FirmLetterheadProfile>(key: K, value: FirmLetterheadProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    saveFirmLetterhead(profile);
    showToast("Firm letterhead saved — used in smart templates and exports.", "success");
  }

  function onResetCertificate() {
    setField("certificateOfService", DEFAULT_CERTIFICATE_OF_SERVICE);
  }

  if (!loaded) {
    return <p className="text-sm text-slate-500">Loading firm profile…</p>;
  }

  return (
    <form onSubmit={onSave} className="space-y-4">
      <p className="text-sm text-slate-600">
        Letterhead and certificate of service feed document assembly (like TXDocs merge fields). Leave blank
        until you add real firm data — templates will show an empty placeholder, never invented addresses.{" "}
        <Link href="/help#templates" className="font-medium text-sky-800 underline-offset-2 hover:underline">
          How templates work →
        </Link>
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
          Firm name
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={profile.firmName}
            onChange={(e) => setField("firmName", e.target.value)}
            placeholder="Your Law Firm, PLLC"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
          Address line 1
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={profile.addressLine1}
            onChange={(e) => setField("addressLine1", e.target.value)}
            placeholder="Street address"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
          Address line 2
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={profile.addressLine2}
            onChange={(e) => setField("addressLine2", e.target.value)}
            placeholder="Suite / floor (optional)"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          City
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={profile.city}
            onChange={(e) => setField("city", e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-slate-700">
            State
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={profile.state}
              onChange={(e) => setField("state", e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            ZIP
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={profile.zip}
              onChange={(e) => setField("zip", e.target.value)}
            />
          </label>
        </div>
        <label className="block text-xs font-medium text-slate-700">
          Phone
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={profile.phone}
            onChange={(e) => setField("phone", e.target.value)}
            placeholder="(555) 555-5555"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={profile.email}
            onChange={(e) => setField("email", e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Attorney name
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={profile.attorneyName}
            onChange={(e) => setField("attorneyName", e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Bar number
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={profile.barNumber}
            onChange={(e) => setField("barNumber", e.target.value)}
          />
        </label>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs font-medium text-slate-700">Letterhead preview</p>
        <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-slate-600">
          {formatFirmLetterhead(profile)}
        </pre>
        {!hasFirmLetterhead(profile) ? (
          <p className="mt-1 text-[11px] text-amber-800">
            Empty — templates will show this placeholder until you save real firm data.
          </p>
        ) : null}
      </div>

      <label className="block text-xs font-medium text-slate-700">
        Certificate of service (firm template)
        <span className="ml-1 font-normal text-slate-500">
          — merge fields: {"{{date}}"}, {"{{method}}"}, {"{{parties_served}}"}, {"{{attorney_name}}"},{" "}
          {"{{bar_number}}"}
        </span>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
          rows={10}
          value={profile.certificateOfService}
          onChange={(e) => setField("certificateOfService", e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary}>
          Save firm profile
        </button>
        <button type="button" className={btnSecondary} onClick={onResetCertificate}>
          Reset certificate to default
        </button>
      </div>
    </form>
  );
}

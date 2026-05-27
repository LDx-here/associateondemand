"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function EimmigrationImportPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    try {
      const resp = await fetch(`${API}/eimmigration/import`, { method: "POST", body: fd });
      const data = await resp.json();
      setMessage(resp.ok ? `Imported ${data.imported} rows.` : JSON.stringify(data));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">eImmigration import (Tier A)</h1>
      <p className="text-sm text-slate-600">Upload CSV or JSON export. Tier B/C (Playwright) are API-gated for production.</p>
      <form className="space-y-3 rounded-lg border border-slate-200 bg-white p-4" onSubmit={onSubmit}>
        <input className="w-full text-sm" name="file" type="file" accept=".csv,.json" required />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Importing…" : "Import"}
        </button>
      </form>
      {message ? <pre className="whitespace-pre-wrap rounded-md bg-slate-100 p-3 text-xs">{message}</pre> : null}
    </div>
  );
}

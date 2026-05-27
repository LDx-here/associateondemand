"use client";

import { useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type PreviewRow = {
  matter_id?: string | null;
  case_type?: string | null;
  status?: string | null;
  procedural_posture?: string | null;
  next_deadline?: string | null;
};

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

function normalizeRow(row: Record<string, unknown>): PreviewRow {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = row[k];
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return null;
  };
  return {
    matter_id: pick("matter_id", "Matter ID", "matterId", "MatterID", "case_id"),
    case_type: pick("case_type", "Case Type", "caseType"),
    status: pick("status", "Status", "case_status"),
    procedural_posture: pick("posture", "Procedural Posture", "proceduralPosture", "Posture"),
    next_deadline: pick("next_deadline", "Next Deadline", "nextDeadline", "Deadline"),
  };
}

export default function EimmigrationImportPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onFileChange(file: File | null) {
    setPreview([]);
    setFileName(file?.name ?? null);
    if (!file) return;
    const text = await file.text();
    const lower = file.name.toLowerCase();
    let rows: Record<string, unknown>[] = [];
    if (lower.endsWith(".json")) {
      const payload = JSON.parse(text) as unknown;
      if (Array.isArray(payload)) rows = payload as Record<string, unknown>[];
      else if (payload && typeof payload === "object" && "records" in payload) {
        rows = (payload as { records: Record<string, unknown>[] }).records;
      } else if (payload && typeof payload === "object") {
        rows = [payload as Record<string, unknown>];
      }
    } else if (lower.endsWith(".csv")) {
      rows = parseCsv(text);
    }
    setPreview(rows.slice(0, 50).map(normalizeRow));
  }

  const mappedCount = useMemo(
    () => preview.filter((r) => r.matter_id || r.case_type).length,
    [preview],
  );

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
      setMessage(err instanceof Error ? err.message : "Import failed. Is the API service running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">eImmigration import (Tier A)</h1>
      <p className="text-sm text-slate-600">
        Upload CSV or JSON export. Review the field mapping preview before importing. Tier B/C browser
        automation is gated for production.
      </p>
      <form className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={onSubmit}>
        <input
          className="w-full text-sm"
          name="file"
          type="file"
          accept=".csv,.json"
          required
          onChange={(e) => void onFileChange(e.currentTarget.files?.[0] ?? null)}
        />
        <button
          type="submit"
          disabled={loading || preview.length === 0}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Importing…" : "Import mapped rows"}
        </button>
      </form>

      {fileName && preview.length > 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-medium text-slate-900">Field mapping preview</h2>
            <p className="text-xs text-slate-500">
              Showing {preview.length} rows ({mappedCount} with matter id or case type). Client name columns
              are ignored per firm PII policy.
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2">Matter ID</th>
                  <th className="px-3 py-2">Case type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Posture</th>
                  <th className="px-3 py-2">Next deadline</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={`${row.matter_id ?? "row"}-${idx}`} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.matter_id ?? "n/a"}</td>
                    <td className="px-3 py-2">{row.case_type ?? "n/a"}</td>
                    <td className="px-3 py-2">{row.status ?? "n/a"}</td>
                    <td className="px-3 py-2">{row.procedural_posture ?? "n/a"}</td>
                    <td className="px-3 py-2">{row.next_deadline ?? "n/a"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {message ? <pre className="whitespace-pre-wrap rounded-md bg-slate-100 p-3 text-xs">{message}</pre> : null}
    </div>
  );
}

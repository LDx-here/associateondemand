"use client";

const TIER = Number(process.env.NEXT_PUBLIC_PII_TIER ?? "0");

export function TierZeroBanner({
  approved,
  onApprovedChange,
}: {
  approved: boolean;
  onApprovedChange: (v: boolean) => void;
}) {
  if (TIER >= 1) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        PII tier {TIER}: Strong Reader enabled when Presidio sidecar is healthy.
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="alert"
    >
      <p className="font-medium">Tier 0 — manual attorney approval required</p>
      <p className="mt-1 text-amber-900">
        Documents with client PII should not be processed until Presidio anonymization is live (
        <code className="text-xs">AOD_PII_TIER=1</code>
        ). For controlled testing on de-identified or synthetic scans, confirm below.
      </p>
      <label className="mt-3 flex cursor-pointer items-start gap-2">
        <input
          checked={approved}
          className="mt-0.5"
          type="checkbox"
          onChange={(e) => onApprovedChange(e.target.checked)}
        />
        <span>
          I confirm this upload is approved for manual Strong Reader processing under tier 0 firm
          policy.
        </span>
      </label>
    </div>
  );
}

export function tierRequiresManualApproval(): boolean {
  return TIER < 1;
}

export type UploadResult = {
  document_id?: string;
  filename?: string;
  ocr_method?: string;
  processing_status?: string;
  confidence?: number;
  category?: string;
  facts_extracted?: number;
  facts?: Array<{ fact_type: string; value: string; confidence: number }>;
  obsidian_path?: string;
  text_preview?: string;
  error?: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function uploadDocument(
  matterId: string,
  file: File,
  manualApproved: boolean,
  endpoint: "single" | "batch" = "single",
): Promise<UploadResult> {
  const fd = new FormData();
  fd.set("matter_id", matterId);
  if (endpoint === "single") {
    fd.set("file", file);
  } else {
    fd.append("files", file);
  }
  if (manualApproved) {
    fd.set("manual_review_approved", "true");
  }

  const url = endpoint === "single" ? `${API}/intake/upload` : `${API}/intake/batch`;

  const resp = await fetch(url, {
    method: "POST",
    body: fd,
    headers: manualApproved ? { "X-Manual-Review-Approved": "true" } : {},
  });
  const data = await resp.json();
  if (!resp.ok) {
    const detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data);
    return { error: detail };
  }
  if (endpoint === "batch" && Array.isArray(data.documents)) {
    const match = data.documents.find((d: UploadResult) => d.filename === file.name);
    return match ?? data.documents[data.documents.length - 1] ?? data;
  }
  return data;
}

export function UploadProgressList({
  items,
}: {
  items: Array<{
    name: string;
    status: "pending" | "uploading" | "done" | "error";
    result?: UploadResult;
  }>;
}) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      {items.map((item) => (
        <li key={item.name} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{item.name}</span>
            <span
              className={
                item.status === "done"
                  ? "text-emerald-700"
                  : item.status === "error"
                    ? "text-red-700"
                    : item.status === "uploading"
                      ? "text-sky-700"
                      : "text-slate-500"
              }
            >
              {item.status === "pending" && "Queued"}
              {item.status === "uploading" && "Processing OCR…"}
              {item.status === "done" &&
                `${item.result?.processing_status ?? "done"} · ${item.result?.ocr_method ?? ""} · ${Math.round((item.result?.confidence ?? 0) * 100)}%`}
              {item.status === "error" && (item.result?.error ?? "Failed")}
            </span>
          </div>
          {item.status === "done" && item.result?.facts?.length ? (
            <ul className="mt-1 list-inside list-disc text-xs text-slate-600">
              {item.result.facts.slice(0, 4).map((f) => (
                <li key={`${f.fact_type}-${f.value}`}>
                  {f.fact_type}: {f.value}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

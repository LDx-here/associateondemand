import Link from "next/link";

import { FirmMemorySetup } from "@/components/FirmMemorySetup";

export default function FirmMemoryPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Firm Memory</h1>
        <p className="text-sm text-slate-600">
          Voice, tone, and style preferences for drafting — separate from Firm Knowledge (legal-element
          map) and Templates (DOCX structure).
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Also available under{" "}
          <Link href="/settings#firm-memory" className="font-medium text-sky-800 underline-offset-2 hover:underline">
            Settings → Firm Memory
          </Link>
          . Browse legal topics on the{" "}
          <Link
            href="/knowledge-map#firm-knowledge"
            className="font-medium text-sky-800 underline-offset-2 hover:underline"
          >
            knowledge map
          </Link>
          .
        </p>
      </header>

      <FirmMemorySetup />
    </div>
  );
}

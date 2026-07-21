import { Suspense } from "react";

import { PartnerSubmissionForm } from "@/components/PartnerSubmissionForm";
import { ToastProvider } from "@/components/Toast";
import { getSupabaseSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ deliverable?: string; payment?: string }> };

export default async function PartnerSubmitPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await getSupabaseSessionUser();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-sky-800">Recover My Value</p>
              <h1 className="text-xl font-semibold text-slate-900">Submit overflow work to RMV</h1>
            </div>
            <a
              href="https://recovermyvalue.com"
              className="text-sm text-slate-600 underline-offset-2 hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              About RMV
            </a>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-8">
          {params.payment === "success" ? (
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-950">
              <strong>Payment received.</strong> Recover My Value will begin work on your deliverable and contact you at
              your firm email when it is ready for review.
            </div>
          ) : null}

          <p className="mb-6 text-sm text-slate-600">
            Partner law firms submit verified overflow counsel assignments here. Quoted flat fees —{" "}
            {params.payment === "success" ? "paid at checkout" : "invoice or secure checkout after scope confirmation"}.
            You retain filing and client responsibility; RMV verifies every deliverable.
          </p>

          <Suspense fallback={<p className="text-sm text-slate-500">Loading form…</p>}>
            <PartnerSubmissionForm
              initialEmail={session?.email ?? ""}
              initialDeliverableId={params.deliverable}
            />
          </Suspense>
        </main>
      </div>
    </ToastProvider>
  );
}

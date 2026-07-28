import { PracticeImportReview } from "@/components/PracticeImportReview";

export const metadata = { title: "Import your caseload" };
export const dynamic = "force-dynamic";

export default function ImportPracticePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Matters → Import
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">Import your caseload</h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Your client folders already hold the matter number, the client, the practice area, and a
          dated paper trail. This reads them so your real cases enter the system without being
          retyped. Nothing is moved or changed on disk.
        </p>
      </header>

      <PracticeImportReview />
    </div>
  );
}

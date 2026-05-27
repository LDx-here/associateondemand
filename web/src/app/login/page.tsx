export default function LoginPlaceholder() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-24">
      <header>
        <p className="text-sm font-semibold text-slate-700">Authentication</p>
        <h1 className="text-2xl font-semibold text-slate-900">Login (placeholder)</h1>
        <p className="mt-2 text-sm text-slate-600">
          Real auth (Clerk / Supabase) ships in Phase 7. For Phase 0–1 you stay on trusted localhost.
        </p>
      </header>
      <button
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        type="button"
        disabled
      >
        Enter AssociateOnDemand (soon)
      </button>
    </main>
  );
}

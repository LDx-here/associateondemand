import { Link } from "wouter";
import { PublicNav } from "../NotFound";

export default function PathSelector() {
  return (
    <div>
      <PublicNav />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-semibold">How would you like to submit?</h1>
        <p className="mb-8 text-[var(--color-secondary)]">Choose the path that fits your workflow.</p>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card flex flex-col">
            <div className="mb-4 text-3xl">⚡</div>
            <h2 className="mb-2 text-lg font-semibold">Quick Upload</h2>
            <p className="mb-4 flex-1 text-sm text-[var(--color-secondary)]">
              Already have documents? Upload files, set a deadline, and go. Conflict check deferred.
            </p>
            <Link href="/associate/intake/quick" className="btn btn-primary">
              Get Started
            </Link>
          </div>
          <div className="card flex flex-col">
            <div className="mb-4 text-3xl">📋</div>
            <h2 className="mb-2 text-lg font-semibold">Guided Request</h2>
            <p className="mb-4 flex-1 text-sm text-[var(--color-secondary)]">
              Walk through conflict check, service selection, pricing, and payment step by step.
            </p>
            <Link href="/associate/intake/guided" className="btn btn-secondary">
              Walk Me Through It
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

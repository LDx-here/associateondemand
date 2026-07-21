import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { DashboardLayout } from "../../components/admin/DashboardLayout";

export default function FirmMemory() {
  const [firmId, setFirmId] = useState(1);
  const profile = trpc.firmMemory.getProfile.useQuery({ firmId });
  const samples = trpc.firmMemory.listSamples.useQuery({ firmId });
  const upsert = trpc.firmMemory.upsertProfile.useMutation({ onSuccess: () => profile.refetch() });

  return (
    <DashboardLayout title="Firm Memory">
      <div className="mb-4">
        <label className="label">Firm ID</label>
        <input className="input max-w-xs" type="number" value={firmId} onChange={(e) => setFirmId(Number(e.target.value))} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <h3 className="font-semibold">Style profile</h3>
          {profile.data ? (
            <dl className="space-y-1 text-sm">
              <div><dt className="font-medium">Tone</dt><dd>{profile.data.writingTone ?? "—"}</dd></div>
              <div><dt className="font-medium">Citations</dt><dd>{profile.data.citationStyle ?? "—"}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-[var(--color-secondary)]">No profile yet.</p>
          )}
          <button
            className="btn btn-secondary"
            onClick={() =>
              upsert.mutate({
                firmId,
                writingTone: "formal",
                citationStyle: "Bluebook",
                additionalNotes: "Default profile",
              })
            }
          >
            Create default profile
          </button>
        </div>
        <div className="card">
          <h3 className="mb-4 font-semibold">Samples</h3>
          <ul className="space-y-2 text-sm">
            {(samples.data ?? []).map((s) => (
              <li key={s.id}>{s.fileName}</li>
            ))}
            {(samples.data ?? []).length === 0 && <li className="text-[var(--color-secondary)]">No samples</li>}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}

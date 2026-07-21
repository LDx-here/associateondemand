import { useCallback, useState } from "react";
import { Link } from "wouter";
import { trpc } from "../../lib/trpc";
import { PublicNav } from "../NotFound";

type Step = 1 | 2 | 3;

export default function QuickUpload() {
  const [step, setStep] = useState<Step>(1);
  const [leadId, setLeadId] = useState<number | null>(null);
  const [form, setForm] = useState({
    firmName: "",
    attorneyName: "",
    email: "",
    phone: "",
    notes: "",
    deadline: "",
  });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const createLead = trpc.leads.create.useMutation();
  const updateSession = trpc.leads.updateSession.useMutation();

  const autosave = useCallback(
    (data: Record<string, unknown>, lastStep: string) => {
      if (!leadId) return;
      updateSession.mutate({ leadId, sessionData: data, lastStepCompleted: lastStep });
    },
    [leadId, updateSession]
  );

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const lead = await createLead.mutateAsync({
        ...form,
        intakePath: "quick_upload",
        referringPage: "/associate/intake/quick",
      });
      setLeadId(lead.id);
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save lead");
    }
  }

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    autosave({ ...form, path: "quick_upload" }, "upload");
    setStep(3);
  }

  function handleSubmit() {
    autosave({ ...form, path: "quick_upload", submitted: true }, "confirm");
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div>
        <PublicNav />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="mb-4 text-2xl font-semibold">Submission received</h1>
          <p className="text-[var(--color-secondary)]">
            RMV will review your upload and follow up at {form.email}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PublicNav />
      <div className="mx-auto max-w-xl px-4 py-8">
        <p className="mb-6 text-sm text-[var(--color-secondary)]">Quick Upload — Step {step} of 3</p>
        {error && <p className="mb-4 text-sm text-[var(--color-destructive)]">{error}</p>}

        {step === 1 && (
          <form onSubmit={handleStep1} className="card space-y-4">
            <h2 className="text-lg font-semibold">Firm Info</h2>
            {(["firmName", "attorneyName", "email", "phone"] as const).map((field) => (
              <div key={field}>
                <label className="label">{field === "firmName" ? "Firm Name" : field === "attorneyName" ? "Attorney Name" : field === "email" ? "Work Email" : "Phone"}</label>
                <input
                  className="input"
                  required={field !== "phone"}
                  type={field === "email" ? "email" : "text"}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                />
              </div>
            ))}
            <button type="submit" className="btn btn-primary w-full" disabled={createLead.isPending}>
              Continue
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="card space-y-4">
            <h2 className="text-lg font-semibold">Upload & Deadline</h2>
            <div>
              <label className="label">Files</label>
              <input type="file" multiple className="input" onChange={() => autosave(form, "files")} />
            </div>
            <div>
              <label className="label">Deadline</label>
              <input
                className="input"
                type="date"
                value={form.deadline}
                onChange={(e) => {
                  setForm({ ...form, deadline: e.target.value });
                  autosave({ ...form, deadline: e.target.value }, "deadline");
                }}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input min-h-24"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                onBlur={() => autosave(form, "notes")}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Continue
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold">Confirm</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt>Firm</dt><dd>{form.firmName}</dd></div>
              <div className="flex justify-between"><dt>Attorney</dt><dd>{form.attorneyName}</dd></div>
              <div className="flex justify-between"><dt>Email</dt><dd>{form.email}</dd></div>
              <div className="flex justify-between"><dt>Deadline</dt><dd>{form.deadline || "Flexible"}</dd></div>
            </dl>
            <button onClick={handleSubmit} className="btn btn-primary w-full">
              Submit
            </button>
          </div>
        )}

        <Link href="/associate/intake" className="mt-4 inline-block text-sm text-[var(--color-secondary)]">
          ← Back to path selection
        </Link>
      </div>
    </div>
  );
}

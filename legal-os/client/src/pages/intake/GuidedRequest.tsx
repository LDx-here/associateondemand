import { useCallback, useState } from "react";
import { Link } from "wouter";
import { trpc } from "../../lib/trpc";
import { PublicNav } from "../NotFound";

const STEPS = ["Firm Info", "Practice", "Conflict", "Service", "Details", "Upload", "Review"];

export default function GuidedRequest() {
  const [step, setStep] = useState(0);
  const [leadId, setLeadId] = useState<number | null>(null);
  const [conflictResult, setConflictResult] = useState<string | null>(null);
  const [form, setForm] = useState({
    firmName: "",
    attorneyName: "",
    email: "",
    phone: "",
    practiceArea: "",
    firmSize: "",
    urgency: "flexible" as "24h" | "48h" | "this_week" | "flexible",
    opposingParty: "",
    opposingCounsel: "",
    serviceId: 0,
    jurisdiction: "",
    caption: "",
    description: "",
    hasSamples: false,
  });
  const [error, setError] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const createLead = trpc.leads.create.useMutation();
  const updateSession = trpc.leads.updateSession.useMutation();
  const conflictCheck = trpc.conflicts.check.useMutation();
  const { data: services } = trpc.services.list.useQuery();
  const priceQuery = trpc.services.calculatePrice.useQuery(
    {
      serviceId: form.serviceId,
      urgency: form.urgency,
      hasFirmMemorySamples: form.hasSamples,
    },
    { enabled: form.serviceId > 0 }
  );
  const stripeConfigured = trpc.payments.isConfigured.useQuery();
  const checkout = trpc.payments.createCheckoutSession.useMutation();

  const autosave = useCallback(
    (data: Record<string, unknown>, lastStep: string) => {
      if (!leadId) return;
      updateSession.mutate({ leadId, sessionData: data, lastStepCompleted: lastStep });
    },
    [leadId, updateSession]
  );

  async function handleStep0(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const lead = await createLead.mutateAsync({
        firmName: form.firmName,
        attorneyName: form.attorneyName,
        email: form.email,
        phone: form.phone,
        intakePath: "guided_request",
        referringPage: "/associate/intake/guided",
      });
      setLeadId(lead.id);
      setStep(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleConflict() {
    const result = await conflictCheck.mutateAsync({
      opposingParty: form.opposingParty,
      opposingCounsel: form.opposingCounsel || undefined,
      leadId: leadId ?? undefined,
    });
    setConflictResult(result.result);
    autosave({ ...form, conflictResult: result.result }, "conflict");
    setStep(3);
  }

  async function handlePay() {
    autosave({ ...form, totalFee: priceQuery.data?.totalFee }, "review");
    if (stripeConfigured.data?.configured && form.serviceId) {
      try {
        const session = await checkout.mutateAsync({
          matterId: 1,
          amount: priceQuery.data?.totalFee,
        });
        window.location.href = session.checkoutUrl;
        return;
      } catch {
        // fall through to confirmation without payment
      }
    }
    setCheckoutUrl("confirmed");
  }

  if (checkoutUrl === "confirmed") {
    return (
      <div>
        <PublicNav />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="mb-4 text-2xl font-semibold">Request submitted</h1>
          <p className="text-[var(--color-secondary)]">
            {stripeConfigured.data?.configured
              ? "Payment processing — RMV will confirm shortly."
              : "Invoice after delivery — RMV will follow up at " + form.email}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PublicNav />
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-6 flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded ${i <= step ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"}`}
            />
          ))}
        </div>
        <p className="mb-4 text-sm">{STEPS[step]}</p>
        {error && <p className="mb-4 text-sm text-[var(--color-destructive)]">{error}</p>}

        {step === 0 && (
          <form onSubmit={handleStep0} className="card space-y-4">
            {(["firmName", "attorneyName", "email", "phone"] as const).map((f) => (
              <div key={f}>
                <label className="label capitalize">{f.replace(/([A-Z])/g, " $1")}</label>
                <input
                  className="input"
                  required={f !== "phone"}
                  value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                />
              </div>
            ))}
            <button type="submit" className="btn btn-primary w-full">Continue</button>
          </form>
        )}

        {step === 1 && (
          <div className="card space-y-4">
            <div>
              <label className="label">Practice area</label>
              <input className="input" value={form.practiceArea} onChange={(e) => setForm({ ...form, practiceArea: e.target.value })} onBlur={() => autosave(form, "practice")} />
            </div>
            <div>
              <label className="label">Firm size</label>
              <select className="input" value={form.firmSize} onChange={(e) => setForm({ ...form, firmSize: e.target.value })}>
                <option value="">Select</option>
                <option>Solo</option>
                <option>2-5</option>
                <option>6-20</option>
                <option>20+</option>
              </select>
            </div>
            <div>
              <label className="label">Urgency</label>
              <select className="input" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as typeof form.urgency })}>
                <option value="24h">24 hours</option>
                <option value="48h">48 hours</option>
                <option value="this_week">This week</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.hasSamples} onChange={(e) => setForm({ ...form, hasSamples: e.target.checked })} />
              Firm Memory samples available (10% discount)
            </label>
            <button className="btn btn-primary w-full" onClick={() => { autosave(form, "practice"); setStep(2); }}>Continue</button>
          </div>
        )}

        {step === 2 && (
          <div className="card space-y-4">
            <div>
              <label className="label">Opposing Party *</label>
              <input className="input" required value={form.opposingParty} onChange={(e) => setForm({ ...form, opposingParty: e.target.value })} />
            </div>
            <div>
              <label className="label">Opposing Counsel</label>
              <input className="input" value={form.opposingCounsel} onChange={(e) => setForm({ ...form, opposingCounsel: e.target.value })} />
            </div>
            <button className="btn btn-primary w-full" onClick={handleConflict} disabled={conflictCheck.isPending}>
              Run conflict check
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="card space-y-4">
            {conflictResult && (
              <div className={`badge ${conflictResult === "clear" ? "badge-accent" : "bg-amber-100 text-amber-800"}`}>
                Conflict: {conflictResult === "clear" ? "Clear" : "Review required"}
              </div>
            )}
            <div>
              <label className="label">Service</label>
              <select className="input" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: Number(e.target.value) })}>
                <option value={0}>Select service</option>
                {(services ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — ${Number(s.baseFee)}</option>
                ))}
              </select>
            </div>
            {priceQuery.data && (
              <div className="rounded-lg bg-[var(--color-muted)] p-4 text-sm">
                <p>Base: ${priceQuery.data.baseFee}</p>
                <p>Urgency ×{priceQuery.data.urgencyMultiplier}</p>
                {priceQuery.data.sampleDiscount > 0 && <p>Sample discount: {(priceQuery.data.sampleDiscount * 100).toFixed(0)}%</p>}
                <p className="mt-2 text-lg font-semibold">Total: ${priceQuery.data.totalFee}</p>
              </div>
            )}
            <button className="btn btn-primary w-full" onClick={() => { autosave(form, "service"); setStep(4); }}>Continue</button>
          </div>
        )}

        {step === 4 && (
          <div className="card space-y-4">
            {(["jurisdiction", "caption", "description"] as const).map((f) => (
              <div key={f}>
                <label className="label capitalize">{f}</label>
                {f === "description" ? (
                  <textarea className="input min-h-24" value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} onBlur={() => autosave(form, "details")} />
                ) : (
                  <input className="input" value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} onBlur={() => autosave(form, "details")} />
                )}
              </div>
            ))}
            <button className="btn btn-primary w-full" onClick={() => setStep(5)}>Continue</button>
          </div>
        )}

        {step === 5 && (
          <div className="card space-y-4">
            <label className="label">Documents</label>
            <input type="file" multiple className="input" />
            <button className="btn btn-primary w-full" onClick={() => { autosave(form, "upload"); setStep(6); }}>Continue</button>
          </div>
        )}

        {step === 6 && (
          <div className="card space-y-4">
            <h2 className="font-semibold">Review & Pay</h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt>Firm</dt><dd>{form.firmName}</dd></div>
              <div className="flex justify-between"><dt>Service</dt><dd>{services?.find((s) => s.id === form.serviceId)?.name}</dd></div>
              <div className="flex justify-between"><dt>Total</dt><dd>${priceQuery.data?.totalFee ?? "—"}</dd></div>
            </dl>
            {!stripeConfigured.data?.configured && (
              <p className="text-xs text-[var(--color-secondary)]">Stripe not configured — invoice after delivery.</p>
            )}
            <button className="btn btn-primary w-full" onClick={handlePay}>
              {stripeConfigured.data?.configured ? "Accept & Pay" : "Accept & Submit"}
            </button>
          </div>
        )}

        <Link href="/associate/intake" className="mt-4 inline-block text-sm text-[var(--color-secondary)]">← Back</Link>
      </div>
    </div>
  );
}

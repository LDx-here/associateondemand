import { Link } from "wouter";
import { PublicNav, ServicesGrid } from "./NotFound";

const FAQ = [
  {
    q: "Who is this service for?",
    a: "Managing partners and attorneys at solo and small firms who need overflow drafting capacity without hiring a full-time associate.",
  },
  {
    q: "What deliverables can you produce?",
    a: "Motions, briefs, research memos, discovery responses, immigration petitions, demand letters, and more — see our service catalog.",
  },
  {
    q: "How does Firm Memory work?",
    a: "Upload sample work from your firm. Our drafting agents analyze tone, citation style, and formatting to match your firm's voice.",
  },
  {
    q: "Is there a conflict check?",
    a: "Yes. Guided intake includes an automated conflict screen. Results are always review_required or clear — never auto-rejected.",
  },
  {
    q: "Who verifies the work?",
    a: "La'Dajia Ferguson, Esq. (Recover My Value) verifies all deliverables in Phase 0–2.",
  },
  {
    q: "How fast is turnaround?",
    a: "Standard turnaround varies by deliverable (2–14 business days). Rush options available at intake.",
  },
  {
    q: "Do you integrate with Clio?",
    a: "Clio integration is available when configured with a paying Clio subscription — contact RMV to enable.",
  },
  {
    q: "How is pricing determined?",
    a: "Flat fees per service type with urgency multipliers and a sample discount when Firm Memory samples are provided.",
  },
  {
    q: "Is payment required upfront?",
    a: "Guided intake supports Stripe checkout when configured. Otherwise invoice-after-delivery applies.",
  },
  {
    q: "What jurisdictions do you cover?",
    a: "Federal and state civil litigation, immigration, and PI — jurisdiction captured during intake.",
  },
];

export default function Associate() {
  return (
    <div>
      <PublicNav />

      {/* Hero */}
      <section className="bg-[var(--color-primary)] px-4 py-20 text-[var(--color-primary-foreground)]">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">An Associate Attorney. Without Hiring One.</h1>
          <p className="mb-8 text-lg opacity-90">
            Verified overflow counsel for law firms — associate-quality drafting in your firm's style.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/associate/intake/quick" className="btn bg-white text-[var(--color-primary)]">
              Quick Upload
            </Link>
            <Link href="/associate/intake/guided" className="btn border border-white/30 bg-transparent text-white">
              Guided Request
            </Link>
          </div>
        </div>
      </section>

      {/* Credibility */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="mb-6 text-2xl font-semibold">Meet Your Associate</h2>
        <div className="card">
          <p className="text-lg font-medium">La'Dajia Ferguson, Esq.</p>
          <p className="mt-2 text-[var(--color-secondary)]">
            Founder of Recover My Value. La'Dajia personally verifies every deliverable, ensuring associate-quality
            work that matches your firm's standards — not generic AI output.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[var(--color-muted)] px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-semibold">How It Works</h2>
          <div className="grid gap-6 md:grid-cols-4">
            {["Submit", "Conflict Check", "Draft", "Deliver"].map((step, i) => (
              <div key={step} className="card text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                  {i + 1}
                </div>
                <h3 className="font-semibold">{step}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-2xl font-semibold">Services & Starting Prices</h2>
        <ServicesGrid />
      </section>

      {/* Firm Memory */}
      <section className="bg-[var(--color-muted)] px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-2xl font-semibold">Firm Memory</h2>
          <p className="text-[var(--color-secondary)]">
            Upload prior work samples and our drafting agents learn your tone, citation style, and formatting. Output
            reads like it came from your own associate — plus a 10% discount when samples are provided at intake.
          </p>
        </div>
      </section>

      {/* Who We Serve */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="mb-6 text-2xl font-semibold">Who We Serve</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            "Solo practitioners needing overflow capacity",
            "Small litigation firms with deadline spikes",
            "Immigration practices with RFE/petition backlogs",
            "PI firms needing demand letters and motions",
          ].map((t) => (
            <div key={t} className="card text-sm">
              {t}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[var(--color-muted)] px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-2xl font-semibold">FAQ</h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="card">
                <summary className="cursor-pointer font-medium">{q}</summary>
                <p className="mt-2 text-sm text-[var(--color-secondary)]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 text-center">
        <h2 className="mb-4 text-2xl font-semibold">Ready to add capacity?</h2>
        <Link href="/associate/intake" className="btn btn-primary">
          Start your request
        </Link>
      </section>
    </div>
  );
}

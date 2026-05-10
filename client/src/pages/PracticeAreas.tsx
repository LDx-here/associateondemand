import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link, useLocation } from "wouter";
import { Scale, Shield, Globe, ArrowRight, CheckCircle } from "lucide-react";

const areas = {
  "/property-damage": { icon: Scale, title: "Property Damage", subtitle: "Diminished Value · Total Loss · Loss of Use", description: "Most firms decline property-damage-only matters, leaving drivers to navigate complex insurance disputes alone. Recover My Value™ was built to fill that gap.", points: ["Diminished value claims — your car loses market value even after repairs", "Total loss disputes — challenge lowball valuations with data", "Loss of use compensation — you don't need to rent a car to claim it", "Underpayment claims — hold insurers accountable for what they owe"], cta: "If your vehicle was damaged in an accident and you believe the insurance company isn't paying what's fair, a strategy call can help you understand your options." },
  "/personal-injury": { icon: Shield, title: "Personal Injury", subtitle: "Ohio Representation", description: "When an accident affects your health and livelihood, you deserve an advocate who understands the full picture — from the crash scene to the settlement table.", points: ["Comprehensive case evaluation and strategy", "Medical documentation coordination", "Insurance company negotiations", "Litigation support when settlement isn't fair"], cta: "As Of Counsel to Paulozzi, Alkire, Condeni Personal Injury Lawyers, La'Dajia brings both boutique focus and the depth of an established litigation firm." },
  "/immigration": { icon: Globe, title: "Immigration", subtitle: "Family · Visas · Naturalization", description: "Navigating the immigration system is complex and high-stakes. We provide clear, structured guidance to help you and your family move forward with confidence.", points: ["Family-based immigration petitions", "Visa applications and renewals", "Naturalization and citizenship", "Humanitarian relief and asylum"], cta: "As a Contract Attorney at the International Institute of Akron, La'Dajia provides immigration legal services to refugees and immigrants in the community." },
  "/services": { icon: Scale, title: "Our Services", subtitle: "Strategy Calls · Representation · Advocacy", description: "Whether you need a one-time strategy session or full legal representation, we offer flexible paths forward.", points: ["Claims Strategy Assessment — understand your position", "Document interpretation — make sense of confusing paperwork", "Full representation (Ohio) — we handle everything", "Nationwide advocacy — guidance regardless of location"], cta: "Every engagement starts with a strategy call. You'll leave with clarity on your situation and a roadmap for next steps." },
};

export default function PracticeAreas() {
  const [location] = useLocation();
  const area = areas[location as keyof typeof areas] || areas["/services"];
  const Icon = area.icon;

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="pt-24 pb-16 bg-white">
        <div className="container">
          <div className="flex items-center gap-2 mb-4"><div className="w-8 h-0.5 bg-teal" /><span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">{area.subtitle}</span></div>
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6"><Icon className="w-10 h-10 text-teal" /><h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">{area.title}</h1></div>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">{area.description}</p>
              <ul className="space-y-4 mb-8">
                {area.points.map((point) => (
                  <li key={point} className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-teal mt-0.5 shrink-0" /><span className="text-foreground/80 leading-relaxed">{point}</span></li>
                ))}
              </ul>
              <p className="text-muted-foreground leading-relaxed mb-8 bg-secondary/50 p-5 rounded-lg border border-border">{area.cta}</p>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-6 py-3 rounded-md font-semibold transition-colors">Book a Strategy Call<ArrowRight className="w-4 h-4" /></Link>
            </div>
            <div className="space-y-6">
              <div className="bg-navy rounded-lg p-6 text-white">
                <h3 className="font-display font-semibold mb-4">All Practice Areas</h3>
                <ul className="space-y-3">
                  {Object.entries(areas).filter(([k]) => k !== "/services").map(([href, a]) => (
                    <li key={href}><Link href={href} className={`text-sm hover:text-teal transition-colors ${location === href ? "text-teal font-semibold" : "text-white/70"}`}>{a.title}</Link></li>
                  ))}
                </ul>
              </div>
              <div className="bg-teal/5 border border-teal/20 rounded-lg p-5">
                <h4 className="font-semibold text-foreground text-sm mb-2">Not sure where to start?</h4>
                <p className="text-xs text-muted-foreground mb-3">A strategy call helps you understand your situation regardless of practice area.</p>
                <Link href="/contact" className="text-sm font-semibold text-teal">Get started →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

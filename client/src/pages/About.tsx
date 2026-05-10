import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-12 bg-white">
        <div className="container">
          <div className="flex items-center gap-2 mb-4"><div className="w-8 h-0.5 bg-teal" /><span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">About</span></div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-2">La'Dajia Ferguson, Esq.</h1>
          <p className="text-muted-foreground max-w-2xl">Ohio attorney. Founder of Recover My Value™. Advocate for drivers, injury victims, and families navigating complex legal systems.</p>
        </div>
      </section>

      {/* Bio with photos */}
      <section className="py-12 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-5 gap-12">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <img src="/manus-storage/ladajia-headshot2_216cb1df.png" alt="La'Dajia Ferguson, Esq." className="w-full rounded-lg shadow-md" />
                <div className="relative">
                  <img src="/manus-storage/ladajia-jd_94d622c2.jpg" alt="La'Dajia Ferguson — Juris Doctor" className="w-full rounded-lg shadow-md" />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">Juris Doctor</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mb-6">
                {["Ohio Bar Admitted", "Of Counsel — Paulozzi, Alkire, Condeni", "International Institute of Akron", "Nationwide Advocacy"].map((badge) => (
                  <span key={badge} className="flex items-center gap-1.5 bg-secondary/50 border border-border rounded-full px-3 py-1.5 text-xs text-foreground/80"><CheckCircle className="w-3 h-3 text-teal" />{badge}</span>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="flex items-center gap-2 mb-4"><div className="w-8 h-0.5 bg-teal" /><span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">About La'Dajia</span></div>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">La'Dajia Ferguson, Esq. is an Ohio-licensed attorney and the founder of Recover My Value™ — a firm built to fill a gap that most traditional practices ignore. Property damage claims are routinely declined by larger firms, leaving drivers to navigate complex insurance disputes alone. La'Dajia built Recover My Value™ to change that.</p>
                <p className="text-muted-foreground leading-relaxed">Her practice spans property damage, personal injury, and immigration — three areas where clients often find themselves at their most vulnerable, facing systems designed to minimize what they receive. La'Dajia's approach is built on the same principles across all three: clarity, structure, and genuine advocacy.</p>
                <p className="text-muted-foreground leading-relaxed">As Of Counsel to Paulozzi, Alkire, Condeni Personal Injury Lawyers, she brings both the focused attention of a boutique specialist and the collaborative depth of an established litigation firm. As a Contract Attorney with the International Institute of Akron, her immigration practice is grounded in real community work alongside the people the system directly affects.</p>
              </div>
              <div className="mt-6 border-l-4 border-teal pl-5 py-2">
                <blockquote className="font-display text-lg text-foreground italic leading-relaxed">“My pursuit is to take the stress, uncertainty, and time burden off your shoulders so you can navigate your dispute with confidence and support.”</blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ohio Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0"><img src="/manus-storage/ohio-autumn_3a3f3de9.png" alt="" className="w-full h-full object-cover" /></div>
        <div className="absolute inset-0 bg-navy/80" />
        <div className="container relative z-10">
          <span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">Ohio</span>
          <h2 className="font-display text-3xl font-bold text-white mt-2 mb-4">“Rooted in Ohio. Present for your journey.”</h2>
          <p className="text-white/70 max-w-2xl leading-relaxed">Remote practice. Real relationships. Whether you're in Akron, Cleveland, or anywhere across the country — we meet you where you are. La'Dajia's connection to Ohio isn't just professional — it's personal.</p>
        </div>
      </section>

      {/* Paulozzi Section */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img src="/manus-storage/paulozzi-meeting_7450c403.png" alt="La'Dajia in a collaborative meeting with the Paulozzi firm" className="w-full rounded-lg shadow-md" />
              <p className="text-xs text-muted-foreground mt-2 italic">La'Dajia (far right) in a collaborative session with the Paulozzi, Alkire, Condeni team</p>
            </div>
            <div>
              <span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">Of Counsel</span>
              <h2 className="font-display text-2xl font-bold text-foreground mt-2 mb-4">Paulozzi, Alkire, Condeni Personal Injury Lawyers</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">In her Of Counsel role, La'Dajia supports the firm's property damage matters and collaborates with experienced litigators on select disputes. This relationship gives her clients access to a full litigation team when cases require it.</p>
              <p className="text-muted-foreground leading-relaxed mb-6">For clients whose property damage claims intersect with personal injury, this dual perspective is invaluable — ensuring that resolving the vehicle claim cleanly protects and strengthens the injury case.</p>
              <ul className="space-y-3">
                {["Collaborative approach to complex multi-claim cases", "Access to experienced personal injury litigators", "Coordinated strategy across property damage and injury"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5"><CheckCircle className="w-4 h-4 text-teal mt-0.5 shrink-0" /><span className="text-foreground/80 text-sm">{item}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-navy">
        <div className="container text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">Ready to Work Together?</h2>
          <p className="text-white/70 max-w-xl mx-auto mb-8">Whether you're dealing with a property damage dispute, a personal injury matter, or an immigration question — La'Dajia is here to give you clarity and a clear path forward.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/contact" className="inline-flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-6 py-3 rounded-md font-semibold transition-colors">Schedule a Consultation<ArrowRight className="w-4 h-4" /></Link>
            <a href="tel:3303331430" className="inline-flex items-center gap-2 border border-white/30 text-white px-6 py-3 rounded-md font-medium hover:bg-white/5 transition-colors">(330) 333-1430</a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="pt-24 pb-16 bg-white">
        <div className="container">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-0.5 bg-teal" />
            <span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">About</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-8">La'Dajia Ferguson, Esq.</h1>
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
              <p className="text-muted-foreground leading-relaxed text-lg">La'Dajia is an Ohio-licensed attorney who built Recover My Value™ to fill a real gap: most firms decline property-damage-only matters, leaving drivers to navigate complex insurance disputes alone.</p>
              <p className="text-muted-foreground leading-relaxed">As Of Counsel to Paulozzi, Alkire, Condeni Personal Injury Lawyers, she brings both specialized boutique focus and the collaborative depth of an established litigation firm. Her practice spans property damage, personal injury, and immigration.</p>
              <p className="text-muted-foreground leading-relaxed">La'Dajia also serves as a Contract Attorney at the International Institute of Akron, providing immigration legal services to refugees and immigrants in the Akron community.</p>
              <h3 className="font-display text-xl font-semibold text-foreground pt-4">Practice Focus</h3>
              <ul className="space-y-3">
                {["Property damage — diminished value, total loss & loss of use", "Personal injury representation (Ohio)", "Immigration law — family, visas, naturalization", "Nationwide advocacy & claims strategy"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5"><CheckCircle className="w-4 h-4 text-teal mt-0.5 shrink-0" /><span className="text-foreground/80">{item}</span></li>
                ))}
              </ul>
              <h3 className="font-display text-xl font-semibold text-foreground pt-4">Education & Credentials</h3>
              <ul className="space-y-3">
                {["Ohio Bar Admitted", "Of Counsel — Paulozzi, Alkire, Condeni Personal Injury Lawyers", "Contract Attorney — International Institute of Akron"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5"><CheckCircle className="w-4 h-4 text-teal mt-0.5 shrink-0" /><span className="text-foreground/80">{item}</span></li>
                ))}
              </ul>
            </div>
            <div className="space-y-6">
              <div className="bg-secondary/50 rounded-lg p-6 border border-border">
                <blockquote className="font-display text-lg text-foreground italic leading-relaxed">"My pursuit is to take the stress, uncertainty, and time burden off your shoulders so you can navigate your dispute with confidence and support."</blockquote>
                <p className="text-sm text-muted-foreground mt-4">— La'Dajia Ferguson, Esq.</p>
              </div>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-6 py-3 rounded-md font-semibold transition-colors w-full justify-center">Book a Strategy Call<ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

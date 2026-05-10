import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { Phone, ArrowRight, CheckCircle, Scale, Shield, Globe, Play, ExternalLink } from "lucide-react";
import { useState } from "react";

function VideoSection() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const videos = [
    { id: "l5h22vm9n14", title: "Loss of Use Explained", subtitle: "How to Calculate Your Property Damage Claim", duration: "6:35" },
    { id: "ZFKTJlORsmY", title: "Why Insurers Deny Diminished Value Claims First", subtitle: "And What That Means for You", duration: "8:16" },
    { id: "E-QDO0mbTB0", title: "Why Your DV Claim Was Denied", subtitle: "Understanding the Insurer's Playbook", duration: "5:44" },
  ];

  return (
    <section className="py-20 bg-navy">
      <div className="container">
        <div className="flex items-center gap-2 mb-4"><div className="w-8 h-0.5 bg-teal" /><span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">Real Guidance. Real Attorney.</span></div>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">Watch La'Dajia Break Down Your Rights</h2>
        <p className="text-white/70 max-w-2xl mb-4 leading-relaxed">Insurance companies count on you not knowing your rights. These videos cut through the confusion — explaining exactly what adjusters do, why claims get denied, and what you can do about it.</p>
        <blockquote className="text-white/60 italic text-sm mb-8 border-l-2 border-teal pl-4">“My pursuit is to take the stress, uncertainty, and time burden off your shoulders so you can navigate your dispute with confidence and support.”<br/><span className="text-white/40 not-italic">— La'Dajia Ferguson, Esq.</span></blockquote>
        <a href="https://www.youtube.com/@RecoverMyValue" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-teal text-sm font-semibold mb-8 hover:text-teal-dark"><ExternalLink className="w-4 h-4" />View All Videos on YouTube</a>

        {activeVideo && (
          <div className="mb-8 rounded-lg overflow-hidden aspect-video">
            <iframe src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`} title="Video" className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {videos.map((v) => (
            <button key={v.id} onClick={() => setActiveVideo(v.id)} className="group relative rounded-lg overflow-hidden text-left">
              <img src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`} alt={v.title} className="w-full aspect-video object-cover" />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-teal/90 flex items-center justify-center"><Play className="w-5 h-5 text-white ml-0.5" /></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80">
                <span className="text-white/60 text-xs">{v.duration}</span>
                <h4 className="text-white text-sm font-semibold mt-1">{v.title}</h4>
                <p className="text-white/60 text-xs mt-0.5">{v.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center bg-navy overflow-hidden pt-16">
        <div className="absolute inset-0"><img src="/manus-storage/hero-bg_38275e6a.webp" alt="" className="w-full h-full object-cover" /></div>
        <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/80 to-navy/40" />
        <div className="container relative z-10 py-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-0.5 bg-teal" />
              <span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">Ohio Attorney · Nationwide Advocacy</span>
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6">Recover What's Rightfully Yours.</h1>
            <p className="text-white/80 text-lg leading-relaxed mb-8 max-w-xl">La'Dajia Ferguson, Esq. advocates for what you are rightfully owed — whether that's fair compensation after an accident, justice for a personal injury, or a clear path through the immigration system. You deserve an advocate who fights for the full picture.</p>
            <div className="flex flex-wrap gap-3 mb-8">
              {["Ohio Bar Admitted", "Of Counsel — Paulozzi, Alkire, Condeni", "Contract Attorney — Int'l Institute of Akron", "Nationwide Advocacy"].map((badge) => (
                <span key={badge} className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 text-xs text-white/90">
                  <CheckCircle className="w-3 h-3 text-teal" />{badge}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/contact" className="inline-flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-6 py-3 rounded-md font-semibold transition-colors">Book a Strategy Call<ArrowRight className="w-4 h-4" /></Link>
              <a href="tel:3303331430" className="inline-flex items-center gap-2 border border-white/30 text-white px-6 py-3 rounded-md font-medium hover:bg-white/5 transition-colors"><Phone className="w-4 h-4" />(330) 333-1430</a>
            </div>
          </div>
        </div>
      </section>

      {/* Attorney Bio */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="flex items-center gap-2 mb-4"><div className="w-8 h-0.5 bg-teal" /><span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">Meet Your Attorney</span></div>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <img src="/manus-storage/ladajia-navy_0ee5c8ed.jpg" alt="La'Dajia Ferguson, Esq." className="w-full rounded-lg mb-8 shadow-lg" />
            </div>
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">La'Dajia Ferguson, Esq.</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">La'Dajia is an Ohio-licensed attorney who built Recover My Value™ to fill a real gap: most firms decline property-damage-only matters, leaving drivers to navigate complex insurance disputes alone.</p>
              <p className="text-muted-foreground leading-relaxed mb-8">As Of Counsel to Paulozzi, Alkire, Condeni Personal Injury Lawyers, she brings both specialized boutique focus and the collaborative depth of an established litigation firm. Her practice spans property damage, personal injury, and immigration.</p>
              <ul className="space-y-3 mb-8">
                {["Property damage — diminished value, total loss & loss of use", "Personal injury representation (Ohio)", "Immigration law — family, visas, naturalization", "Nationwide advocacy & claims strategy"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5"><CheckCircle className="w-4 h-4 text-teal mt-0.5 shrink-0" /><span className="text-sm text-foreground/80">{item}</span></li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-6"><Link href="/about" className="text-sm font-semibold text-teal hover:text-teal-dark">Full Bio →</Link><Link href="/contact" className="text-sm font-semibold text-teal hover:text-teal-dark">Schedule a Consultation →</Link></div>
            </div>
          </div>
          <div className="mt-12">
            <img src="/manus-storage/paulozzi-team_f6335e5b.webp" alt="Paulozzi, Alkire, Condeni team" className="w-full rounded-lg" />
            <p className="text-sm text-muted-foreground italic mt-3">Of Counsel — Paulozzi, Alkire, Condeni Personal Injury Lawyers</p>
          </div>
        </div>
      </section>

      {/* Practice Areas */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="flex items-center gap-2 mb-4"><div className="w-8 h-0.5 bg-teal" /><span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">How We Can Help</span></div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-12">Practice Areas</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[{img: "/manus-storage/property-damage_6e4fad39.webp", title: "Property Damage", description: "Diminished value, total loss disputes, loss of use, and underpayment claims. We bring order and strategy to complex insurance disputes so you can move forward.", href: "/property-damage"}, {img: "/manus-storage/personal-injury_80dea202.webp", title: "Personal Injury", description: "When an accident affects your health and livelihood, you deserve an advocate who understands the full picture — from the crash scene to the settlement table.", href: "/personal-injury"}, {img: "/manus-storage/immigration_a3c7516c.webp", title: "Immigration", description: "Navigating the immigration system is complex and high-stakes. We provide clear, structured guidance to help you and your family move forward with confidence.", href: "/immigration"}].map((area) => (
              <Link key={area.title} href={area.href} className="group bg-white rounded-lg overflow-hidden border border-border hover:border-teal/30 hover:shadow-lg transition-all">
                <img src={area.img} alt={area.title} className="w-full h-48 object-cover" />
                <div className="p-6">
                  <h3 className="font-display text-xl font-semibold text-foreground mb-3 group-hover:text-teal transition-colors">{area.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{area.description}</p>
                  <span className="text-sm font-semibold text-teal">Learn more →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Video Section */}
      <VideoSection />

      {/* Testimonial */}
      <section className="py-16 bg-white">
        <div className="container max-w-3xl text-center">
          <blockquote className="font-display text-xl md:text-2xl text-foreground italic leading-relaxed">"I had no idea diminished value was even something I could claim. La'Dajia explained everything simply and walked me through exactly what to submit. I ended up recovering over $2,000 I wouldn't have known to ask for."</blockquote>
          <p className="text-muted-foreground mt-6">— M., Diminished Value Client</p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="flex items-center gap-2 mb-4"><div className="w-8 h-0.5 bg-teal" /><span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">The Process</span></div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[{step: "01", title: "Book a Strategy Call", description: "A focused session to review your situation, interpret confusing documents, and identify realistic next steps."}, {step: "02", title: "Receive Your Roadmap", description: "You'll leave with a clear picture of what the insurer has decided, what leverage you have, and which path forward is worth your time."}, {step: "03", title: "Choose Your Path", description: "Proceed independently with your roadmap, or engage La'Dajia for full representation — available in Ohio."}].map((item) => (
              <div key={item.step}>
                <span className="text-5xl font-display font-bold text-teal/20 mb-2 block">{item.step}</span>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center"><Link href="/contact" className="inline-flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-6 py-3 rounded-md font-semibold transition-colors">Start with a Strategy Call<ArrowRight className="w-4 h-4" /></Link></div>
        </div>
      </section>

      {/* Blog Preview */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="flex items-center justify-between mb-12">
            <div><div className="flex items-center gap-2 mb-4"><div className="w-8 h-0.5 bg-teal" /><span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">Know Your Rights</span></div><h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Property Damage Insights</h2></div>
            <Link href="/blog" className="hidden md:inline-flex text-sm font-semibold text-teal hover:text-teal-dark">View all articles →</Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[{category: "Diminished Value", title: "What Is Diminished Value and Why Insurers Don't Want You to Know", excerpt: "After an accident, your car loses market value even after repairs. Here's how to claim what you're owed.", readTime: "5 min read"}, {category: "Total Loss", title: "How to Fight a Total Loss Valuation You Disagree With", excerpt: "Insurance companies use algorithms to value your totaled car. Those numbers aren't always accurate — and you can challenge them.", readTime: "7 min read"}, {category: "Loss of Use", title: "Loss of Use: You Don't Need to Rent a Car to Claim It", excerpt: "One of the biggest myths in property damage law. You have a legal right to loss-of-use compensation regardless of whether you rented a vehicle.", readTime: "4 min read"}].map((post) => (
              <Link key={post.title} href="/blog" className="group bg-white rounded-lg overflow-hidden border border-border hover:border-teal/30 hover:shadow-lg transition-all">
                <div className="p-6">
                  <span className="text-xs font-semibold text-teal uppercase tracking-wider">{post.category}</span>
                  <h3 className="font-display text-lg font-semibold text-foreground mt-2 mb-3 group-hover:text-teal transition-colors leading-snug">{post.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{post.excerpt}</p>
                  <span className="text-xs text-muted-foreground">{post.readTime}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-navy">
        <div className="container text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">Ready to Understand Your Claim?</h2>
          <p className="text-white/70 max-w-xl mx-auto mb-8 leading-relaxed">A strategy call gives you clarity on what the insurer has actually decided, what your options are, and what's worth your time.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/contact" className="inline-flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-6 py-3 rounded-md font-semibold transition-colors">Book a Strategy Call<ArrowRight className="w-4 h-4" /></Link>
            <a href="tel:3303331430" className="inline-flex items-center gap-2 border border-white/30 text-white px-6 py-3 rounded-md font-medium hover:bg-white/5 transition-colors"><Phone className="w-4 h-4" />(330) 333-1430</a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

import { Link } from "wouter";
import { Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="mb-4">
              <span className="font-display text-xl font-bold tracking-tight">
                RECOVER
              </span>
              <span className="text-[10px] text-white/60 ml-1">MY VALUE</span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              Clarity, strategy, and advocacy for drivers navigating complex
              insurance disputes. Nationwide advocacy. Legal representation in
              Ohio.
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-4 text-sm uppercase tracking-widest">
              Practice Areas
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/property-damage" className="text-sm text-white/70 hover:text-teal transition-colors">
                  Property Damage
                </Link>
              </li>
              <li>
                <Link href="/property-damage" className="text-sm text-white/70 hover:text-teal transition-colors">
                  Diminished Value
                </Link>
              </li>
              <li>
                <Link href="/property-damage" className="text-sm text-white/70 hover:text-teal transition-colors">
                  Total Loss Claims
                </Link>
              </li>
              <li>
                <Link href="/personal-injury" className="text-sm text-white/70 hover:text-teal transition-colors">
                  Personal Injury
                </Link>
              </li>
              <li>
                <Link href="/immigration" className="text-sm text-white/70 hover:text-teal transition-colors">
                  Immigration
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-4 text-sm uppercase tracking-widest">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/about" className="text-sm text-white/70 hover:text-teal transition-colors">
                  About La'Dajia
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-white/70 hover:text-teal transition-colors">
                  Property Damage Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-white/70 hover:text-teal transition-colors">
                  Book a Strategy Call
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-white/70 hover:text-teal transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-4 text-sm uppercase tracking-widest">
              Contact
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="tel:3303331430"
                  className="flex items-center gap-2.5 text-sm text-white/70 hover:text-teal transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  (330) 333-1430
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@recovermyvalue.com"
                  className="flex items-center gap-2.5 text-sm text-white/70 hover:text-teal transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  support@recovermyvalue.com
                </a>
              </li>
            </ul>
            <div className="mt-5 p-3 bg-white/5 rounded-sm border border-white/10">
              <p className="text-xs text-white/50 leading-relaxed">
                Remote practice. Serving clients nationwide. Legal
                representation limited to Ohio.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container py-6">
          <p className="text-xs text-white/40 leading-relaxed mb-3">
            <strong className="text-white/60">Attorney Advertising.</strong>{" "}
            Kingdom Counsel Firm d/b/a Recover My Value™. The information on
            this website is for general informational purposes only and does not
            constitute legal advice. No attorney-client relationship is formed by
            use of this site. Legal representation is available only after a
            written engagement agreement is signed. Legal services are limited to
            Ohio.
          </p>
          <p className="text-xs text-white/40">
            © 2026 Recover My Value™ · Kingdom Counsel Firm LLC · All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

import { Link, useLocation } from "wouter";
import { Phone, Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/property-damage", label: "Property Damage" },
  { href: "/personal-injury", label: "Personal Injury" },
  { href: "/immigration", label: "Immigration" },
  { href: "/services", label: "Services" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/50">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center">
          <img src="/manus-storage/rmv-logo_bc5c210d.webp" alt="Recover My Value" className="h-8" />
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-teal ${
                location === link.href
                  ? "text-teal"
                  : "text-foreground/80"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <a
            href="tel:3303331430"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-teal transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            (330) 333-1430
          </a>
          <Link
            href="/contact"
            className="bg-teal hover:bg-teal-dark text-white px-5 py-2 rounded-md text-sm font-semibold transition-colors"
          >
            Book a Strategy Call
          </Link>
        </div>

        <button
          className="lg:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-border/50 py-4">
          <nav className="container flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium py-1 ${
                  location === link.href ? "text-teal" : "text-foreground/80"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="tel:3303331430"
              className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 py-1"
            >
              <Phone className="w-3.5 h-3.5" />
              (330) 333-1430
            </a>
            <Link
              href="/contact"
              className="bg-teal text-white px-5 py-2.5 rounded-md text-sm font-semibold text-center mt-2"
              onClick={() => setMobileOpen(false)}
            >
              Book a Strategy Call
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

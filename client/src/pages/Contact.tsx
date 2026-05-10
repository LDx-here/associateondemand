import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Phone, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Contact() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", state: "",
    practiceArea: "", inquiryType: "general", description: "", newsletterOptIn: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const submitLead = trpc.leads.submit.useMutation({
    onSuccess: () => { setSubmitted(true); toast.success("Inquiry submitted successfully!"); },
    onError: (err) => { toast.error(err.message || "Failed to submit. Please try again."); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitLead.mutate(form);
  };

  if (submitted) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <section className="pt-24 pb-16 bg-white">
          <div className="container max-w-2xl text-center py-20">
            <CheckCircle className="w-16 h-16 text-teal mx-auto mb-6" />
            <h1 className="font-display text-3xl font-bold text-foreground mb-4">Thank You</h1>
            <p className="text-muted-foreground leading-relaxed">Your inquiry has been received. We will review your submission and respond within 1-2 business days.</p>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="pt-24 pb-16 bg-white">
        <div className="container">
          <div className="flex items-center gap-2 mb-4"><div className="w-8 h-0.5 bg-teal" /><span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">Get in Touch</span></div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">Contact Recover My Value™</h1>
          <p className="text-muted-foreground mb-12 max-w-2xl">Whether you have a question about our process, want to understand your options, or are ready to book a strategy call — we're here to help.</p>

          <div className="grid lg:grid-cols-3 gap-12">
            <div className="space-y-8">
              <div>
                <h3 className="font-display font-semibold text-foreground mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Intake Line</p><a href="tel:3303331430" className="flex items-center gap-2 text-foreground font-medium"><Phone className="w-4 h-4" />(330) 333-1430</a><p className="text-xs text-muted-foreground mt-1">Brief and informational. Not a legal consultation.</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p><a href="mailto:support@recovermyvalue.com" className="flex items-center gap-2 text-foreground font-medium"><Mail className="w-4 h-4" />support@recovermyvalue.com</a></div>
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Practice</p><p className="text-foreground font-medium">Remote · Nationwide</p><p className="text-xs text-muted-foreground mt-1">Legal representation limited to Ohio.</p></div>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-5 border border-border">
                <h4 className="font-semibold text-foreground text-sm mb-3">What a Strategy Call Covers</h4>
                <ul className="space-y-2">
                  {["What the insurer has actually decided", "Interpretation of confusing documents", "Realistic next steps you can act on", "Whether escalation is worth your time"].map((item) => (
                    <li key={item} className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-teal mt-0.5 shrink-0" /><span className="text-xs text-muted-foreground">{item}</span></li>
                  ))}
                </ul>
              </div>
              <div className="bg-teal/5 border border-teal/20 rounded-lg p-4">
                <div className="flex items-start gap-2"><AlertCircle className="w-4 h-4 text-teal mt-0.5 shrink-0" /><p className="text-xs text-muted-foreground">Submitting this form does not create an attorney-client relationship. Please do not include confidential or time-sensitive information.</p></div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div><label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5">First Name *</label><input type="text" required value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} placeholder="First name" className="w-full border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" /></div>
                <div><label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5">Last Name *</label><input type="text" required value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} placeholder="Last name" className="w-full border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div><label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5">Email *</label><input type="email" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="your@email.com" className="w-full border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" /></div>
                <div><label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5">Phone</label><input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="(555) 000-0000" className="w-full border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div><label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5">State *</label><input type="text" required value={form.state} onChange={(e) => setForm({...form, state: e.target.value})} placeholder="e.g., Ohio" className="w-full border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" /></div>
                <div><label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5">Practice Area</label><select value={form.practiceArea} onChange={(e) => setForm({...form, practiceArea: e.target.value})} className="w-full border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"><option value="">Select one</option><option value="Property Damage">Property Damage</option><option value="Personal Injury">Personal Injury</option><option value="Immigration">Immigration</option><option value="Not sure yet">Not sure yet</option></select></div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">What are you seeking? *</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[{value: "general", label: "General question"}, {value: "understand", label: "Understand the process"}, {value: "strategy", label: "Claims Strategy Assessment"}, {value: "representation", label: "Full representation"}].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 border border-border rounded-md px-4 py-2.5 cursor-pointer hover:border-teal/30 transition-colors">
                      <input type="radio" name="inquiryType" value={opt.value} checked={form.inquiryType === opt.value} onChange={(e) => setForm({...form, inquiryType: e.target.value})} className="accent-teal" />
                      <span className="text-sm text-foreground">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5">Brief Description of Your Situation *</label><textarea required value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Briefly describe your situation. Please do not include confidential information at this stage." rows={4} className="w-full border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none" /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.newsletterOptIn} onChange={(e) => setForm({...form, newsletterOptIn: e.target.checked})} className="accent-teal" /><span className="text-sm text-muted-foreground">Sign up for property damage insights and legal updates</span></label>
              <button type="submit" disabled={submitLead.isPending} className="w-full bg-teal hover:bg-teal-dark text-white py-3 rounded-md font-semibold transition-colors disabled:opacity-50">{submitLead.isPending ? "Submitting..." : "Submit Inquiry"}</button>
              <p className="text-xs text-muted-foreground text-center">Representation is available only after a Claims Strategy Assessment. Legal representation is limited to Ohio. Submitting this form does not create an attorney-client relationship.</p>
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

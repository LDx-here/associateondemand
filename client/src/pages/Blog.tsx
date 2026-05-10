import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";

const posts = [
  { category: "Diminished Value", title: "What Is Diminished Value and Why Insurers Don't Want You to Know", excerpt: "After an accident, your car loses market value even after repairs. Here's how to claim what you're owed.", readTime: "5 min read" },
  { category: "Total Loss", title: "How to Fight a Total Loss Valuation You Disagree With", excerpt: "Insurance companies use algorithms to value your totaled car. Those numbers aren't always accurate — and you can challenge them.", readTime: "7 min read" },
  { category: "Loss of Use", title: "Loss of Use: You Don't Need to Rent a Car to Claim It", excerpt: "One of the biggest myths in property damage law. You have a legal right to loss-of-use compensation regardless of whether you rented a vehicle.", readTime: "4 min read" },
  { category: "Diminished Value", title: "How to Document Diminished Value After an Accident", excerpt: "Proper documentation is the foundation of a successful diminished value claim. Here's what you need to gather.", readTime: "6 min read" },
  { category: "Insurance Disputes", title: "5 Tactics Insurance Adjusters Use to Minimize Your Claim", excerpt: "Understanding the adjuster's playbook helps you prepare a stronger response and avoid common pitfalls.", readTime: "8 min read" },
  { category: "Total Loss", title: "Understanding Your Rights When Your Car Is Totaled", excerpt: "A total loss declaration doesn't mean you have to accept the first offer. Know your rights and options.", readTime: "5 min read" },
];

export default function Blog() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="pt-24 pb-16 bg-white">
        <div className="container">
          <div className="flex items-center gap-2 mb-4"><div className="w-8 h-0.5 bg-teal" /><span className="text-teal text-xs font-semibold uppercase tracking-[0.2em]">Know Your Rights</span></div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">Property Damage Insights</h1>
          <p className="text-muted-foreground mb-12 max-w-2xl">Insurance companies count on you not knowing your rights. These articles cut through the confusion — explaining exactly what adjusters do, why claims get denied, and what you can do about it.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div key={post.title} className="group bg-white rounded-lg overflow-hidden border border-border hover:border-teal/30 hover:shadow-lg transition-all">
                <div className="p-6">
                  <span className="text-xs font-semibold text-teal uppercase tracking-wider">{post.category}</span>
                  <h3 className="font-display text-lg font-semibold text-foreground mt-2 mb-3 group-hover:text-teal transition-colors leading-snug">{post.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{post.excerpt}</p>
                  <span className="text-xs text-muted-foreground">{post.readTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

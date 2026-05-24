import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AssociateOnDemand",
  description: "Autonomous law firm decision engine (RMV / AOD)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

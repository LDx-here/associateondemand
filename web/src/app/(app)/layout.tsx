import { AppShell } from "@/components/AppShell";
import { isDemoMode } from "@/lib/data-store";

export default async function AppChromeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell demoMode={isDemoMode()}>{children}</AppShell>;
}

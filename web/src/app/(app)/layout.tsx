import { AppShell } from "@/components/AppShell";
import { isSampleDataMode } from "@/lib/data-store";

export default async function AppChromeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell demoMode={isSampleDataMode()}>{children}</AppShell>;
}

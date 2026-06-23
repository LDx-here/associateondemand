import { AppShell } from "@/components/AppShell";
import { useDemoMode } from "@/lib/data-store";

export default function AppChromeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell demoMode={useDemoMode()}>{children}</AppShell>;
}

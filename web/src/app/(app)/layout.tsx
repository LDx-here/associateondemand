import { AppShell } from "@/components/AppShell";
import { isAirtableDegradedMode, isSampleDataMode } from "@/lib/data-store";

export default async function AppChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell demoMode={isSampleDataMode()} airtableDegraded={isAirtableDegradedMode()}>
      {children}
    </AppShell>
  );
}

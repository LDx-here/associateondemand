import { useEffect, useMemo, useState } from "react";
import { Route, Switch, useLocation, Redirect } from "wouter";
import { trpc, createTrpcClient, createAppQueryClient } from "./lib/trpc";
import { QueryClientProvider } from "@tanstack/react-query";
import Home from "./pages/Home";
import Associate from "./pages/Associate";
import IntakeFunnel from "./pages/intake/PathSelector";
import QuickUpload from "./pages/intake/QuickUpload";
import GuidedRequest from "./pages/intake/GuidedRequest";
import AdminDashboard from "./pages/admin/Dashboard";
import MatterPipeline from "./pages/admin/MatterPipeline";
import MatterDetail from "./pages/admin/MatterDetail";
import LeadManagement from "./pages/admin/LeadManagement";
import AgentRegistry from "./pages/admin/AgentRegistry";
import FirmMemory from "./pages/admin/FirmMemory";
import ServiceManagement from "./pages/admin/ServiceManagement";
import DraftingConfig from "./pages/admin/DraftingConfig";
import ClioIntegration from "./pages/admin/ClioIntegration";
import NotFound from "./pages/NotFound";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/associate" component={Associate} />
      <Route path="/associate/intake" component={IntakeFunnel} />
      <Route path="/associate/intake/quick" component={QuickUpload} />
      <Route path="/associate/intake/guided" component={GuidedRequest} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/matters" component={MatterPipeline} />
      <Route path="/admin/matters/:id" component={MatterDetail} />
      <Route path="/admin/leads" component={LeadManagement} />
      <Route path="/admin/agents" component={AgentRegistry} />
      <Route path="/admin/firm-memory" component={FirmMemory} />
      <Route path="/admin/services" component={ServiceManagement} />
      <Route path="/admin/drafting" component={DraftingConfig} />
      <Route path="/admin/clio" component={ClioIntegration} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem("legal_os_admin_key") ?? "");
  const queryClient = useMemo(() => createAppQueryClient(), []);
  const client = useMemo(() => createTrpcClient(adminKey || undefined), [adminKey]);

  useEffect(() => {
    if (adminKey) localStorage.setItem("legal_os_admin_key", adminKey);
  }, [adminKey]);

  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AdminKeyBanner adminKey={adminKey} setAdminKey={setAdminKey} />
        <AppRoutes />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

function AdminKeyBanner({
  adminKey,
  setAdminKey,
}: {
  adminKey: string;
  setAdminKey: (k: string) => void;
}) {
  const [loc] = useLocation();
  if (!loc.startsWith("/admin")) return null;

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-2 text-xs">
      Admin API key:{" "}
      <input
        className="input inline-block max-w-xs"
        type="password"
        value={adminKey}
        onChange={(e) => setAdminKey(e.target.value)}
        placeholder="Set ADMIN_API_KEY from .env"
      />
    </div>
  );
}

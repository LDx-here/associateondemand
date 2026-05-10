import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Loader2, Filter, LogOut } from "lucide-react";

const statusColors: Record<string, string> = {
  "New": "bg-blue-100 text-blue-800",
  "Contacted": "bg-yellow-100 text-yellow-800",
  "Strategy Call Booked": "bg-purple-100 text-purple-800",
  "Active Client": "bg-green-100 text-green-800",
  "Closed": "bg-gray-100 text-gray-800",
};

export default function AdminDashboard() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [filters, setFilters] = useState({ practiceArea: "", status: "", dateFrom: "", dateTo: "" });

  const leadsQuery = trpc.leads.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });

  const filteredLeads = useMemo(() => {
    if (!leadsQuery.data) return [];
    return leadsQuery.data.filter((lead: any) => {
      if (filters.practiceArea && lead.practiceArea !== filters.practiceArea) return false;
      if (filters.status && lead.status !== filters.status) return false;
      if (filters.dateFrom && new Date(lead.createdAt) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(lead.createdAt) > new Date(filters.dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [leadsQuery.data, filters]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal" /></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="bg-white rounded-lg p-8 border border-border max-w-md w-full text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">Attorney Dashboard</h1>
          <p className="text-muted-foreground mb-6">Sign in to access the lead management dashboard.</p>
          <a href={getLoginUrl()} className="inline-flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-6 py-3 rounded-md font-semibold transition-colors">Sign In</a>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="bg-white rounded-lg p-8 border border-border max-w-md w-full text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground">This dashboard is restricted to authorized attorneys only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <h1 className="font-display text-lg font-bold text-foreground">Lead Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.name || user?.email}</span>
            <button onClick={() => logout()} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><LogOut className="w-3.5 h-3.5" />Logout</button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg p-4 border border-border mb-6">
          <div className="flex items-center gap-2 mb-3"><Filter className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-semibold text-foreground">Filters</span></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select value={filters.practiceArea} onChange={(e) => setFilters({...filters, practiceArea: e.target.value})} className="border border-border rounded-md px-3 py-2 text-sm"><option value="">All Practice Areas</option><option value="Property Damage">Property Damage</option><option value="Personal Injury">Personal Injury</option><option value="Immigration">Immigration</option><option value="Not sure yet">Not sure yet</option></select>
            <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="border border-border rounded-md px-3 py-2 text-sm"><option value="">All Statuses</option><option value="New">New</option><option value="Contacted">Contacted</option><option value="Strategy Call Booked">Strategy Call Booked</option><option value="Active Client">Active Client</option><option value="Closed">Closed</option></select>
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({...filters, dateFrom: e.target.value})} className="border border-border rounded-md px-3 py-2 text-sm" placeholder="From" />
            <input type="date" value={filters.dateTo} onChange={(e) => setFilters({...filters, dateTo: e.target.value})} className="border border-border rounded-md px-3 py-2 text-sm" placeholder="To" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {["New", "Contacted", "Strategy Call Booked", "Active Client", "Closed"].map((status) => (
            <div key={status} className="bg-white rounded-lg p-4 border border-border text-center">
              <p className="text-2xl font-bold text-foreground">{leadsQuery.data?.filter((l: any) => l.status === status).length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{status}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Practice Area</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Source</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {leadsQuery.isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-teal mx-auto" /></td></tr>
                ) : filteredLeads.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No leads found</td></tr>
                ) : (
                  filteredLeads.map((lead: any) => (
                    <tr key={lead.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-4 py-3 font-medium">{lead.firstName} {lead.lastName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.email}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-teal/10 text-teal px-2 py-0.5 rounded">{lead.practiceArea}</span></td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${statusColors[lead.status] || ""}`}>{lead.status}</span></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{lead.source}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(lead.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

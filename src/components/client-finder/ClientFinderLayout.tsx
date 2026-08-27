import { NavLink, Outlet, useParams } from "react-router-dom";
import { BarChart3, Building2, Package, Settings, Target } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "overview", label: "Overview", icon: BarChart3 },
  { to: "offers", label: "Offers", icon: Package },
  { to: "ideal-customers", label: "Ideal customers", icon: Target },
  { to: "prospects", label: "Prospects", icon: Building2 },
  { to: "settings", label: "Settings", icon: Settings },
];

export default function ClientFinderLayout() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <div>
          <h1 className="text-2xl font-bold">AI Client Finder</h1>
          <p className="text-sm text-muted-foreground">
            Describe what you sell, define who it is for, and build a verified prospect list.
          </p>
        </div>

        <nav className="flex flex-wrap gap-1 rounded-xl border bg-card p-1">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={`/dashboard/${workspaceId}/client-finder/${tab.to}`}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </DashboardLayout>
  );
}

import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformAccess } from "@/hooks/usePlatformAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, LayoutDashboard, Users, Building2, CreditCard, Receipt, Gauge, Radio,
  Workflow, Plug, ShoppingBag, FileText, GraduationCap, LifeBuoy, Lock, Activity,
  Settings2, ScrollText, ArrowLeft, Loader2,
} from "lucide-react";

type NavItem = { label: string; to: string; icon: any; permission?: string };

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [{ label: "Platform Overview", to: "/platform-admin", icon: LayoutDashboard }],
  },
  {
    title: "Accounts",
    items: [
      { label: "Users", to: "/platform-admin/users", icon: Users, permission: "platform.users.read" },
      { label: "Workspaces", to: "/platform-admin/workspaces", icon: Building2, permission: "platform.workspaces.read" },
      { label: "Platform Staff", to: "/platform-admin/staff", icon: ShieldCheck, permission: "platform.roles.manage" },
    ],
  },
  {
    title: "Commercial",
    items: [
      { label: "Plans", to: "/platform-admin/plans", icon: CreditCard, permission: "platform.billing.read" },
      { label: "Subscriptions", to: "/platform-admin/subscriptions", icon: Receipt, permission: "platform.billing.read" },
      { label: "Usage & Credits", to: "/platform-admin/credits", icon: Gauge, permission: "platform.billing.read" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Communications", to: "/platform-admin/communications", icon: Radio },
      { label: "Automations", to: "/platform-admin/automations", icon: Workflow },
      { label: "Integrations", to: "/platform-admin/integrations", icon: Plug },
      { label: "Store Fulfilment", to: "/platform-admin/fulfilment", icon: ShoppingBag },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Blog & Pages", to: "/platform-admin/content", icon: FileText },
      { label: "Academy & Community", to: "/platform-admin/academy", icon: GraduationCap },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Support Access", to: "/platform-admin/support", icon: LifeBuoy, permission: "platform.support.access" },
      { label: "Audit Log", to: "/platform-admin/audit", icon: ScrollText, permission: "platform.audit.read" },
      { label: "Security", to: "/platform-admin/security", icon: Lock },
      { label: "Platform Health", to: "/platform-admin/health", icon: Activity },
      { label: "Settings", to: "/platform-admin/settings", icon: Settings2 },
    ],
  },
];

export default function PlatformAdminLayout() {
  const { user, loading } = useAuth();
  const { isStaff, isLoading, can } = usePlatformAccess();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          <Lock className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Platform Admin is restricted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have platform staff access. If you believe this is a mistake, contact a Super Admin.
          </p>
          <Button className="mt-6" onClick={() => navigate("/dashboard")}>
            Back to my dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col overflow-y-auto border-r bg-primary text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <div>
            <p className="text-sm font-semibold leading-tight">Platform Admin</p>
            <p className="text-[11px] text-primary-foreground/60">NexusFlo24 control plane</p>
          </div>
        </div>

        <nav className="flex-1 space-y-5 px-3 py-4">
          {SECTIONS.map((section) => {
            const items = section.items.filter((i) => !i.permission || can(i.permission));
            if (!items.length) return null;
            return (
              <div key={section.title}>
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/45">
                  {section.title}
                </p>
                {items.map((item) => {
                  const active =
                    item.to === "/platform-admin"
                      ? location.pathname === "/platform-admin"
                      : location.pathname.startsWith(item.to);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        active
                          ? "bg-accent/20 text-accent"
                          : "text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-xs text-primary-foreground/70 hover:text-primary-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to workspace
          </Link>
        </div>
      </aside>

      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-2 lg:hidden">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <span className="text-sm font-semibold">Platform Admin</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:inline-flex">
              {user.email}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => navigate("/dashboard")}>
              Exit
            </Button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b bg-background px-3 py-2 lg:hidden">
          {SECTIONS.flatMap((s) => s.items)
            .filter((i) => !i.permission || can(i.permission))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-3 py-1.5 text-xs ${
                    isActive ? "bg-accent/15 text-accent" : "text-muted-foreground"
                  }`
                }
                end={item.to === "/platform-admin"}
              >
                {item.label}
              </NavLink>
            ))}
        </nav>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

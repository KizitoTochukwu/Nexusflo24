import { useState } from "react";
import logo from "@/assets/logo.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  LayoutDashboard, Users, Megaphone, Workflow, LayoutTemplate,
  BarChart3, Settings, Menu, X, LogOut, ChevronDown, UserCircle, Building2, Check
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { workspaces, currentWorkspace } = useWorkspace();
  const workspaceId = useWorkspaceId();

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Overview", to: `/dashboard/${workspaceId}/overview` },
    { icon: Users, label: "Leads", to: `/dashboard/${workspaceId}/leads` },
    { icon: Megaphone, label: "Campaigns", to: `/dashboard/${workspaceId}/campaigns` },
    { icon: Workflow, label: "Automations", to: `/dashboard/${workspaceId}/automations` },
    { icon: LayoutTemplate, label: "Funnels", to: `/dashboard/${workspaceId}/funnels` },
    { icon: BarChart3, label: "Analytics", to: `/dashboard/${workspaceId}/analytics` },
    { icon: Settings, label: "Settings", to: `/dashboard/${workspaceId}/settings` },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleSwitchWorkspace = (wsId: string) => {
    navigate(`/dashboard/${wsId}/overview`);
  };

  const initials = user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-primary transition-all duration-300 ${
          sidebarOpen ? "w-56" : "w-14"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-3">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2 text-sm font-bold text-primary-foreground">
              <img src={logo} alt="NexusFlo24 Logo" className="h-4 w-4 rounded object-cover" />
              NexusFlo24
            </Link>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded p-1 text-primary-foreground/60 hover:text-primary-foreground">
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-primary-foreground/60 hover:bg-sidebar-accent/50 hover:text-primary-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar logout */}
        <div className="border-t border-sidebar-border px-2 py-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-primary-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={`relative z-10 flex-1 transition-all duration-300 ${sidebarOpen ? "ml-56" : "ml-14"}`}>
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b bg-background px-6">
          {/* Workspace switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                <Building2 className="h-4 w-4 text-accent" />
                <span className="max-w-[200px] truncate">{currentWorkspace?.name || "Workspace"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => handleSwitchWorkspace(ws.id)}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.id === workspaceId && <Check className="h-4 w-4 text-accent" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initials}
                </div>
                <span className="hidden sm:inline">{user?.email}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate(`/dashboard/${workspaceId}/settings/profile`)}>
                <UserCircle className="mr-2 h-4 w-4" /> Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/dashboard/${workspaceId}/settings`)}>
                <Settings className="mr-2 h-4 w-4" /> Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;

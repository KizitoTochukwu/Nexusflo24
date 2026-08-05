import { useEffect, useState } from "react";
import SidebarLogo from "@/components/brand/SidebarLogo";
import { useRouteMemory } from "@/hooks/useRouteMemory";
import SidebarCreditWidget from "@/components/dashboard/SidebarCreditWidget";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLowCreditAlert } from "@/hooks/useLowCreditAlert";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard, Users, Contact2, Megaphone, Workflow, Zap, LayoutTemplate, CalendarDays,
  BarChart3, Settings, Menu, X, LogOut, ChevronDown, UserCircle, Building2, Check, Shield, MessageCircle, FileText, Sparkles, FormInput, Radio, HelpCircle, ListChecks, Rocket } from
"lucide-react";
import NotificationBell from "@/components/dashboard/NotificationBell";
import NexusAiPanel, { openNexusAi } from "@/components/ai/NexusAiPanel";
import nexusAiMark from "@/assets/nexus-ai-mark.png";

import { OPEN_CHECKLIST_EVENT } from "@/components/dashboard/GettingStartedChecklist";
import { OPEN_TOUR_EVENT } from "@/components/onboarding/ProductTour";
import { useNotificationWatcher } from "@/hooks/useNotifications";
import PlanBadge from "@/components/billing/PlanBadge";
import BillingWarningBanner from "@/components/billing/BillingWarningBanner";
import { useIsAdmin } from "@/hooks/useAdminRole";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from
"@/components/ui/dropdown-menu";

const DashboardLayout = ({ children }: {children: React.ReactNode;}) => {
  const isMobile = useIsMobile();
  // Desktop: sidebar expanded by default. Mobile: closed by default (off-canvas drawer).
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { workspaces, currentWorkspace } = useWorkspace();
  const workspaceId = useWorkspaceId();
  const { data: isAdmin } = useIsAdmin();
  useNotificationWatcher();
  useLowCreditAlert();
  useRouteMemory();

  // Sync default sidebar state when crossing the mobile breakpoint.
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Auto-close drawer on route change (mobile only).
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview", to: `/dashboard/${workspaceId}/overview` },
  { icon: Contact2, label: "Contacts", to: `/dashboard/${workspaceId}/crm/contacts` },
  { icon: Users, label: "Leads", to: `/dashboard/${workspaceId}/leads` },
  { icon: FormInput, label: "Forms", to: `/dashboard/${workspaceId}/forms` },
  { icon: LayoutTemplate, label: "Funnels", to: `/dashboard/${workspaceId}/funnels` },
  { icon: Megaphone, label: "Campaigns", to: `/dashboard/${workspaceId}/campaigns` },
  { icon: Workflow, label: "Automations", to: `/dashboard/${workspaceId}/automations` },
  { icon: CalendarDays, label: "Bookings", to: `/dashboard/${workspaceId}/bookings` },
  { icon: MessageCircle, label: "Messages", to: `/dashboard/${workspaceId}/messages` },
  { icon: BarChart3, label: "Analytics", to: `/dashboard/${workspaceId}/analytics` },
  { icon: Settings, label: "Settings", to: `/dashboard/${workspaceId}/settings` },
  ...(isAdmin ? [
    { icon: Zap, label: "Workflow Builder", to: `/dashboard/${workspaceId}/workflows` },
    { icon: Shield, label: "Admin", to: `/dashboard/${workspaceId}/admin` },
    { icon: Radio, label: "Communication", to: `/dashboard/${workspaceId}/admin/communication` },
    { icon: Sparkles, label: "Smart Actions", to: `/dashboard/${workspaceId}/admin/smart-actions` },
    { icon: FileText, label: "Blog Manager", to: `/dashboard/${workspaceId}/admin/blog` },
  ] : [])];


  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const openOverviewThen = (evt: string) => {
    const overview = `/dashboard/${workspaceId}/overview`;
    if (location.pathname !== overview) navigate(overview);
    window.setTimeout(() => window.dispatchEvent(new Event(evt)), 350);
  };

  const handleSwitchWorkspace = (wsId: string) => {
    navigate(`/dashboard/${wsId}/overview`);
  };

  const initials = user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";

  // Sidebar sizing / visibility
  // - Mobile: full drawer (w-72), slides in from left, backdrop behind it.
  // - Desktop: fixed rail (w-56 open / w-14 collapsed).
  const desktopWidth = sidebarOpen ? "w-56" : "w-14";
  const mobileTranslate = sidebarOpen ? "translate-x-0" : "-translate-x-full";
  const asideClasses = isMobile
    ? `fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r bg-primary transition-transform duration-300 ${mobileTranslate}`
    : `fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-primary transition-all duration-300 ${desktopWidth}`;

  const mainMargin = isMobile ? "ml-0" : (sidebarOpen ? "ml-56" : "ml-14");

  // On mobile, labels always show inside the drawer.
  const showLabels = isMobile ? true : sidebarOpen;

  return (
    <div
      className="flex min-h-screen bg-surface"
      style={{ "--dashboard-sidebar-width": isMobile ? "0px" : (sidebarOpen ? "14rem" : "3.5rem") } as React.CSSProperties}
    >
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={asideClasses}>
        <div className="flex h-14 items-center justify-between px-3">
          {showLabels && (
            <Link to="/" className="flex items-center">
              <SidebarLogo collapsed={false} />
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`rounded p-1 text-primary-foreground/60 hover:text-primary-foreground ${
              !showLabels ? "mx-auto" : ""
            }`}
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 my-[20px]">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ?
                "bg-sidebar-accent text-sidebar-accent-foreground" :
                "text-primary-foreground/60 hover:bg-sidebar-accent/50 hover:text-primary-foreground"}`
                }>
                <item.icon className="h-4 w-4 shrink-0" />
                {showLabels && <span>{item.label}</span>}
              </Link>);
          })}
        </nav>

        {/* Credit balances */}
        <SidebarCreditWidget collapsed={!showLabels} />

        {/* Sidebar logout */}
        <div className="border-t border-sidebar-border px-2 py-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-primary-foreground">
            <LogOut className="h-4 w-4 shrink-0" />
            {showLabels && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={`relative z-10 flex-1 transition-all duration-300 ${mainMargin}`}>
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-foreground hover:bg-muted"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            {/* Workspace switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-muted min-w-0">
                  <Building2 className="h-4 w-4 text-accent shrink-0" />
                  <span className="max-w-[140px] sm:max-w-[200px] truncate">{currentWorkspace?.name || "Workspace"}</span>
                  <PlanBadge />
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
                {workspaces.map((ws) =>
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => handleSwitchWorkspace(ws.id)}
                  className="flex items-center justify-between">
                    <span className="truncate">{ws.name}</span>
                    {ws.id === workspaceId && <Check className="h-4 w-4 text-accent" />}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            {/* Nexus AI */}
            <button
              onClick={() => openNexusAi()}
              className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent/20"
              aria-label="Open Nexus AI assistant"
            >
              <img src={nexusAiMark} alt="" width={16} height={16} loading="lazy" className="h-4 w-4 rounded" />
              <span className="hidden sm:inline">Nexus AI</span>
            </button>

            {/* Help menu */}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Help and getting started"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Help & onboarding</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openOverviewThen(OPEN_CHECKLIST_EVENT)}>
                  <ListChecks className="mr-2 h-4 w-4" /> Getting Started checklist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openOverviewThen(OPEN_TOUR_EVENT)}>
                  <Sparkles className="mr-2 h-4 w-4" /> Replay product tour
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/dashboard/${workspaceId}/settings/onboarding`)}>
                  <Rocket className="mr-2 h-4 w-4" /> Onboarding setup
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/academy")}>
                  <FileText className="mr-2 h-4 w-4" /> Academy & guides
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <NotificationBell />


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
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <BillingWarningBanner />
          <NexusAiPanel />

          {children}
        </div>
      </main>
    </div>);

};

export default DashboardLayout;

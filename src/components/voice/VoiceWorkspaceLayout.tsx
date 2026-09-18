import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PhoneCall } from "lucide-react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { VOICE_NAV, resolveVoiceSection } from "@/lib/voice/nav";

/** Shared shell for every NexusFlo Voice page. */
const VoiceWorkspaceLayout = () => {
  const workspaceId = useWorkspaceId();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const active = resolveVoiceSection(pathname);
  const to = (path: string) => `/dashboard/${workspaceId}/${path}`;

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-5 overflow-x-hidden">
        <div className="sticky top-0 z-10 w-full space-y-2 border-b border-border/50 bg-background/90 pb-3 pt-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <NavLink to={to("voice/overview")} className="flex items-center gap-1.5 font-medium">
                    <PhoneCall className="h-3.5 w-3.5" /> NexusFlo Voice
                  </NavLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {active && active.key !== "overview" && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold">{active.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          {isMobile ? (
            <Select
              value={active?.key ?? ""}
              onValueChange={(k) => {
                const item = VOICE_NAV.find((i) => i.key === k);
                if (item) navigate(to(item.path));
              }}
            >
              <SelectTrigger className="w-full rounded-xl" aria-label="Voice section">
                <SelectValue placeholder="Choose a section" />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                {VOICE_NAV.map((i) => (
                  <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <nav
              aria-label="Voice sections"
              className="flex w-full items-center gap-1 rounded-full border border-border/60 bg-gradient-to-b from-card to-muted/40 p-1 shadow-[0_1px_2px_hsl(var(--foreground)/0.06),0_8px_24px_-16px_hsl(var(--foreground)/0.35)]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {VOICE_NAV.map((item) => {
                  const isActive = active?.key === item.key;
                  return (
                    <NavLink
                      key={item.key}
                      to={to(item.path)}
                      aria-current={isActive ? "page" : undefined}
                      className={`group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium tracking-tight transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 transition-colors ${isActive ? "text-accent" : "text-muted-foreground/70 group-hover:text-foreground"}`} />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </nav>
          )}
        </div>

        <Outlet />
      </div>
    </DashboardLayout>
  );
};

export default VoiceWorkspaceLayout;

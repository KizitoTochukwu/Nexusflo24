import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ChevronDown, Users2 } from "lucide-react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CRM_PRIMARY_NAV, CRM_SECONDARY_NAV, CRM_ALL_NAV, resolveCrmSection,
} from "@/lib/crm/nav";

/**
 * Shared shell for every CRM page: breadcrumbs plus a secondary navigation bar
 * so users can move between CRM sections without going back to the sidebar.
 */
const CrmWorkspaceLayout = () => {
  const workspaceId = useWorkspaceId();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const active = resolveCrmSection(pathname);
  const to = (path: string) => `/dashboard/${workspaceId}/${path}`;
  const moreActive = CRM_SECONDARY_NAV.some((i) => i.key === active?.key);

  return (
    <DashboardLayout>
    <div className="mx-auto w-full max-w-[1400px] space-y-5 overflow-x-hidden">
      <div className="sticky top-0 z-10 w-full space-y-2 border-b border-border/50 bg-background/90 pb-3 pt-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">


        <Breadcrumb>
          <BreadcrumbList className="text-[11px] tracking-wide">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <NavLink to={to("crm/contacts")} className="flex items-center gap-1.5 font-semibold uppercase tracking-[0.12em] text-accent">
                  <Users2 className="h-3.5 w-3.5" /> CRM
                </NavLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {active && (
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
          <Select value={active?.key ?? ""} onValueChange={(key) => {
            const item = CRM_ALL_NAV.find((i) => i.key === key);
            if (item) navigate(to(item.path));
          }}>
            <SelectTrigger
              className="w-full rounded-full border-accent/25 bg-[image:var(--gradient-crm-rail)] px-4 py-2 text-primary-foreground shadow-[var(--shadow-crm-rail)] [&>svg]:opacity-70"
              aria-label="CRM section"
            >
              <span className="flex min-w-0 items-center gap-2">
                {active?.icon && <active.icon className="h-4 w-4 shrink-0 text-accent" />}
                <SelectValue placeholder="Choose a CRM section" />
              </span>
            </SelectTrigger>
            <SelectContent className="z-[70]">
              <SelectGroup>
                <SelectLabel>Sections</SelectLabel>
                {CRM_PRIMARY_NAV.map((i) => (
                  <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>More</SelectLabel>
                {CRM_SECONDARY_NAV.map((i) => (
                  <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          <nav
            aria-label="CRM sections"
            className="flex w-full items-center gap-1 rounded-full border border-accent/20 bg-[image:var(--gradient-crm-rail)] p-1.5 shadow-[var(--shadow-crm-rail)]"
          >
            <div className="flex min-w-0 flex-1 items-center justify-between gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CRM_PRIMARY_NAV.map((item) => {
                const isActive = active?.key === item.key;
                return (
                  <NavLink
                    key={item.key}
                    to={to(item.path)}
                    aria-current={isActive ? "page" : undefined}
                    className={`group relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-0 ${
                      isActive
                        ? "bg-[image:var(--gradient-gold)] text-accent-foreground shadow-[var(--shadow-crm-pill)]"
                        : "text-primary-foreground/65 hover:-translate-y-px hover:bg-primary-foreground/10 hover:text-primary-foreground"
                    }`}
                  >
                    <item.icon className={`h-[17px] w-[17px] shrink-0 transition-colors duration-300 ${isActive ? "text-accent-foreground" : "text-accent/70 group-hover:text-accent"}`} />
                    {item.label}
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute -bottom-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-foreground/70"
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>

            <span className="mx-1.5 hidden h-5 w-px shrink-0 bg-accent/25 lg:block" aria-hidden />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-auto shrink-0 gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] transition-all duration-300 ${
                    moreActive
                      ? "bg-[image:var(--gradient-gold)] text-accent-foreground shadow-[var(--shadow-crm-pill)] hover:text-accent-foreground"
                      : "text-primary-foreground/65 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  }`}
                >
                  <span className="max-w-[9rem] truncate">{moreActive ? active?.label : "More"}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="z-[70] w-56 rounded-xl bg-popover shadow-lg">
                {CRM_SECONDARY_NAV.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    onSelect={() => navigate(to(item.path))}
                    className={`rounded-lg ${active?.key === item.key ? "bg-accent/10 font-medium" : ""}`}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        )}
      </div>

      <div className="min-w-0 max-w-full">
        <Outlet />
      </div>
    </div>
    </DashboardLayout>
  );
};

export default CrmWorkspaceLayout;

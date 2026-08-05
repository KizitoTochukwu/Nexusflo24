import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
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
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="sticky top-0 z-[61] -mx-1 space-y-2 border-b border-border/50 bg-background/90 px-1 pb-3 pt-1.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <NavLink to={to("crm/contacts")} className="flex items-center gap-1.5 font-medium">
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
            <SelectTrigger className="w-full rounded-xl" aria-label="CRM section">
              <SelectValue placeholder="Choose a CRM section" />
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
            className="flex w-full items-center gap-1 rounded-full border border-border/60 bg-gradient-to-b from-card to-muted/40 p-1 shadow-[0_1px_2px_hsl(var(--foreground)/0.06),0_8px_24px_-16px_hsl(var(--foreground)/0.35)]"
          >
            <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CRM_PRIMARY_NAV.map((item) => {
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

            <span className="mx-1 hidden h-5 w-px shrink-0 bg-border/70 lg:block" aria-hidden />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-auto shrink-0 gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-medium tracking-tight ${
                    moreActive
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
                      : "text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm"
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
  );
};

export default CrmWorkspaceLayout;

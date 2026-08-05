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
            className="flex w-full items-center gap-2 rounded-2xl border border-border/70 bg-card/80 p-1.5 shadow-sm ring-1 ring-inset ring-background/40"
          >
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CRM_PRIMARY_NAV.map((item) => {
                const isActive = active?.key === item.key;
                return (
                  <NavLink
                    key={item.key}
                    to={to(item.path)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`shrink-0 gap-1 rounded-xl text-sm font-medium ${
                    moreActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <span className="max-w-[9rem] truncate">{moreActive ? active?.label : "More"}</span>
                  <ChevronDown className="h-4 w-4" />
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

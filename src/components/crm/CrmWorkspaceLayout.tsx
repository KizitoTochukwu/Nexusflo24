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
    <div className="space-y-5">
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <NavLink to={to("crm/contacts")} className="flex items-center gap-1.5">
                  <Users2 className="h-3.5 w-3.5" /> CRM
                </NavLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {active && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{active.label}</BreadcrumbPage>
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
            <SelectTrigger className="w-full" aria-label="CRM section">
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
            className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1"
          >
            {CRM_PRIMARY_NAV.map((item) => {
              const isActive = active?.key === item.key;
              return (
                <NavLink
                  key={item.key}
                  to={to(item.path)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`ml-auto gap-1 rounded-lg text-sm font-medium ${
                    moreActive ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {moreActive ? active?.label : "More"}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[70] w-56 bg-popover">
                {CRM_SECONDARY_NAV.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    onSelect={() => navigate(to(item.path))}
                    className={active?.key === item.key ? "bg-accent/10 font-medium" : ""}
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

      <Outlet />
    </div>
  );
};

export default CrmWorkspaceLayout;

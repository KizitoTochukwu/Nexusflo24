import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ChevronDown, Megaphone } from "lucide-react";
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
import { ADS_PRIMARY_NAV, ADS_SECONDARY_NAV, ADS_ALL_NAV, resolveAdsSection } from "@/lib/ads/nav";

/** Shared shell for every Ads Hub page: breadcrumbs plus a secondary nav bar. */
const AdsWorkspaceLayout = () => {
  const workspaceId = useWorkspaceId();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const active = resolveAdsSection(pathname);
  const to = (path: string) => `/dashboard/${workspaceId}/${path}`;
  const moreActive = ADS_SECONDARY_NAV.some((i) => i.key === active?.key);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1400px] space-y-5 overflow-x-hidden">
        <div className="sticky top-0 z-10 w-full space-y-2 border-b border-border/50 bg-background/90 pb-3 pt-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <NavLink to={to("ads/overview")} className="flex items-center gap-1.5 font-medium">
                    <Megaphone className="h-3.5 w-3.5" /> Ads Hub
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
              onValueChange={(key) => {
                const item = ADS_ALL_NAV.find((i) => i.key === key);
                if (item) navigate(to(item.path));
              }}
            >
              <SelectTrigger className="w-full rounded-xl" aria-label="Ads section">
                <SelectValue placeholder="Choose a section" />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                <SelectGroup>
                  <SelectLabel>Sections</SelectLabel>
                  {ADS_PRIMARY_NAV.map((i) => (
                    <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>More</SelectLabel>
                  {ADS_SECONDARY_NAV.map((i) => (
                    <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <nav
              aria-label="Ads sections"
              className="flex w-full items-center gap-1 rounded-full border border-border/60 bg-gradient-to-b from-card to-muted/40 p-1 shadow-[0_1px_2px_hsl(var(--foreground)/0.06),0_8px_24px_-16px_hsl(var(--foreground)/0.35)]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {ADS_PRIMARY_NAV.map((item) => {
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
                      moreActive ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    More <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[70] w-56">
                  {ADS_SECONDARY_NAV.map((item) => (
                    <DropdownMenuItem key={item.key} onSelect={() => navigate(to(item.path))} className="gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
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
    </DashboardLayout>
  );
};

export default AdsWorkspaceLayout;

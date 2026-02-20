import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import RedirectIfAuth from "@/components/auth/RedirectIfAuth";
import WorkspaceGuard from "@/components/auth/WorkspaceGuard";
import Index from "./pages/Index";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import DashboardLeads from "./pages/dashboard/DashboardLeads";
import DashboardCampaigns from "./pages/dashboard/DashboardCampaigns";
import DashboardAutomations from "./pages/dashboard/DashboardAutomations";
import DashboardFunnels from "./pages/dashboard/DashboardFunnels";
import DashboardAnalytics from "./pages/dashboard/DashboardAnalytics";
import DashboardSettings from "./pages/dashboard/DashboardSettings";
import DashboardProfileSettings from "./pages/dashboard/DashboardProfileSettings";
import NotFound from "./pages/NotFound";
import ChatbotWidget from "./components/ChatbotWidget";
import DashboardRedirect from "./pages/DashboardRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/features" element={<Features />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
              <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />

              {/* Dashboard redirect (no workspaceId) */}
              <Route path="/dashboard" element={<DashboardRedirect />} />

              {/* Workspace-scoped dashboard routes */}
              <Route path="/dashboard/:workspaceId" element={<WorkspaceGuard />}>
                <Route path="overview" element={<Dashboard />} />
                <Route path="leads" element={<DashboardLeads />} />
                <Route path="campaigns" element={<DashboardCampaigns />} />
                <Route path="automations" element={<DashboardAutomations />} />
                <Route path="funnels" element={<DashboardFunnels />} />
                <Route path="analytics" element={<DashboardAnalytics />} />
                <Route path="settings" element={<DashboardSettings />} />
                <Route path="settings/*" element={<DashboardSettings />} />
                <Route index element={<Navigate to="overview" replace />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            <ChatbotWidget />
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

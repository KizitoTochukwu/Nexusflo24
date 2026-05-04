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
import FunnelDetailPage from "./pages/dashboard/FunnelDetailPage";
import DashboardAnalytics from "./pages/dashboard/DashboardAnalytics";
import DashboardSettings from "./pages/dashboard/DashboardSettings";
import DashboardProfileSettings from "./pages/dashboard/DashboardProfileSettings";
import NotFound from "./pages/NotFound";
import ChatbotWidget from "./components/ChatbotWidget";
import CookieConsentBanner from "./components/CookieConsentBanner";
import InactivityManager from "./components/auth/InactivityManager";
import DashboardRedirect from "./pages/DashboardRedirect";
import Referral from "./pages/Referral";
import Academy from "./pages/Academy";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import CookiePolicy from "./pages/legal/CookiePolicy";
import AcceptableUse from "./pages/legal/AcceptableUse";
import DataProcessingAddendum from "./pages/legal/DataProcessingAddendum";
import RefundPolicy from "./pages/legal/RefundPolicy";
import SecurityPage from "./pages/legal/Security";
import Disclaimer from "./pages/legal/Disclaimer";
import AntiSpamPolicy from "./pages/legal/AntiSpamPolicy";
import GdprRights from "./pages/legal/GdprRights";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBlogManager from "./pages/admin/AdminBlogManager";
import AdminSmartActions from "./pages/admin/AdminSmartActions";
import AdminGuard from "./components/admin/AdminGuard";
import AuthCallback from "./pages/AuthCallback";
import PublicFunnel from "./pages/PublicFunnel";
import DashboardBookings from "./pages/dashboard/DashboardBookings";
import DashboardMessages from "./pages/dashboard/DashboardMessages";
import EmbedForm from "./pages/EmbedForm";
import DashboardForms from "./pages/dashboard/DashboardForms";
import FormBuilder from "./pages/dashboard/FormBuilder";
import PublicForm from "./pages/PublicForm";
import PublicBooking from "./pages/PublicBooking";
import RescheduleBooking from "./pages/RescheduleBooking";
import CancelBooking from "./pages/CancelBooking";
import HowCapture from "./pages/HowCapture";
import HowNurture from "./pages/HowNurture";
import HowConvert from "./pages/HowConvert";

import DashboardWorkflows from "./pages/dashboard/DashboardWorkflows";
import WorkflowEditor from "./pages/dashboard/WorkflowEditor";
import Unsubscribe from "./pages/Unsubscribe";
import MetaPixelRouteTracker from "./components/analytics/MetaPixelRouteTracker";
import SiteCustomCodeInjector from "./components/analytics/SiteCustomCodeInjector";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <MetaPixelRouteTracker />
            <SiteCustomCodeInjector />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/features" element={<Features />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/referral" element={<Referral />} />
              <Route path="/academy" element={<Academy />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogArticle />} />
              <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
              <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/acceptable-use" element={<AcceptableUse />} />
              <Route path="/data-processing-addendum" element={<DataProcessingAddendum />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/anti-spam-policy" element={<AntiSpamPolicy />} />
              <Route path="/gdpr-rights" element={<GdprRights />} />
              <Route path="/how-it-works/capture" element={<HowCapture />} />
              <Route path="/how-it-works/nurture" element={<HowNurture />} />
              <Route path="/how-it-works/convert" element={<HowConvert />} />

              {/* Dashboard redirect (no workspaceId) */}
              <Route path="/dashboard" element={<DashboardRedirect />} />

              {/* Workspace-scoped dashboard routes */}
              <Route path="/dashboard/:workspaceId" element={<WorkspaceGuard />}>
                <Route path="overview" element={<Dashboard />} />
                <Route path="leads" element={<DashboardLeads />} />
                <Route path="campaigns" element={<DashboardCampaigns />} />
                <Route path="automations" element={<DashboardAutomations />} />
                <Route path="funnels" element={<DashboardFunnels />} />
                <Route path="funnels/:funnelId" element={<FunnelDetailPage />} />
                <Route path="forms" element={<DashboardForms />} />
                <Route path="forms/:formId" element={<FormBuilder />} />
                <Route path="bookings" element={<DashboardBookings />} />
                
                <Route path="messages" element={<DashboardMessages />} />
                <Route path="analytics" element={<DashboardAnalytics />} />
                <Route path="settings" element={<DashboardSettings />} />
                <Route path="settings/*" element={<DashboardSettings />} />
                <Route element={<AdminGuard />}>
                  <Route path="workflows" element={<DashboardWorkflows />} />
                  <Route path="workflows/new" element={<WorkflowEditor />} />
                  <Route path="workflows/:workflowId" element={<WorkflowEditor />} />
                  <Route path="admin" element={<AdminDashboard />} />
                  <Route path="admin/blog" element={<AdminBlogManager />} />
                  <Route path="admin/smart-actions" element={<AdminSmartActions />} />
                </Route>
                <Route index element={<Navigate to="overview" replace />} />
              </Route>

              {/* Public funnel routes */}
              <Route path="/f/:slug" element={<PublicFunnel />} />
              <Route path="/f/:slug/:stepPath" element={<PublicFunnel />} />

              {/* Embeddable form */}
              <Route path="/embed/form" element={<EmbedForm />} />

              {/* Public hosted form */}
              <Route path="/forms/:slug" element={<PublicForm />} />

              {/* Public booking routes */}
              <Route path="/book/:slug" element={<PublicBooking />} />
              <Route path="/reschedule/:token" element={<RescheduleBooking />} />
              <Route path="/cancel/:token" element={<CancelBooking />} />

              {/* Public unsubscribe */}
              <Route path="/unsubscribe" element={<Unsubscribe />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
            <InactivityManager />
            <ChatbotWidget />
            <CookieConsentBanner />
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

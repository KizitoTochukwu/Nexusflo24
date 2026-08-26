import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import AdminPricing from "./pages/admin/AdminPricing";
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
import DashboardContacts from "./pages/dashboard/crm/DashboardContacts";
import DashboardCompanies from "./pages/dashboard/crm/DashboardCompanies";
import DashboardDeals from "./pages/dashboard/crm/DashboardDeals";
import DashboardTasks from "./pages/dashboard/crm/DashboardTasks";
import DashboardImportExport from "./pages/dashboard/crm/DashboardImportExport";
import DashboardCrmSettings from "./pages/dashboard/crm/DashboardCrmSettings";
import DashboardCrmInsights from "./pages/dashboard/crm/DashboardCrmInsights";
import CompanyProfile from "./pages/dashboard/crm/CompanyProfile";
import ContactProfile from "./pages/dashboard/crm/ContactProfile";
import DashboardPipelines from "./pages/dashboard/crm/DashboardPipelines";
import DashboardCrmFields from "./pages/dashboard/crm/DashboardCrmFields";
import DashboardCrmTags from "./pages/dashboard/crm/DashboardCrmTags";
import DashboardLeadScoring from "./pages/dashboard/crm/DashboardLeadScoring";
import CrmWorkspaceLayout from "./components/crm/CrmWorkspaceLayout";
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
import Onboarding from "./pages/Onboarding";
import Referral from "./pages/Referral";
import Academy from "./pages/Academy";
import AcademyCourse from "./pages/AcademyCourse";
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
import AdminCommunicationOverview from "./pages/admin/communication/AdminCommunicationOverview";
import AdminOrganisations from "./pages/admin/communication/AdminOrganisations";
import AdminOrgDetail from "./pages/admin/communication/AdminOrgDetail";
import AdminSenderApprovals from "./pages/admin/communication/AdminSenderApprovals";
import AdminUsage from "./pages/admin/communication/AdminUsage";
import AdminCreditPackages from "./pages/admin/communication/AdminCreditPackages";
import AdminMessagesInbox from "./pages/admin/communication/AdminMessagesInbox";
import AuthCallback from "./pages/AuthCallback";
import OAuthConsent from "./pages/OAuthConsent";
import PublicFunnel from "./pages/PublicFunnel";
import BookingsWorkspaceLayout from "./components/bookings/BookingsWorkspaceLayout";
import AdsWorkspaceLayout from "./components/ads/AdsWorkspaceLayout";
import AdsOverview from "./pages/dashboard/ads/AdsOverview";
import AdsAccounts from "./pages/dashboard/ads/AdsAccounts";
import BookingsOverview from "./pages/dashboard/bookings/BookingsOverview";
import BookingsCalendar from "./pages/dashboard/bookings/BookingsCalendar";
import BookingsTypes from "./pages/dashboard/bookings/BookingsTypes";
import BookingsPages from "./pages/dashboard/bookings/BookingsPages";
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
import CoachesCreators from "./pages/sectors/CoachesCreators";
import MarketingAgencies from "./pages/sectors/MarketingAgencies";
import SmallBusiness from "./pages/sectors/SmallBusiness";

import DashboardWorkflows from "./pages/dashboard/DashboardWorkflows";
import WorkflowEditor from "./pages/dashboard/WorkflowEditor";
import Unsubscribe from "./pages/Unsubscribe";
import MetaPixelRouteTracker from "./components/analytics/MetaPixelRouteTracker";
import SiteCustomCodeInjector from "./components/analytics/SiteCustomCodeInjector";
import AiSeoVisibilityEngine from "./pages/AiSeoVisibilityEngine";
import RoiSavingsCalculator from "./pages/tools/RoiSavingsCalculator";
import StoreIndex from "./pages/store/StoreIndex";
import StoreCatalogue from "./pages/store/StoreCatalogue";
import StoreCategory from "./pages/store/StoreCategory";
import StoreProductDetail from "./pages/store/StoreProductDetail";
import AutomationFinder from "./pages/store/AutomationFinder";
import AutomationBundles from "./pages/store/AutomationBundles";
import BuildMyAutomation from "./pages/store/BuildMyAutomation";
import StoreCart from "./pages/store/StoreCart";
import StoreCheckout from "./pages/store/StoreCheckout";
import StoreSuccess from "./pages/store/StoreSuccess";
import MyAutomations from "./pages/dashboard/store/MyAutomations";
import StoreProjectDetail from "./pages/dashboard/store/StoreProjectDetail";
import AdminStoreOrders from "./pages/admin/AdminStoreOrders";
import AdminStoreCatalogue from "./pages/admin/AdminStoreCatalogue";
import PlatformAdminLayout from "./components/platform-admin/PlatformAdminLayout";
import PlatformOverview from "./pages/platform-admin/PlatformOverview";
import PlatformUsers from "./pages/platform-admin/PlatformUsers";
import PlatformWorkspaces from "./pages/platform-admin/PlatformWorkspaces";
import PlatformStaff from "./pages/platform-admin/PlatformStaff";
import PlatformPlans from "./pages/platform-admin/PlatformPlans";
import PlatformSubscriptions from "./pages/platform-admin/PlatformSubscriptions";
import PlatformCredits from "./pages/platform-admin/PlatformCredits";
import PlatformAudit from "./pages/platform-admin/PlatformAudit";
import PlatformSupport from "./pages/platform-admin/PlatformSupport";
import {
  PlatformCommunications, PlatformAutomations, PlatformIntegrations, PlatformFulfilment,
  PlatformContent, PlatformAcademy, PlatformSecurity, PlatformHealth, PlatformSettings,
} from "./pages/platform-admin/PlatformDeferred";
import { CartProvider } from "./contexts/CartContext";
import CartLauncher from "./components/store/CartLauncher";
import DashboardRoiSubmissions from "./pages/dashboard/DashboardRoiSubmissions";
import CommerceLayout from "./components/commerce/CommerceLayout";
import CommerceOverview from "./pages/dashboard/commerce/CommerceOverview";
import CommerceProducts from "./pages/dashboard/commerce/CommerceProducts";
import CommerceOrders from "./pages/dashboard/commerce/CommerceOrders";
import CommerceCustomers from "./pages/dashboard/commerce/CommerceCustomers";
import CommerceCommunity from "./pages/dashboard/commerce/CommerceCommunity";
import CommerceAccess from "./pages/dashboard/commerce/CommerceAccess";
import CommerceStorefront from "./pages/dashboard/commerce/CommerceStorefront";
import CommerceSettings from "./pages/dashboard/commerce/CommerceSettings";
import StorefrontHome from "./pages/storefront/StorefrontHome";
import StorefrontProduct from "./pages/storefront/StorefrontProduct";
import StorefrontCheckout from "./pages/storefront/StorefrontCheckout";
import StorefrontOrder from "./pages/storefront/StorefrontOrder";
import StorefrontAccount from "./pages/storefront/StorefrontAccount";
import StorefrontCommunities from "./pages/storefront/StorefrontCommunities";
import StorefrontCommunity from "./pages/storefront/StorefrontCommunity";
import StripeConnectCallback from "./pages/callback/StripeConnectCallback";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
    },
    mutations: { retry: 0 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CurrencyProvider>
          <CartProvider>
          <WorkspaceProvider>
            <MetaPixelRouteTracker />
            <SiteCustomCodeInjector />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/features" element={<Features />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/automations" element={<StoreIndex />} />
              <Route path="/automations/all" element={<StoreCatalogue />} />
              <Route path="/automations/cart" element={<StoreCart />} />
              <Route path="/automations/checkout" element={<StoreCheckout />} />
              <Route path="/automations/success" element={<StoreSuccess />} />
              <Route path="/automations/category/:category" element={<StoreCategory />} />
              <Route path="/automation-finder" element={<AutomationFinder />} />
              <Route path="/automation-bundles" element={<AutomationBundles />} />
              <Route path="/build-my-automation" element={<BuildMyAutomation />} />
              <Route path="/automations/:slug" element={<StoreProductDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/referral" element={<Referral />} />
              <Route path="/academy" element={<Academy />} />
              <Route path="/academy/:slug" element={<AcademyCourse />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogArticle />} />
              <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
              <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
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
              <Route path="/ai-seo-visibility-engine" element={<AiSeoVisibilityEngine />} />
              <Route path="/tools/roi-savings-calculator" element={<RoiSavingsCalculator />} />
              <Route path="/how-it-works/capture" element={<HowCapture />} />
              <Route path="/how-it-works/nurture" element={<HowNurture />} />
              <Route path="/how-it-works/convert" element={<HowConvert />} />
              <Route path="/coaches-creators" element={<CoachesCreators />} />
              <Route path="/marketing-agencies" element={<MarketingAgencies />} />
              <Route path="/small-business" element={<SmallBusiness />} />

              {/* Dashboard redirect (no workspaceId) */}
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Platform Admin (control plane, not workspace-scoped) */}
              <Route path="/platform-admin" element={<PlatformAdminLayout />}>
                <Route index element={<PlatformOverview />} />
                <Route path="users" element={<PlatformUsers />} />
                <Route path="workspaces" element={<PlatformWorkspaces />} />
                <Route path="staff" element={<PlatformStaff />} />
                <Route path="plans" element={<PlatformPlans />} />
                <Route path="subscriptions" element={<PlatformSubscriptions />} />
                <Route path="credits" element={<PlatformCredits />} />
                <Route path="communications" element={<PlatformCommunications />} />
                <Route path="automations" element={<PlatformAutomations />} />
                <Route path="integrations" element={<PlatformIntegrations />} />
                <Route path="fulfilment" element={<PlatformFulfilment />} />
                <Route path="content" element={<PlatformContent />} />
                <Route path="academy" element={<PlatformAcademy />} />
                <Route path="support" element={<PlatformSupport />} />
                <Route path="audit" element={<PlatformAudit />} />
                <Route path="security" element={<PlatformSecurity />} />
                <Route path="health" element={<PlatformHealth />} />
                <Route path="settings" element={<PlatformSettings />} />
              </Route>


              {/* Workspace-scoped dashboard routes */}
              <Route path="/dashboard/:workspaceId" element={<WorkspaceGuard />}>
                <Route path="overview" element={<Dashboard />} />
                <Route path="crm" element={<Navigate to="contacts" replace />} />
                <Route element={<CrmWorkspaceLayout />}>
                  <Route path="leads" element={<DashboardLeads />} />
                  <Route path="crm/contacts" element={<DashboardContacts />} />
                  <Route path="crm/contacts/:contactId" element={<ContactProfile />} />
                  <Route path="crm/companies" element={<DashboardCompanies />} />
                  <Route path="crm/companies/:companyId" element={<CompanyProfile />} />
                  <Route path="crm/deals" element={<DashboardDeals />} />
                  <Route path="crm/tasks" element={<DashboardTasks />} />
                  <Route path="crm/pipelines" element={<DashboardPipelines />} />
                  <Route path="crm/import-export" element={<DashboardImportExport />} />
                  <Route path="crm/fields" element={<DashboardCrmFields />} />
                  <Route path="crm/tags" element={<DashboardCrmTags />} />
                  <Route path="crm/lead-scoring" element={<DashboardLeadScoring />} />
                  <Route path="crm/insights" element={<DashboardCrmInsights />} />
                  <Route path="crm/settings" element={<DashboardCrmSettings />} />
                </Route>
                <Route path="campaigns" element={<DashboardCampaigns />} />
                <Route path="automations" element={<DashboardAutomations />} />
                <Route path="funnels" element={<DashboardFunnels />} />
                <Route path="funnels/:funnelId" element={<FunnelDetailPage />} />
                <Route path="forms" element={<DashboardForms />} />
                <Route path="forms/:formId" element={<FormBuilder />} />
                <Route path="bookings" element={<BookingsWorkspaceLayout />}>
                  <Route index element={<BookingsOverview />} />
                  <Route path="calendar" element={<BookingsCalendar />} />
                  <Route path="types" element={<BookingsTypes />} />
                  <Route path="pages" element={<BookingsPages />} />
                </Route>
                <Route path="ads" element={<AdsWorkspaceLayout />}>
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<AdsOverview />} />
                  <Route path="accounts" element={<AdsAccounts />} />
                  {/* Sections still in build-out fall back to the overview. */}
                  <Route path="*" element={<Navigate to="overview" replace />} />
                </Route>


                
                <Route path="messages" element={<DashboardMessages />} />
                <Route path="commerce" element={<CommerceLayout />}>
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<CommerceOverview />} />
                  <Route path="products" element={<CommerceProducts />} />
                  <Route path="orders" element={<CommerceOrders />} />
                  <Route path="customers" element={<CommerceCustomers />} />
                  <Route path="community" element={<CommerceCommunity />} />
                  <Route path="access" element={<CommerceAccess />} />
                  <Route path="storefront" element={<CommerceStorefront />} />
                  <Route path="settings" element={<CommerceSettings />} />
                </Route>
                <Route path="analytics" element={<DashboardAnalytics />} />
                <Route path="my-automations" element={<MyAutomations />} />
                <Route path="my-automations/:projectId" element={<StoreProjectDetail />} />
                <Route path="settings" element={<DashboardSettings />} />
                <Route path="settings/*" element={<DashboardSettings />} />
                <Route element={<AdminGuard />}>
                  <Route path="workflows" element={<DashboardWorkflows />} />
                  <Route path="workflows/new" element={<WorkflowEditor />} />
                  <Route path="workflows/:workflowId" element={<WorkflowEditor />} />
                  <Route path="admin" element={<AdminDashboard />} />
                  <Route path="admin/blog" element={<AdminBlogManager />} />
                  <Route path="admin/smart-actions" element={<AdminSmartActions />} />
                  <Route path="admin/pricing" element={<AdminPricing />} />
                  <Route path="admin/store-orders" element={<AdminStoreOrders />} />
                  <Route path="admin/store-catalogue" element={<AdminStoreCatalogue />} />
                  <Route path="admin/communication" element={<AdminCommunicationOverview />} />
                  <Route path="admin/communication/organisations" element={<AdminOrganisations />} />
                  <Route path="admin/communication/organisations/:orgId" element={<AdminOrgDetail />} />
                  <Route path="admin/sender-approvals" element={<AdminSenderApprovals />} />
                  <Route path="admin/usage" element={<AdminUsage />} />
                  <Route path="admin/credit-packages" element={<AdminCreditPackages />} />
                  <Route path="admin/messages" element={<AdminMessagesInbox />} />
                  <Route path="admin/roi-calculator-submissions" element={<DashboardRoiSubmissions />} />
                  <Route path="roi-calculator-submissions" element={<DashboardRoiSubmissions />} />
                </Route>
                <Route index element={<Navigate to="overview" replace />} />
              </Route>

              {/* Public workspace storefronts */}
              <Route path="/s/:storeSlug" element={<StorefrontHome />} />
              <Route path="/s/:storeSlug/p/:productSlug" element={<StorefrontProduct />} />
              <Route path="/s/:storeSlug/checkout" element={<StorefrontCheckout />} />
              <Route path="/s/:storeSlug/order/:orderId" element={<StorefrontOrder />} />
              <Route path="/s/:storeSlug/account" element={<StorefrontAccount />} />
              <Route path="/s/:storeSlug/community" element={<StorefrontCommunities />} />
              <Route path="/s/:storeSlug/community/:communitySlug" element={<StorefrontCommunity />} />

              {/* Stripe Connect OAuth return (canonical + legacy alias) */}
              <Route path="/stripe/connect/callback" element={<StripeConnectCallback />} />
              <Route path="/callback/stripe-connect" element={<StripeConnectCallback />} />

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
            <CartLauncher />
            <InactivityManager />
            <ChatbotWidget />
            <CookieConsentBanner />
          </WorkspaceProvider>
          </CartProvider>
          </CurrencyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

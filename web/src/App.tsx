import React, { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { LangProvider } from "./lib/LanguageContext";
import { AppProvider } from "./lib/AppContext";
import { ToastProvider } from "./components/ui/Toast";
import { ConfirmProvider } from "./components/ui/ConfirmDialog";
import AdminLayout from "./layouts/AdminLayout";
import PublicLayout from "./layouts/PublicLayout";
import RequireAuth from "./components/RequireAuth";
import { Loader2 } from "lucide-react"; // Global Loading fallback
const LoadingFallback = () => (
  <div className="w-full h-screen flex flex-col items-center justify-center bg-secondary">
    {" "}
    <Loader2 className="w-8 h-8 animate-spin text-premium-muted" />{" "}
  </div>
); // New scaffolded routes

function AuthAliasRedirect({ to }: { to: string }) {
  const location = useLocation();
  return (
    <Navigate
      to={{ pathname: to, search: location.search, hash: location.hash }}
      state={location.state}
      replace
    />
  );
}

const Legal = lazy(() => import("./pages/public/Legal"));
import ErrorPage from "./pages/ErrorPage";
import { OAuthCallback, PaymentCallback } from "./pages/auth/Callbacks";
const SecurityCenter = lazy(() => import("./pages/user/SecurityCenter"));
const Redeem = lazy(() => import("./pages/user/Redeem"));
const UserModels = lazy(() => import("./pages/user/UserModels"));
const Quota = lazy(() => import("./pages/user/Quota")); // 1. Public Pages
const PublicHome = lazy(() => import("./pages/public/Home"));
const Pricing = lazy(() => import("./pages/public/Pricing"));
const ModelDetails = lazy(() => import("./pages/public/ModelDetails"));
const Rankings = lazy(() => import("./pages/public/Rankings"));
const About = lazy(() => import("./pages/public/About"));
const Docs = lazy(() => import("./pages/public/Docs")); // 2. Auth Pages
import Auth from "./pages/Auth";
const Setup = lazy(() => import("./pages/auth/Setup"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const Otp = lazy(() => import("./pages/auth/Otp"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword")); // 3. User & Core Features
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Keys = lazy(() => import("./pages/Keys"));
const Logs = lazy(() => import("./pages/Logs"));
const Chat = lazy(() => import("./pages/user/Chat"));
const Usage = lazy(() => import("./pages/user/Usage"));
const Wallet = lazy(() => import("./pages/user/Wallet"));
const ChatHistory = lazy(() => import("./pages/user/ChatHistory"));
const Chat2Link = lazy(() => import("./pages/user/Chat2Link"));
const MidjourneyHistory = lazy(() => import("./pages/user/MidjourneyHistory"));
const Subscriptions = lazy(() => import("./pages/user/Subscriptions"));
const Profile = lazy(() => import("./pages/user/Profile"));
const UserSettings = lazy(() => import("./pages/user/Settings"));
const Vendors = lazy(() => import("./pages/admin/Vendors"));
const RedemptionCodes = lazy(() => import("./pages/admin/RedemptionCodes"));
const Fingerprints = lazy(() => import("./pages/admin/Fingerprints"));
const ActiveTasks = lazy(() => import("./pages/admin/ActiveTasks"));
const Operations = lazy(() => import("./pages/admin/Operations"));
const Deployments = lazy(() => import("./pages/admin/Deployments"));
const PrefillGroups = lazy(() => import("./pages/admin/PrefillGroups"));
const Permissions = lazy(() => import("./pages/admin/Permissions"));
const OAuthProviders = lazy(() => import("./pages/admin/OAuthProviders"));
const DeploymentDetails = lazy(() => import("./pages/admin/DeploymentDetails"));
const DataReports = lazy(() => import("./pages/admin/DataReports"));
const SystemInfo = lazy(() => import("./pages/admin/SystemInfo"));
const SystemSettings = lazy(() => import("./pages/admin/SystemSettings"));
const Topups = lazy(() => import("./pages/admin/Topups"));
const Diagnostics = lazy(() => import("./pages/admin/Diagnostics"));
import {
  TaskRecords,
  MidjourneyRecords,
  UserTaskRecords,
} from "./pages/admin/TaskRecords";
const Groups = lazy(() => import("./pages/admin/Groups"));
const SubscriptionPlans = lazy(() => import("./pages/admin/SubscriptionPlans"));
const UserSubscriptions = lazy(() => import("./pages/admin/UserSubscriptions"));
const RatioConfig = lazy(() => import("./pages/admin/RatioConfig"));
const WaffoPancake = lazy(() => import("./pages/admin/WaffoPancake"));
const TwoFactor = lazy(() => import("./pages/admin/TwoFactor"));
const ChannelAffinity = lazy(() => import("./pages/admin/ChannelAffinity"));
const Users = lazy(() => import("./pages/Users"));
const Channels = lazy(() => import("./pages/Channels"));
const Models = lazy(() => import("./pages/Models"));
const TaskPlugins = lazy(() => import("./pages/admin/TaskPlugins"));
import AppErrorBoundary from "./components/ui/AppErrorBoundary";
import ThemeRuntime from "./components/ThemeRuntime";
function App() {
  return (
    <AppProvider>
      <LangProvider>
        <ThemeRuntime />
        <ToastProvider>
          <ConfirmProvider>
            <AppErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                {" "}
                <BrowserRouter>
                  {" "}
                  <Routes>
                    {" "}
                    {/* Public Routes */}{" "}
                    <Route path="/" element={<PublicLayout />}>
                      {" "}
                      <Route index element={<PublicHome />} />{" "}
                      <Route path="pricing" element={<Pricing />} />{" "}
                      <Route
                        path="pricing/:modelId"
                        element={<ModelDetails />}
                      />{" "}
                      <Route path="rankings" element={<Rankings />} />{" "}
                      <Route path="about" element={<About />} />{" "}
                      <Route path="docs" element={<Docs />} />{" "}
                      <Route path="terms" element={<Legal type="terms" />} />{" "}
                      <Route
                        path="user-agreement"
                        element={<Legal type="terms" />}
                      />{" "}
                      <Route
                        path="privacy"
                        element={<Legal type="privacy" />}
                      />{" "}
                      <Route
                        path="privacy-policy"
                        element={<Legal type="privacy" />}
                      />{" "}
                    </Route>{" "}
                    <Route path="/setup" element={<Setup />} />{" "}
                    {/* Auth Routes */}{" "}
                    <Route path="/login" element={<Auth />} />{" "}
                    <Route
                      path="/sign-in"
                      element={<AuthAliasRedirect to="/login" />}
                    />{" "}
                    <Route
                      path="/sign-up"
                      element={<Auth defaultMode="register" />}
                    />{" "}
                    <Route
                      path="/register"
                      element={<AuthAliasRedirect to="/sign-up" />}
                    />{" "}
                    <Route
                      path="/forgot-password"
                      element={<ForgotPassword />}
                    />{" "}
                    <Route path="/reset" element={<ResetPassword />} />{" "}
                    <Route path="/user/reset" element={<ResetPassword />} />{" "}
                    <Route path="/auth/user/reset" element={<ResetPassword />} />{" "}
                    <Route path="/otp" element={<Otp />} />{" "}
                    <Route path="/oauth/:provider" element={<OAuthCallback />} />{" "}
                    <Route path="/oauth/callback" element={<OAuthCallback />} />{" "}
                    <Route
                      path="/payment/callback"
                      element={<PaymentCallback />}
                    />{" "}
                    <Route path="/console/topup" element={<Wallet />} />{" "}
                    {/* Main Admin / User Layout */}{" "}
                    <Route path="/" element={<AdminLayout />}>
                      {" "}
                      <Route path="dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />{" "}
                      <Route path="dashboard/overview" element={<RequireAuth><Dashboard /></RequireAuth>} />{" "}
                      <Route path="dashboard/models" element={<RequireAuth><Dashboard /></RequireAuth>} />{" "}
                      <Route path="dashboard/users" element={<RequireAuth adminOnly><Dashboard /></RequireAuth>} />{" "}
                      <Route path="playground" element={<RequireAuth><Chat /></RequireAuth>} />{" "}
                      <Route path="chat" element={<RequireAuth><Chat /></RequireAuth>} />{" "}
                      <Route path="chat/:id" element={<RequireAuth><Chat /></RequireAuth>} />{" "}
                      <Route path="chat2link" element={<RequireAuth><Chat2Link /></RequireAuth>} />{" "}
                      <Route path="keys" element={<RequireAuth><Keys /></RequireAuth>} />{" "}
                      <Route path="usage-logs" element={<RequireAuth><Logs /></RequireAuth>} />{" "}
                      <Route path="usage-logs/common" element={<RequireAuth><Logs /></RequireAuth>} />{" "}
                      <Route path="usage-logs/audit" element={<RequireAuth><Logs /></RequireAuth>} />{" "}
                      <Route path="usage-logs/task" element={<RequireAuth><UserTaskRecords /></RequireAuth>} />{" "}
                      <Route path="usage-logs/drawing" element={<RequireAuth><MidjourneyHistory /></RequireAuth>} />{" "}
                      <Route path="usage" element={<RequireAuth><Usage /></RequireAuth>} />{" "}
                      <Route path="wallet" element={<RequireAuth><Wallet /></RequireAuth>} />{" "}
                      <Route path="chat-history" element={<RequireAuth><ChatHistory /></RequireAuth>} />{" "}
                      <Route
                        path="task-history"
                        element={<RequireAuth><UserTaskRecords /></RequireAuth>}
                      />{" "}
                      <Route
                        path="midjourney-history"
                        element={<RequireAuth><MidjourneyHistory /></RequireAuth>}
                      />{" "}
                      <Route path="subscriptions" element={<RequireAuth><Subscriptions /></RequireAuth>} />{" "}
                      <Route path="profile" element={<RequireAuth><Profile /></RequireAuth>} />{" "}
                      <Route path="settings" element={<RequireAuth><UserSettings /></RequireAuth>} />{" "}
                      <Route path="security" element={<RequireAuth><SecurityCenter /></RequireAuth>} />{" "}
                      <Route path="redeem" element={<RequireAuth><Redeem /></RequireAuth>} />{" "}
                      <Route path="user-models" element={<RequireAuth><UserModels /></RequireAuth>} />{" "}
                      <Route path="quota" element={<RequireAuth><Quota /></RequireAuth>} />{" "}
                      {/* Scaffolded Admin Views */}{" "}
                      <Route path="users" element={<RequireAuth adminOnly><Users /></RequireAuth>} />{" "}
                      <Route path="channels" element={<RequireAuth adminOnly><Channels /></RequireAuth>} />{" "}
                      <Route path="models" element={<RequireAuth adminOnly><Models /></RequireAuth>} />{" "}
                      <Route path="models/metadata" element={<RequireAuth adminOnly><Models /></RequireAuth>} />{" "}
                      <Route path="models/deployments" element={<RequireAuth adminOnly><Deployments /></RequireAuth>} />{" "}
                      <Route path="vendors" element={<RequireAuth adminOnly><Vendors /></RequireAuth>} />{" "}
                      <Route
                        path="redemption-codes"
                        element={<RequireAuth adminOnly><RedemptionCodes /></RequireAuth>}
                      />{" "}
                      <Route path="fingerprints" element={<RequireAuth adminOnly><Fingerprints /></RequireAuth>} />{" "}
                      <Route path="active-tasks" element={<RequireAuth adminOnly><ActiveTasks /></RequireAuth>} />{" "}
                      <Route path="system-info" element={<RequireAuth adminOnly><SystemInfo /></RequireAuth>} />{" "}
                      <Route path="task-plugins" element={<RequireAuth adminOnly><TaskPlugins /></RequireAuth>} />{" "}
                      <Route path="operations" element={<RequireAuth adminOnly><Operations /></RequireAuth>} />{" "}
                      <Route path="deployments" element={<RequireAuth adminOnly><Deployments /></RequireAuth>} />{" "}
                      <Route
                        path="deployments/:id"
                        element={<RequireAuth adminOnly><DeploymentDetails /></RequireAuth>}
                      />{" "}
                      <Route
                        path="prefill-groups"
                        element={<RequireAuth adminOnly><PrefillGroups /></RequireAuth>}
                      />{" "}
                      <Route path="permissions" element={<RequireAuth adminOnly><Permissions /></RequireAuth>} />{" "}
                      <Route
                        path="oauth-providers"
                        element={<RequireAuth adminOnly><OAuthProviders /></RequireAuth>}
                      />{" "}
                      <Route path="data-reports" element={<RequireAuth adminOnly><DataReports /></RequireAuth>} />{" "}
                      <Route path="topups" element={<RequireAuth adminOnly><Topups /></RequireAuth>} />{" "}
                      <Route path="diagnostics" element={<RequireAuth adminOnly><Diagnostics /></RequireAuth>} />{" "}
                      <Route path="task-records" element={<RequireAuth adminOnly><TaskRecords /></RequireAuth>} />{" "}
                      <Route
                        path="midjourney-tasks"
                        element={<RequireAuth adminOnly><MidjourneyRecords /></RequireAuth>}
                      />{" "}
                      <Route path="groups" element={<RequireAuth adminOnly><Groups /></RequireAuth>} />{" "}
                      <Route
                        path="subscription-plans"
                        element={<RequireAuth adminOnly><SubscriptionPlans /></RequireAuth>}
                      />{" "}
                      <Route
                        path="user-subscriptions"
                        element={<RequireAuth adminOnly><UserSubscriptions /></RequireAuth>}
                      />{" "}
                      <Route
                        path="channel-affinity"
                        element={<RequireAuth adminOnly><ChannelAffinity /></RequireAuth>}
                      />{" "}
                      <Route path="ratio-config" element={<RequireAuth adminOnly><RatioConfig /></RequireAuth>} />{" "}
                      <Route path="waffo-pancake" element={<RequireAuth adminOnly><WaffoPancake /></RequireAuth>} />{" "}
                      <Route path="two-factor" element={<RequireAuth adminOnly><TwoFactor /></RequireAuth>} />{" "}
                      <Route
                        path="system-settings"
                        element={<RequireAuth adminOnly><SystemSettings /></RequireAuth>}
                      />{" "}
                      <Route
                        path="system-settings/*"
                        element={<RequireAuth adminOnly><SystemSettings /></RequireAuth>}
                      />{" "}
                      <Route path="401" element={<ErrorPage code={401} />} />{" "}
                      <Route path="403" element={<ErrorPage code={403} />} />{" "}
                      <Route path="404" element={<ErrorPage code={404} />} />{" "}
                      <Route path="500" element={<ErrorPage code={500} />} />{" "}
                      <Route path="503" element={<ErrorPage code={503} />} />{" "}
                      <Route path="*" element={<ErrorPage code={404} />} />{" "}
                    </Route>{" "}
                  </Routes>{" "}
                </BrowserRouter>{" "}
              </Suspense>
            </AppErrorBoundary>
          </ConfirmProvider>
        </ToastProvider>
      </LangProvider>
    </AppProvider>
  );
}
export default App;

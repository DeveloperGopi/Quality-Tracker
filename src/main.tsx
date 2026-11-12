import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const SystemMapPage = lazy(() => import("./pages/SystemMap.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const CustomPage = lazy(() => import("./pages/CustomPage.tsx"));
const FacilityList = lazy(() => import("./pages/FacilityList.tsx"));
const FacilityRouteDispatcher = lazy(() => import("./pages/FacilityRouteDispatcher.tsx"));
const ReportsPage = lazy(() => import("./pages/Reports.tsx"));
const GeneratePptPage = lazy(() => import("./pages/GeneratePpt.tsx"));
const NqasSummaryReportPage = lazy(() => import("./pages/NqasSummaryReport.tsx"));
const CustomReportPage = lazy(() => import("./pages/CustomReport.tsx"));
const BulkImportPage = lazy(() => import("./pages/BulkImport.tsx"));
const IaImportPage = lazy(() => import("./pages/IaImport.tsx"));
const LinksOrganiserPage = lazy(() => import("./pages/LinksOrganiser.tsx"));
const DocumentLibraryPage = lazy(() => import("./pages/DocumentLibrary.tsx"));
const PendingFollowUpPage = lazy(() => import("./pages/PendingFollowUp.tsx"));
const BlockComparePage = lazy(() => import("./pages/BlockCompare.tsx"));
const AdminPage = lazy(() => import("./pages/Admin.tsx"));
const GuidePage = lazy(() => import("./pages/Guide.tsx"));
const ShareCopyPage = lazy(() => import("./pages/ShareCopy.tsx"));
const ShareFilePage = lazy(() =>
  import("./pages/ShareCopy.tsx").then((m) => ({ default: m.ShareFile })),
);
const ShareDocumentPage = lazy(() =>
  import("./pages/ShareCopy.tsx").then((m) => ({ default: m.ShareDocument })),
);
const ProfilePage = lazy(() => import("./pages/Profile.tsx"));
// Google's OAuth landing pad for the Drive connection — a REAL route so the
// browser never falls into the catch-all 404 after the consent screen.
const DriveOauthCallbackPage = lazy(
  () => import("./pages/DriveOauthCallback.tsx"),
);

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/dashboard" />}
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/system-map"
                element={
                  <RequireAuth>
                    <SystemMapPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/facilities"
                element={
                  <RequireAuth>
                    <FacilityList />
                  </RequireAuth>
                }
              />
              {/* /facilities/<category> → category quick-view pages (state
                  assessment, recertification, fire-noc, …); /facilities/<id>
                  → facility profile. Resolved by FacilityRouteDispatcher. */}
              <Route
                path="/facilities/*"
                element={
                  <RequireAuth>
                    <FacilityRouteDispatcher />
                  </RequireAuth>
                }
              />
              {/* Legacy tracker URLs redirect to their category quick-view
                  pages so old links and bookmarks keep working. */}
              <Route path="/funds" element={<Navigate to="/facilities/fund" replace />} />
              <Route path="/fire-noc" element={<Navigate to="/facilities/fire-noc" replace />} />
              <Route path="/buildings" element={<Navigate to="/facilities/building" replace />} />
              <Route
                path="/reports"
                element={
                  <RequireAuth>
                    <ReportsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/summary-report"
                element={
                  <RequireAuth>
                    <NqasSummaryReportPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/custom-report"
                element={
                  <RequireAuth>
                    <CustomReportPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/generate-ppt"
                element={
                  <RequireAuth>
                    <GeneratePptPage />
                  </RequireAuth>
                }
              />
              {/* Bulk Import — the ONE import hub now. Cards + shared history.
                  Deep links: /bulk-import/saqsham, /bulk-import/internal-assessment. */}
              <Route
                path="/bulk-import"
                element={
                  <RequireAuth>
                    <BulkImportPage />
                  </RequireAuth>
                }
              />
              {/* Part 5 deep link: the Facility master wizard opens in place. */}
              <Route
                path="/bulk-import/facility-master"
                element={
                  <RequireAuth>
                    <BulkImportPage initialKind="facility-master" />
                  </RequireAuth>
                }
              />
              <Route
                path="/bulk-import/saqsham"
                element={
                  <RequireAuth>
                    <BulkImportPage initialKind="saqsham" />
                  </RequireAuth>
                }
              />
              <Route
                path="/bulk-import/internal-assessment"
                element={
                  <RequireAuth>
                    <IaImportPage />
                  </RequireAuth>
                }
              />
              {/* OLD URLs redirect (Part B ④). */}
              <Route
                path="/import"
                element={<Navigate to="/bulk-import" replace />}
              />
              <Route
                path="/import/saqsham"
                element={<Navigate to="/bulk-import/saqsham" replace />}
              />
              <Route
                path="/import/ia"
                element={<Navigate to="/bulk-import/internal-assessment" replace />}
              />
              {/* Links Organiser — the searchable report/data-collection link
                  register. The page enforces visibility on the server; this
                  route only requires a signed-in account. */}
              <Route
                path="/pending"
                element={
                  <RequireAuth>
                    <PendingFollowUpPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/block-compare"
                element={
                  <RequireAuth>
                    <BlockComparePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/p/:slug"
                element={
                  <RequireAuth>
                    <CustomPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/links"
                element={
                  <RequireAuth>
                    <LinksOrganiserPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/documents"
                element={
                  <RequireAuth>
                    <DocumentLibraryPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/guide"
                element={
                  <RequireAuth>
                    <GuidePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <AdminPage />
                  </RequireAuth>
                }
              />
              {/* Part I ① — the Google Drive settings have their own URL; the
                  old /admin page keeps working as the single implementation. */}
              {/* Part I ① — every tab has its own deep link. The old
                  /admin page stays the single implementation. */}
              <Route
                path="/admin/google-drive"
                element={
                  <RequireAuth>
                    <AdminPage initialTab="google-drive" />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/documents"
                element={
                  <RequireAuth>
                    <AdminPage initialTab="documents" />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/general"
                element={
                  <RequireAuth>
                    <AdminPage initialTab="master-data" />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/table-display"
                element={
                  <RequireAuth>
                    <AdminPage initialTab="workspace" initialSection="display" />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/links"
                element={
                  <RequireAuth>
                    <AdminPage initialTab="links" />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RequireAuth>
                    <AdminPage initialTab="users" />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <RequireAuth>
                    <AdminPage initialTab="maintenance" />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/data-checks"
                element={
                  <RequireAuth>
                    <AdminPage initialTab="data-checks" />
                  </RequireAuth>
                }
              />
              {/* Part 5 — the signed-in user's own profile. */}
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />
              {/* Google Drive OAuth callback — finishing the connection needs
                  a State Admin session; RequireAuth keeps the code + state in
                  returnTo if the session expired during consent. */}
              <Route
                path="/drive/oauth/callback"
                element={
                  <RequireAuth>
                    <DriveOauthCallbackPage />
                  </RequireAuth>
                }
              />
              {/* QR / share links — deliberately PUBLIC: a scan must open
                  the printed sheet with no sign-in (unless Admin → Shared
                  reports requires one). `/r/<token>/file` streams the bytes. */}
              <Route path="/r/:token" element={<ShareCopyPage />} />
              <Route
                path="/r/:token/file"
                element={<ShareFilePage />}
              />
              {/* Part 3 — one document of that snapshot, directly. */}
              <Route path="/r/:token/d/:docToken" element={<ShareDocumentPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);

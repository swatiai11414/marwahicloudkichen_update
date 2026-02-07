import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuth } from "@/hooks/use-auth";
import { FullPageLoader } from "@/components/loading-spinner";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import ShopPage from "@/pages/shop/shop-page";
import SuperAdminLogin from "@/pages/login/super-admin-login";
import ShopAdminLogin from "@/pages/login/shop-admin-login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminMenu from "@/pages/admin/menu";
import AdminOrders from "@/pages/admin/orders";
import AdminCustomers from "@/pages/admin/customers";
import AdminOffers from "@/pages/admin/offers";
import AdminSettings from "@/pages/admin/settings";
import AdminSections from "@/pages/admin/sections";
import SuperAdminDashboard from "@/pages/super-admin/dashboard";
import SuperAdminShops from "@/pages/super-admin/shops";
import SuperAdminThemes from "@/pages/super-admin/themes";
import SuperAdminAnalytics from "@/pages/super-admin/analytics";
import SuperAdminUserData from "@/pages/super-admin/user-data";
import SuperAdminOrders from "@/pages/super-admin/orders";
import SuperAdminOffers from "@/pages/super-admin/offers";
import MyOrdersPage from "@/pages/shop/my-orders";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TermsConditionsPage from "@/pages/terms-conditions";
import ContactPage from "@/pages/contact";

function ProtectedRoute({ 
  children, 
  requireSuperAdmin = false 
}: { 
  children: React.ReactNode; 
  requireSuperAdmin?: boolean;
}) {
  const { isAuthenticated, isLoading, isSuperAdmin, isShopAdmin } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    window.location.href = requireSuperAdmin ? "/login/super-admin" : "/login/shop-admin";
    return <FullPageLoader />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    window.location.href = "/login/super-admin";
    return <FullPageLoader />;
  }

  if (!requireSuperAdmin && !isSuperAdmin && !isShopAdmin) {
    window.location.href = "/login/shop-admin";
    return <FullPageLoader />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      
      {/* Static Pages */}
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms-conditions" component={TermsConditionsPage} />
      <Route path="/contact" component={ContactPage} />
      
      {/* Login Routes */}
      <Route path="/login/super-admin" component={SuperAdminLogin} />
      <Route path="/login/shop-admin" component={ShopAdminLogin} />
      
      {/* Public Shop Page */}
      <Route path="/s/:slug" component={ShopPage} />
      <Route path="/s/:slug/my-orders" component={MyOrdersPage} />
      
      {/* Shop Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/menu">
        <ProtectedRoute>
          <AdminMenu />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/orders">
        <ProtectedRoute>
          <AdminOrders />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/customers">
        <ProtectedRoute>
          <AdminCustomers />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/offers">
        <ProtectedRoute>
          <AdminOffers />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute>
          <AdminSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/sections">
        <ProtectedRoute>
          <AdminSections />
        </ProtectedRoute>
      </Route>
      
      {/* Super Admin Routes */}
      <Route path="/super-admin">
        <ProtectedRoute requireSuperAdmin>
          <SuperAdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/shops">
        <ProtectedRoute requireSuperAdmin>
          <SuperAdminShops />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/themes">
        <ProtectedRoute requireSuperAdmin>
          <SuperAdminThemes />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/analytics">
        <ProtectedRoute requireSuperAdmin>
          <SuperAdminAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/user-data">
        <ProtectedRoute requireSuperAdmin>
          <SuperAdminUserData />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/orders">
        <ProtectedRoute requireSuperAdmin>
          <SuperAdminOrders />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/offers">
        <ProtectedRoute requireSuperAdmin>
          <SuperAdminOffers />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="hdos-theme">
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

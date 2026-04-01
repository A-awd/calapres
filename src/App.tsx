import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CityProvider } from "@/contexts/CityContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { AuthProvider } from "@/hooks/useAuth";

// Eager load: homepage only
import Index from "./pages/Index";

// Lazy load: everything else
const Cart = lazy(() => import("./pages/Cart"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const BundleBuilder = lazy(() => import("./pages/BundleBuilder"));
const Collections = lazy(() => import("./pages/Collections"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Account = lazy(() => import("./pages/Account"));
const Ramadan = lazy(() => import("./pages/Ramadan"));
const OccasionLanding = lazy(() => import("./pages/OccasionLanding"));
const DesignYourGift = lazy(() => import("./pages/DesignYourGift"));
const OccasionReminders = lazy(() => import("./pages/OccasionReminders"));
const FAQ = lazy(() => import("./pages/FAQ"));
const About = lazy(() => import("./pages/About"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminCatalog = lazy(() => import("./pages/admin/AdminCatalog"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminEmailStats = lazy(() => import("./pages/admin/AdminEmailStats"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements"));
const AdminBulkUpload = lazy(() => import("./pages/admin/AdminBulkUpload"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes cache
      retry: 1,
    },
  },
});

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <CityProvider>
          <WishlistProvider>
            <CartProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Suspense fallback={<Loading />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/product/:id" element={<ProductDetail />} />
                      <Route path="/bundle-builder" element={<BundleBuilder />} />
                      <Route path="/collections" element={<Collections />} />
                      <Route path="/collections/:categorySlug" element={<Collections />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/order-success" element={<OrderSuccess />} />
                      <Route path="/track-order" element={<OrderTracking />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/ramadan" element={<Ramadan />} />
                      <Route path="/occasion/:slug" element={<OccasionLanding />} />
                      <Route path="/design-your-gift" element={<DesignYourGift />} />
                      <Route path="/occasion-reminders" element={<OccasionReminders />} />
                      <Route path="/faq" element={<FAQ />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/admin" element={<AdminLogin />} />
                      <Route path="/admin/dashboard" element={<AdminDashboard />} />
                      <Route path="/admin/orders" element={<AdminOrders />} />
                      <Route path="/admin/catalog" element={<AdminCatalog />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/admin/coupons" element={<AdminCoupons />} />
                      <Route path="/admin/email-stats" element={<AdminEmailStats />} />
                      <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                      <Route path="/admin/bulk-upload" element={<AdminBulkUpload />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </TooltipProvider>
            </CartProvider>
          </WishlistProvider>
        </CityProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;

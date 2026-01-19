import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  LogOut,
  Bell,
  Menu,
  Store,
  Loader2,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import logo from '@/assets/logo.png';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', href: '/admin/dashboard' },
  { icon: ShoppingCart, label: 'الطلبات', href: '/admin/orders' },
  { icon: Package, label: 'الكتالوج', href: '/admin/catalog' },
  { icon: Users, label: 'المستخدمون', href: '/admin/users' },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { adminUser, isAdmin, loading, logout } = useAdminAuth();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Redirect to login if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/admin');
    }
  }, [loading, isAdmin, navigate]);

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (href: string) => {
    if (href === '/admin/catalog') {
      return ['/admin/catalog', '/admin/products', '/admin/bundles', '/admin/categories', '/admin/occasions'].some(p => location.pathname.startsWith(p));
    }
    return location.pathname === href;
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-sidebar-border">
        <Link to="/admin/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
          <img src={logo} alt="كالابريز" className="h-8 lg:h-10 w-auto brightness-150" />
          <span className="font-display text-base lg:text-lg font-bold text-white">
            كالابريز
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg transition-colors text-sm lg:text-base ${
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 lg:p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3 lg:mb-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-sidebar-primary rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sidebar-primary-foreground font-bold text-sm lg:text-base">
              {adminUser?.email?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{adminUser?.email || 'مدير'}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate capitalize">
              {adminUser?.roles.join(', ') || 'مدير النظام'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 me-2" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 bg-sidebar text-sidebar-foreground flex-col fixed h-full z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-sidebar-accent">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 bg-sidebar border-sidebar-border">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <img src={logo} alt="كالابريز" className="h-7 w-auto brightness-150" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-sidebar-accent relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
          </Button>
          <Button variant="ghost" size="icon" asChild className="text-white/70 hover:text-white hover:bg-sidebar-accent">
            <Link to="/"><Store className="w-5 h-5" /></Link>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="lg:me-60 min-h-screen">
        {/* Desktop Top bar */}
        <header className="hidden lg:flex bg-card border-b border-border sticky top-0 z-40 items-center justify-between px-6 py-4">
          <h1 className="text-xl font-display font-bold">{title}</h1>
          <div className="flex items-center gap-3">
            <button className="relative p-2 hover:bg-secondary rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <Store className="w-4 h-4 me-2" />
                عرض المتجر
              </Link>
            </Button>
          </div>
        </header>

        {/* Mobile title bar */}
        <div className="lg:hidden bg-card border-b border-border sticky top-14 z-30 px-4 py-3">
          <h1 className="text-lg font-display font-bold">{title}</h1>
        </div>

        {/* Page content */}
        <div className="p-4 lg:p-6 pt-4 lg:pt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  LogOut,
  Bell,
  Menu,
  Store,
  Loader2,
  Users,
  ChevronLeft,
  Ticket
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
  { icon: Ticket, label: 'الكوبونات', href: '/admin/coupons' },
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

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-charcoal">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link to="/admin/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
          <img src={logo} alt="كالابريز" className="h-10 w-auto brightness-150" />
          <div>
            <span className="font-display text-lg font-bold text-white block">
              كالابريز
            </span>
            <span className="text-[10px] text-white/50 tracking-widest uppercase">لوحة التحكم</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                active
                  ? 'bg-gold/20 text-gold'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'text-gold' : ''}`} />
              <span className="font-medium">{item.label}</span>
              {active && <ChevronLeft className="w-4 h-4 mr-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-lg">
          <div className="w-10 h-10 bg-gradient-to-br from-gold to-gold-light rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-charcoal font-bold">
              {adminUser?.email?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-white truncate">{adminUser?.email || 'مدير'}</p>
            <p className="text-xs text-white/40 truncate capitalize">
              {adminUser?.roles.join(', ') || 'مدير النظام'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-white/50 hover:text-white hover:bg-white/5 border border-white/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 me-2" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-charcoal flex-col fixed h-full z-40 shadow-elegant">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-charcoal h-16 flex items-center justify-between px-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 bg-charcoal border-charcoal-light">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <img src={logo} alt="كالابريز" className="h-8 w-auto brightness-150" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-gold rounded-full" />
          </Button>
          <Button variant="ghost" size="icon" asChild className="text-white/60 hover:text-white hover:bg-white/10">
            <Link to="/"><Store className="w-5 h-5" /></Link>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="lg:me-64 min-h-screen">
        {/* Desktop Top bar */}
        <header className="hidden lg:flex bg-white border-b border-border/50 sticky top-0 z-40 items-center justify-between px-8 py-5 shadow-soft">
          <h1 className="text-2xl font-display font-bold text-charcoal">{title}</h1>
          <div className="flex items-center gap-4">
            <button className="relative p-2.5 hover:bg-secondary rounded-lg transition-colors border border-border/50">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-gold rounded-full" />
            </button>
            <Button variant="outline" className="btn-gold" asChild>
              <Link to="/">
                <Store className="w-4 h-4 me-2" />
                عرض المتجر
              </Link>
            </Button>
          </div>
        </header>

        {/* Mobile title bar */}
        <div className="lg:hidden bg-white border-b border-border/50 sticky top-16 z-30 px-4 py-4 shadow-soft">
          <h1 className="text-lg font-display font-bold text-charcoal">{title}</h1>
        </div>

        {/* Page content */}
        <div className="p-4 lg:p-8 pt-6 lg:pt-8 bg-ivory min-h-[calc(100vh-80px)]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

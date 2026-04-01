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
  Users,
  ChevronLeft,
  ChevronRight,
  Ticket,
  BarChart3,
  Settings,
  FolderTree,
  Gift,
  Calendar,
  Search,
  X,
  Mail,
  ImagePlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import logo from '@/assets/logo.png';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const menuGroups = [
  {
    title: 'القائمة الرئيسية',
    items: [
      { icon: LayoutDashboard, label: 'لوحة التحكم', href: '/admin/dashboard' },
      { icon: BarChart3, label: 'التحليلات', href: '/admin/analytics', disabled: true },
      { icon: ShoppingCart, label: 'الطلبات', href: '/admin/orders' },
      { icon: Users, label: 'العملاء', href: '/admin/users' },
    ]
  },
  {
    title: 'المنتجات',
    items: [
      { icon: Package, label: 'إدارة المنتجات', href: '/admin/catalog' },
      { icon: FolderTree, label: 'الفئات', href: '/admin/catalog' },
      { icon: Gift, label: 'الباقات', href: '/admin/catalog' },
      { icon: ImagePlus, label: 'رفع جماعي للصور', href: '/admin/bulk-upload' },
    ]
  },
  {
    title: 'التسويق والمبيعات',
    items: [
      { icon: Ticket, label: 'الكوبونات والعروض', href: '/admin/coupons' },
      { icon: Calendar, label: 'الحملات', href: '/admin/campaigns', disabled: true },
    ]
  },
  {
    title: 'التقارير',
    items: [
      { icon: Mail, label: 'إحصائيات الإيميلات', href: '/admin/email-stats' },
    ]
  },
  {
    title: 'المحتوى',
    items: [
      { icon: LayoutDashboard, label: 'الشريط العلوي', href: '/admin/announcements' },
    ]
  },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { adminUser, isAdmin, loading, logout } = useAdminAuth();

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full bg-white border-l border-gray-100">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <Link 
          to="/admin/dashboard" 
          className="flex items-center gap-3" 
          onClick={() => mobile && setSidebarOpen(false)}
        >
          <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center">
            <img src={logo} alt="كالابريز" className="h-6 w-auto brightness-150" />
          </div>
          {(!sidebarCollapsed || mobile) && (
            <span className="font-bold text-lg text-gray-900">كالابريز</span>
          )}
        </Link>
        {!mobile && (
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <ChevronLeft className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        {menuGroups.map((group, gi) => (
          <div key={gi} className="mb-4">
            {(!sidebarCollapsed || mobile) && (
              <p className="px-4 mb-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const disabled = item.disabled;
                return (
                  <Link
                    key={item.href + item.label}
                    to={disabled ? '#' : item.href}
                    onClick={(e) => {
                      if (disabled) e.preventDefault();
                      else if (mobile) setSidebarOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                      active
                        ? 'bg-gray-900 text-white'
                        : disabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-white' : ''}`} />
                    {(!sidebarCollapsed || mobile) && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100">
        {/* Settings link */}
        <Link
          to="#"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors mb-2"
        >
          <Settings className="w-[18px] h-[18px]" />
          {(!sidebarCollapsed || mobile) && <span className="text-sm font-medium">الإعدادات</span>}
        </Link>
        
        {/* User info */}
        {(!sidebarCollapsed || mobile) && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2">
            <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
              {adminUser?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm text-gray-900 truncate">{adminUser?.email?.split('@')[0] || 'مدير'}</p>
              <p className="text-[11px] text-gray-500 truncate">
                {adminUser?.roles[0] || 'مدير النظام'}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          {(!sidebarCollapsed || mobile) && <span className="text-sm font-medium">تسجيل الخروج</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:flex flex-col fixed h-full z-40 transition-all duration-300 ${
          sidebarCollapsed ? 'w-[70px]' : 'w-[260px]'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white h-14 flex items-center justify-between px-4 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-900">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0 border-0">
              <SidebarContent mobile />
            </SheetContent>
          </Sheet>
          <span className="font-bold text-gray-900">كالابريز</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative text-gray-500">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
          </Button>
          <Button variant="ghost" size="icon" asChild className="text-gray-500">
            <Link to="/"><Store className="w-5 h-5" /></Link>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main 
        className={`flex-1 min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'lg:mr-[70px]' : 'lg:mr-[260px]'
        }`}
      >
        {/* Desktop Top bar */}
        <header className="hidden lg:flex bg-white border-b border-gray-100 sticky top-0 z-40 items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            <span className="text-sm text-gray-500">القائمة الرئيسية &gt; {title}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="بحث..." 
                className="w-64 pr-9 bg-gray-50 border-gray-200 text-sm rounded-xl focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
            
            {/* Notifications */}
            <button className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            
            {/* View store */}
            <Button variant="outline" size="sm" asChild className="border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white rounded-xl">
              <Link to="/">
                <Store className="w-4 h-4 me-2" />
                عرض المتجر
              </Link>
            </Button>
          </div>
        </header>

        {/* Mobile title bar */}
        <div className="lg:hidden bg-white border-b border-gray-100 sticky top-14 z-30 px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
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

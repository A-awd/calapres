import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  CheckCircle,
  XCircle,
  ChevronLeft,
  Zap,
  CreditCard,
  AlertCircle,
  Calendar
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, startOfMonth, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const today = startOfDay(new Date());
      const monthStart = startOfMonth(new Date());
      const yesterday = subDays(today, 1);

      const [ordersRes, productsRes, bundlesRes] = await Promise.all([
        supabase.from('orders').select('id, total, status, payment_status, created_at, delivery_type'),
        supabase.from('products').select('id, price, stock_count, order_count, name_ar, image').eq('is_active', true),
        supabase.from('bundles').select('id', { count: 'exact' }).eq('is_active', true),
      ]);

      const orders = ordersRes.data || [];
      const products = productsRes.data || [];

      const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
      const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

      const yesterdayOrders = orders.filter(o => {
        const date = new Date(o.created_at);
        return date >= yesterday && date < today;
      });
      const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

      const monthOrders = orders.filter(o => new Date(o.created_at) >= monthStart);
      const monthRevenue = monthOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

      const statusBreakdown = {
        pending: orders.filter(o => o.status === 'pending').length,
        processing: orders.filter(o => o.status === 'processing').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
      };

      const paidOrders = orders.filter(o => o.payment_status === 'paid').length;
      const pendingPayments = orders.filter(o => o.payment_status === 'pending').length;
      const expressOrders = orders.filter(o => o.delivery_type === 'express').length;

      const sortedProducts = [...products].sort((a, b) => (b.order_count || 0) - (a.order_count || 0));
      const bestSellers = sortedProducts.slice(0, 5);
      const lowStock = products.filter(p => (p.stock_count || 0) <= 5).slice(0, 5);

      const revenueChange = yesterdayRevenue > 0 
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
        : todayRevenue > 0 ? 100 : 0;

      return {
        todayOrders: todayOrders.length,
        todayRevenue,
        monthRevenue,
        monthOrders: monthOrders.length,
        totalProducts: products.length,
        totalBundles: bundlesRes.count || 0,
        statusBreakdown,
        paidOrders,
        pendingPayments,
        expressOrders,
        bestSellers,
        lowStock,
        revenueChange: Number(revenueChange),
      };
    },
  });

  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-recent-orders-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, recipient_name, total, status, payment_status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-champagne text-charcoal border-gold/30',
      confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
      processing: 'bg-gold/10 text-charcoal border-gold/40',
      shipped: 'bg-purple-50 text-purple-700 border-purple-200',
      delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      cancelled: 'bg-red-50 text-red-600 border-red-200',
    };
    return styles[status] || styles.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      processing: 'قيد التجهيز',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
    };
    return labels[status] || status;
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `منذ ${minutes} د`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} س`;
    return `منذ ${Math.floor(hours / 24)} ي`;
  };

  const totalPending = (stats?.statusBreakdown.pending || 0) + (stats?.statusBreakdown.processing || 0);

  const StatCard = ({ 
    title, 
    value, 
    suffix = '', 
    icon: Icon, 
    change, 
    delay = 0,
    highlight = false 
  }: { 
    title: string; 
    value: number | string; 
    suffix?: string; 
    icon: any; 
    change?: number;
    delay?: number;
    highlight?: boolean;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className={`card-luxury p-5 transition-all duration-300 hover:shadow-elegant ${highlight ? 'border-gold/50 bg-gradient-to-br from-champagne/30 to-transparent' : ''}`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${highlight ? 'bg-gold/20' : 'bg-secondary'}`}>
            <Icon className={`w-5 h-5 ${highlight ? 'text-gold' : 'text-muted-foreground'}`} />
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        {statsLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <h3 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
              {suffix && <span className="text-sm font-normal text-muted-foreground mr-1">{suffix}</span>}
            </h3>
            <p className="text-sm text-muted-foreground">{title}</p>
          </>
        )}
      </div>
    </motion.div>
  );

  return (
    <AdminLayout title="لوحة التحكم">
      {/* Header with date */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h2 className="text-xl lg:text-2xl font-display font-semibold text-foreground mb-1">
              مرحباً بك
            </h2>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(new Date(), 'EEEE، d MMMM yyyy', { locale: ar })}
            </p>
          </div>
          <Button variant="outline" className="btn-gold" asChild>
            <Link to="/admin/orders" className="gap-2">
              جميع الطلبات
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="إيرادات اليوم"
          value={stats?.todayRevenue || 0}
          suffix="ر.س"
          icon={DollarSign}
          change={stats?.revenueChange}
          delay={0}
          highlight
        />
        <StatCard
          title="طلبات اليوم"
          value={stats?.todayOrders || 0}
          icon={ShoppingCart}
          delay={0.1}
        />
        <StatCard
          title="قيد الانتظار"
          value={totalPending}
          icon={Clock}
          delay={0.2}
        />
        <StatCard
          title="إيرادات الشهر"
          value={stats?.monthRevenue || 0}
          suffix="ر.س"
          icon={TrendingUp}
          delay={0.3}
        />
      </div>

      {/* Order Status + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Order Status Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="card-luxury">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Truck className="w-5 h-5 text-gold" />
                حالة الطلبات
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { key: 'pending', label: 'انتظار', icon: Clock, color: 'bg-champagne border-gold/30', iconColor: 'text-gold' },
                  { key: 'processing', label: 'تجهيز', icon: Package, color: 'bg-gold/10 border-gold/40', iconColor: 'text-gold' },
                  { key: 'shipped', label: 'شحن', icon: Truck, color: 'bg-purple-50 border-purple-200', iconColor: 'text-purple-600' },
                  { key: 'delivered', label: 'مسلم', icon: CheckCircle, color: 'bg-emerald-50 border-emerald-200', iconColor: 'text-emerald-600' },
                  { key: 'cancelled', label: 'ملغي', icon: XCircle, color: 'bg-red-50 border-red-200', iconColor: 'text-red-500' },
                ].map((status) => {
                  const count = stats?.statusBreakdown[status.key as keyof typeof stats.statusBreakdown] || 0;
                  return (
                    <div 
                      key={status.key}
                      className={`p-4 rounded-lg border text-center transition-all hover:shadow-soft ${status.color}`}
                    >
                      <status.icon className={`w-5 h-5 mx-auto mb-2 ${status.iconColor}`} />
                      <p className="text-2xl font-bold text-foreground">{count}</p>
                      <p className="text-xs text-muted-foreground mt-1">{status.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Rate */}
              {stats && stats.monthOrders > 0 && (
                <div className="mt-6 pt-6 border-t border-border/50">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-muted-foreground">معدل التوصيل الناجح</span>
                    <span className="font-semibold text-foreground">
                      {Math.round((stats.statusBreakdown.delivered / stats.monthOrders) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-l from-gold to-gold-light rounded-full transition-all duration-500"
                      style={{ width: `${(stats.statusBreakdown.delivered / stats.monthOrders) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="card-luxury h-full">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Zap className="w-5 h-5 text-gold" />
                إحصائيات سريعة
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {[
                { icon: CreditCard, label: 'مدفوعة', value: stats?.paidOrders || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { icon: Clock, label: 'بانتظار الدفع', value: stats?.pendingPayments || 0, color: 'text-gold', bg: 'bg-champagne' },
                { icon: Zap, label: 'توصيل سريع', value: stats?.expressOrders || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                { icon: Package, label: 'المنتجات', value: stats?.totalProducts || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg}`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <span className="text-sm text-foreground">{item.label}</span>
                  </div>
                  <span className="font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Orders + Best Sellers + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2"
        >
          <Card className="card-luxury">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-gold" />
                أحدث الطلبات
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                <Link to="/admin/orders" className="text-xs gap-1">
                  عرض الكل
                  <ChevronLeft className="w-3 h-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {ordersLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">لا توجد طلبات حتى الآن</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((order, i) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                    >
                      <Link
                        to={`/admin/orders`}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/20 hover:bg-secondary/40 border border-transparent hover:border-border/50 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-gold" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground group-hover:text-gold transition-colors">
                              #{order.order_number}
                            </p>
                            <p className="text-xs text-muted-foreground">{order.recipient_name}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">{order.total?.toLocaleString()} ر.س</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`text-[10px] px-2 py-0 border ${getStatusStyle(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{formatTimeAgo(order.created_at)}</span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Best Sellers + Low Stock */}
        <div className="space-y-6">
          {/* Best Sellers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="card-luxury">
              <CardHeader className="pb-4 border-b border-border/50">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gold" />
                  الأكثر مبيعاً
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {stats?.bestSellers && stats.bestSellers.length > 0 ? (
                  <div className="space-y-3">
                    {stats.bestSellers.slice(0, 4).map((product, i) => (
                      <div key={product.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{product.name_ar}</p>
                          <p className="text-xs text-muted-foreground">{product.order_count || 0} طلب</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Low Stock Alert */}
          {stats?.lowStock && stats.lowStock.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="card-luxury border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-transparent">
                <CardHeader className="pb-4 border-b border-amber-200/30">
                  <CardTitle className="text-base font-medium flex items-center gap-2 text-amber-700">
                    <AlertCircle className="w-5 h-5" />
                    تنبيه المخزون
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {stats.lowStock.slice(0, 3).map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-2 bg-amber-50/50 rounded-lg">
                        <p className="text-sm text-foreground truncate flex-1">{product.name_ar}</p>
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-100/50">
                          {product.stock_count || 0}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

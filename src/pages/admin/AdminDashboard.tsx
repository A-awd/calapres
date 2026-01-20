import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  DollarSign,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  Truck,
  CheckCircle,
  XCircle,
  Calendar,
  Eye,
  ChevronLeft,
  Zap,
  Users,
  CreditCard
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, startOfMonth, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

const AdminDashboard: React.FC = () => {
  // Fetch comprehensive stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const today = startOfDay(new Date());
      const monthStart = startOfMonth(new Date());
      const yesterday = subDays(today, 1);

      const [ordersRes, productsRes, bundlesRes] = await Promise.all([
        supabase.from('orders').select('id, total, status, payment_status, created_at, delivery_type'),
        supabase.from('products').select('id, price, stock_count, order_count, name_ar').eq('is_active', true),
        supabase.from('bundles').select('id', { count: 'exact' }).eq('is_active', true),
      ]);

      const orders = ordersRes.data || [];
      const products = productsRes.data || [];

      // Today's orders
      const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
      const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

      // Yesterday's orders for comparison
      const yesterdayOrders = orders.filter(o => {
        const date = new Date(o.created_at);
        return date >= yesterday && date < today;
      });
      const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

      // Monthly stats
      const monthOrders = orders.filter(o => new Date(o.created_at) >= monthStart);
      const monthRevenue = monthOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

      // Order status breakdown
      const statusBreakdown = {
        pending: orders.filter(o => o.status === 'pending').length,
        processing: orders.filter(o => o.status === 'processing').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
      };

      // Payment stats
      const paidOrders = orders.filter(o => o.payment_status === 'paid').length;
      const pendingPayments = orders.filter(o => o.payment_status === 'pending').length;

      // Delivery type breakdown
      const expressOrders = orders.filter(o => o.delivery_type === 'express').length;
      const scheduledOrders = orders.filter(o => o.delivery_type === 'scheduled').length;

      // Best selling products
      const sortedProducts = [...products].sort((a, b) => (b.order_count || 0) - (a.order_count || 0));
      const bestSellers = sortedProducts.slice(0, 5);

      // Low stock
      const lowStock = products.filter(p => (p.stock_count || 0) <= 5).slice(0, 5);

      // Revenue change percentage
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
        scheduledOrders,
        bestSellers,
        lowStock,
        revenueChange: Number(revenueChange),
        ordersChange: yesterdayOrders.length > 0 
          ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length * 100).toFixed(1)
          : todayOrders.length > 0 ? 100 : 0,
      };
    },
  });

  // Fetch recent orders
  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-recent-orders-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, recipient_name, total, status, payment_status, created_at, delivery_type')
        .order('created_at', { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const getStatusConfig = (status: string) => {
    const config: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
      pending: { color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', icon: Clock, label: 'قيد الانتظار' },
      confirmed: { color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', icon: CheckCircle, label: 'مؤكد' },
      processing: { color: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-200', icon: Package, label: 'قيد التجهيز' },
      shipped: { color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200', icon: Truck, label: 'تم الشحن' },
      delivered: { color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', icon: CheckCircle, label: 'تم التوصيل' },
      cancelled: { color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', icon: XCircle, label: 'ملغي' },
    };
    return config[status] || config.pending;
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${Math.floor(hours / 24)} يوم`;
  };

  const totalPending = (stats?.statusBreakdown.pending || 0) + (stats?.statusBreakdown.processing || 0);
  const totalActive = totalPending + (stats?.statusBreakdown.shipped || 0);

  return (
    <AdminLayout title="لوحة التحكم">
      {/* Today's Overview Banner */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">نظرة عامة على اليوم</h2>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), 'EEEE، d MMMM yyyy', { locale: ar })}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/orders" className="gap-2">
              عرض كل الطلبات
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today's Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                </div>
                {stats?.revenueChange !== undefined && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${stats.revenueChange >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {stats.revenueChange >= 0 ? <ArrowUpRight className="w-3 h-3 ml-1" /> : <ArrowDownRight className="w-3 h-3 ml-1" />}
                    {Math.abs(stats.revenueChange)}%
                  </Badge>
                )}
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <>
                  <h3 className="text-xl lg:text-3xl font-bold text-foreground mb-1">
                    {stats?.todayRevenue?.toLocaleString() || 0}
                    <span className="text-sm font-normal text-muted-foreground mr-1">ر.س</span>
                  </h3>
                  <p className="text-xs lg:text-sm text-muted-foreground">إيرادات اليوم</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
                </div>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <h3 className="text-xl lg:text-3xl font-bold text-foreground mb-1">
                    {stats?.todayOrders || 0}
                  </h3>
                  <p className="text-xs lg:text-sm text-muted-foreground">طلبات اليوم</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className={totalPending > 0 ? 'border-amber-200 bg-amber-50/30' : ''}>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-amber-600" />
                </div>
                {totalPending > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                    يحتاج متابعة
                  </Badge>
                )}
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <h3 className="text-xl lg:text-3xl font-bold text-foreground mb-1">
                    {totalPending}
                  </h3>
                  <p className="text-xs lg:text-sm text-muted-foreground">طلبات قيد الانتظار</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
                </div>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <>
                  <h3 className="text-xl lg:text-3xl font-bold text-foreground mb-1">
                    {stats?.monthRevenue?.toLocaleString() || 0}
                    <span className="text-sm font-normal text-muted-foreground mr-1">ر.س</span>
                  </h3>
                  <p className="text-xs lg:text-sm text-muted-foreground">إيرادات الشهر</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Order Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-5 h-5" />
              حالة التوصيل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { key: 'pending', label: 'انتظار', icon: Clock, color: 'amber' },
                { key: 'processing', label: 'تجهيز', icon: Package, color: 'indigo' },
                { key: 'shipped', label: 'شحن', icon: Truck, color: 'purple' },
                { key: 'delivered', label: 'مسلم', icon: CheckCircle, color: 'green' },
                { key: 'cancelled', label: 'ملغي', icon: XCircle, color: 'red' },
              ].map((status) => {
                const count = stats?.statusBreakdown[status.key as keyof typeof stats.statusBreakdown] || 0;
                return (
                  <div 
                    key={status.key}
                    className={`p-3 rounded-xl border bg-${status.color}-50/50 border-${status.color}-200 text-center`}
                  >
                    <status.icon className={`w-5 h-5 text-${status.color}-600 mx-auto mb-1`} />
                    <p className="text-xl font-bold text-foreground">{count}</p>
                    <p className="text-xs text-muted-foreground">{status.label}</p>
                  </div>
                );
              })}
            </div>
            
            {/* Progress bar */}
            {stats && stats.monthOrders > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">معدل التوصيل</span>
                  <span className="font-medium">
                    {Math.round((stats.statusBreakdown.delivered / stats.monthOrders) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(stats.statusBreakdown.delivered / stats.monthOrders) * 100} 
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5" />
              إحصائيات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-green-600" />
                <span className="text-sm">مدفوعة</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {stats?.paidOrders || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-sm">بانتظار الدفع</span>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                {stats?.pendingPayments || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-sm">توصيل سريع</span>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {stats?.expressOrders || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-sm">مجدولة</span>
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                {stats?.scheduledOrders || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                الطلبات الأخيرة
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/orders" className="text-xs gap-1">
                  عرض الكل
                  <ChevronLeft className="w-3 h-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>لا توجد طلبات بعد</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((order) => {
                    const statusConfig = getStatusConfig(order.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <Link
                        key={order.id}
                        to="/admin/orders"
                        className="flex items-center justify-between p-3 bg-secondary/30 hover:bg-secondary/60 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${statusConfig.bgColor}`}>
                            <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{order.order_number}</span>
                              {order.delivery_type === 'express' && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px] px-1.5">
                                  <Zap className="w-2.5 h-2.5 ml-0.5" />
                                  سريع
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{order.recipient_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-left">
                            <p className="font-medium text-sm">{order.total} ر.س</p>
                            <p className="text-[10px] text-muted-foreground">{formatTimeAgo(order.created_at)}</p>
                          </div>
                          <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Best Sellers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                الأكثر مبيعاً
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : stats?.bestSellers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4 text-sm">لا توجد بيانات</p>
              ) : (
                <div className="space-y-2">
                  {stats?.bestSellers.map((product, index) => (
                    <div 
                      key={product.id} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-sm flex-1 truncate">{product.name_ar}</span>
                      <Badge variant="outline" className="text-xs">
                        {product.order_count || 0}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card className={stats?.lowStock.length ? 'border-amber-200' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                مخزون منخفض
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : stats?.lowStock.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
                  <p className="text-muted-foreground text-sm">جميع المنتجات متوفرة</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats?.lowStock.map((product) => (
                    <div 
                      key={product.id} 
                      className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg"
                    >
                      <span className="text-sm text-amber-800 truncate flex-1 ml-2">
                        {product.name_ar}
                      </span>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        {product.stock_count}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm" asChild>
                <Link to="/admin/catalog">
                  <Package className="w-4 h-4 ml-2" /> إدارة المنتجات
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm" asChild>
                <Link to="/admin/orders">
                  <ShoppingCart className="w-4 h-4 ml-2" /> عرض الطلبات
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm" asChild>
                <Link to="/admin/users">
                  <Users className="w-4 h-4 ml-2" /> إدارة المستخدمين
                </Link>
              </Button>
              <Button variant="default" className="w-full justify-start text-sm" asChild>
                <Link to="/">
                  <Eye className="w-4 h-4 ml-2" /> عرض المتجر
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

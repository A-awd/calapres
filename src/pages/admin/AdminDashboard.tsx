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
  Users,
  ChevronLeft,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const today = startOfDay(new Date());
      const monthStart = startOfMonth(new Date());
      const yesterday = subDays(today, 1);
      const lastMonth = subMonths(today, 1);

      const [ordersRes, productsRes, profilesRes] = await Promise.all([
        supabase.from('orders').select('id, total, status, payment_status, created_at, delivery_type'),
        supabase.from('products').select('id, price, stock_count, order_count, name_ar, image').eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact' }),
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

      // Last 7 days revenue for chart
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(today, 6 - i);
        const dayOrders = orders.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= date && orderDate < subDays(date, -1);
        });
        return {
          date: format(date, 'd MMM', { locale: ar }),
          revenue: dayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
        };
      });

      const statusBreakdown = {
        pending: orders.filter(o => o.status === 'pending').length,
        processing: orders.filter(o => o.status === 'processing').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
      };

      const revenueChange = yesterdayRevenue > 0 
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
        : todayRevenue > 0 ? 100 : 0;

      const ordersChange = yesterdayOrders.length > 0 
        ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length * 100).toFixed(1)
        : todayOrders.length > 0 ? 100 : 0;

      return {
        todayOrders: todayOrders.length,
        todayRevenue,
        monthRevenue,
        monthOrders: monthOrders.length,
        totalProducts: products.length,
        totalCustomers: profilesRes.count || 0,
        statusBreakdown,
        last7Days,
        revenueChange: Number(revenueChange),
        ordersChange: Number(ordersChange),
      };
    },
  });

  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-recent-orders-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, recipient_name, total, status, payment_status, created_at, guest_email')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'قيد الانتظار' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'مؤكد' },
      processing: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'قيد التجهيز' },
      shipped: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'تم الشحن' },
      delivered: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'مكتمل' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-600', label: 'ملغي' },
    };
    return styles[status] || styles.pending;
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'd MMM yyyy', { locale: ar });
  };

  const pieData = stats ? [
    { name: 'انتظار', value: stats.statusBreakdown.pending, color: '#f59e0b' },
    { name: 'تجهيز', value: stats.statusBreakdown.processing, color: '#6366f1' },
    { name: 'شحن', value: stats.statusBreakdown.shipped, color: '#8b5cf6' },
    { name: 'مكتمل', value: stats.statusBreakdown.delivered, color: '#10b981' },
    { name: 'ملغي', value: stats.statusBreakdown.cancelled, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  const totalOrders = pieData.reduce((sum, d) => sum + d.value, 0);

  const StatCard = ({ 
    title, 
    value, 
    suffix = '', 
    icon: Icon, 
    change, 
    changeLabel = 'خلال 24 ساعة',
    iconBg = 'bg-[#4a6b5d]/10',
    iconColor = 'text-[#4a6b5d]'
  }: { 
    title: string; 
    value: number | string; 
    suffix?: string; 
    icon: any; 
    change?: number;
    changeLabel?: string;
    iconBg?: string;
    iconColor?: string;
  }) => (
    <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="mt-4">
          <p className="text-xs text-[#6b7c74] mb-1">{title}</p>
          {statsLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-[#2d3b36]">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </h3>
              {suffix && <span className="text-sm text-[#6b7c74]">{suffix}</span>}
            </div>
          )}
        </div>
        {change !== undefined && (
          <div className="mt-3 flex items-center gap-2">
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
              change >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
            }`}>
              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}%
            </span>
            <span className="text-[11px] text-[#9ca8a3]">{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout title="لوحة التحكم">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <StatCard
            title="إجمالي الإيرادات"
            value={stats?.todayRevenue || 0}
            suffix="ر.س"
            icon={DollarSign}
            change={stats?.revenueChange}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard
            title="إجمالي الطلبات"
            value={stats?.todayOrders || 0}
            icon={ShoppingCart}
            change={stats?.ordersChange}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatCard
            title="إجمالي العملاء"
            value={stats?.totalCustomers || 0}
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <StatCard
            title="إجمالي المنتجات"
            value={stats?.totalProducts || 0}
            icon={Package}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="bg-white border border-gray-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold text-[#2d3b36]">نظرة على أداء المبيعات</CardTitle>
                <p className="text-2xl font-bold text-[#2d3b36] mt-1">
                  {(stats?.monthRevenue || 0).toLocaleString()} <span className="text-sm font-normal text-[#6b7c74]">ر.س</span>
                </p>
                <p className="text-xs text-[#9ca8a3]">إجمالي الإيرادات</p>
              </div>
              <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-[#6b7c74]">
                <option>آخر 7 أيام</option>
                <option>آخر 30 يوم</option>
              </select>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.last7Days || []}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4a6b5d" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4a6b5d" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#9ca8a3' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#9ca8a3' }}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#2d3b36', 
                        border: 'none', 
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} ر.س`, 'الإيرادات']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#4a6b5d" 
                      strokeWidth={2}
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Order Status Pie */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-white border border-gray-100 shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-[#2d3b36]">حالة الطلبات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[160px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#2d3b36]">{totalOrders}</p>
                    <p className="text-[10px] text-[#9ca8a3]">طلب</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {pieData.slice(0, 4).map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-[#6b7c74]">{item.name}</span>
                    <span className="text-xs font-medium text-[#2d3b36] mr-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Orders Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-white border border-gray-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold text-[#2d3b36]">أحدث الطلبات</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-[#4a6b5d] hover:text-[#3d5a4c]">
              <Link to="/admin/orders" className="gap-1 text-sm">
                عرض الكل
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-[#9ca8a3] text-sm">لا توجد طلبات حتى الآن</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#f8fafb] border-y border-gray-100">
                    <tr>
                      <th className="text-right text-xs font-medium text-[#6b7c74] px-6 py-3">الطلب</th>
                      <th className="text-right text-xs font-medium text-[#6b7c74] px-6 py-3">العميل</th>
                      <th className="text-right text-xs font-medium text-[#6b7c74] px-6 py-3">التاريخ</th>
                      <th className="text-right text-xs font-medium text-[#6b7c74] px-6 py-3">الحالة</th>
                      <th className="text-right text-xs font-medium text-[#6b7c74] px-6 py-3">المبلغ</th>
                      <th className="text-right text-xs font-medium text-[#6b7c74] px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentOrders.map((order) => {
                      const statusStyle = getStatusStyle(order.status);
                      return (
                        <tr key={order.id} className="hover:bg-[#f8fafb]/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-[#4a6b5d]/10 rounded-lg flex items-center justify-center">
                                <Package className="w-4 h-4 text-[#4a6b5d]" />
                              </div>
                              <span className="font-medium text-sm text-[#2d3b36]">#{order.order_number}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-[#4a6b5d] to-[#3d5a4c] rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {order.recipient_name?.charAt(0) || 'ع'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#2d3b36]">{order.recipient_name}</p>
                                <p className="text-[11px] text-[#9ca8a3]">{order.guest_email || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-[#6b7c74]">{formatDate(order.created_at)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`${statusStyle.bg} ${statusStyle.text} border-0 text-[11px] font-medium`}>
                              {statusStyle.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-[#2d3b36]">{order.total?.toLocaleString()} ر.س</span>
                          </td>
                          <td className="px-6 py-4">
                            <Button variant="ghost" size="icon" asChild className="text-[#9ca8a3] hover:text-[#4a6b5d]">
                              <Link to="/admin/orders">
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminDashboard;

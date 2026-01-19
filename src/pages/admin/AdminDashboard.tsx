import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Users, 
  DollarSign,
  AlertTriangle,
  Clock,
  ArrowRight,
  Gift
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AdminDashboard: React.FC = () => {
  // Fetch real stats from database
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [productsRes, bundlesRes, ordersRes] = await Promise.all([
        supabase.from('products').select('id, price, stock_count', { count: 'exact' }),
        supabase.from('bundles').select('id', { count: 'exact' }),
        supabase.from('orders').select('id, total, status', { count: 'exact' }),
      ]);
      
      const totalRevenue = ordersRes.data?.reduce((sum, o) => sum + Number(o.total || 0), 0) || 0;
      const pendingOrders = ordersRes.data?.filter(o => o.status === 'pending').length || 0;
      
      return {
        products: productsRes.count || 0,
        bundles: bundlesRes.count || 0,
        orders: ordersRes.count || 0,
        revenue: totalRevenue,
        pendingOrders,
      };
    },
  });

  // Fetch recent orders
  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, recipient_name, total, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // Fetch low stock products
  const { data: lowStockProducts = [], isLoading: stockLoading } = useQuery({
    queryKey: ['admin-low-stock'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, stock_count')
        .lte('stock_count', 5)
        .eq('is_active', true)
        .order('stock_count', { ascending: true })
        .limit(5);
      return data || [];
    },
  });

  const statCards = [
    { title: 'Total Revenue', value: `${stats?.revenue?.toLocaleString() || 0} SAR`, icon: DollarSign, color: 'text-green-600' },
    { title: 'Orders', value: stats?.orders || 0, icon: ShoppingCart, color: 'text-blue-600' },
    { title: 'Products', value: stats?.products || 0, icon: Package, color: 'text-purple-600' },
    { title: 'Bundles', value: stats?.bundles || 0, icon: Gift, color: 'text-orange-600' },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-indigo-100 text-indigo-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between mb-2 lg:mb-4">
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 bg-secondary rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.color}`} />
                  </div>
                </div>
                {statsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <h3 className="text-lg lg:text-2xl font-bold mb-1">{stat.value}</h3>
                    <p className="text-muted-foreground text-xs lg:text-sm">{stat.title}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                <ShoppingCart className="w-5 h-5" />
                Recent Orders
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/orders" className="text-xs">
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : recentOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 lg:p-4 bg-secondary/50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm lg:text-base truncate">{order.order_number}</p>
                        <p className="text-xs lg:text-sm text-muted-foreground truncate">{order.recipient_name}</p>
                      </div>
                      <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
                        <span className={`px-2 py-1 rounded text-[10px] lg:text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        <div className="text-right hidden sm:block">
                          <p className="font-medium text-sm">{order.total} SAR</p>
                          <p className="text-[10px] text-muted-foreground">{formatTimeAgo(order.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:space-y-6">
          {/* Low Stock Alert */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-600 text-base lg:text-lg">
                <AlertTriangle className="w-5 h-5" />
                Low Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : lowStockProducts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4 text-sm">All products well stocked</p>
              ) : (
                <div className="space-y-2">
                  {lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-2 lg:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="font-medium text-amber-800 text-xs lg:text-sm truncate flex-1 mr-2">{product.name}</p>
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold flex-shrink-0">
                        {product.stock_count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base lg:text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm" asChild>
                <Link to="/admin/catalog">
                  <Package className="w-4 h-4 mr-2" /> Manage Products
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm" asChild>
                <Link to="/admin/orders">
                  <ShoppingCart className="w-4 h-4 mr-2" /> View Orders
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm" asChild>
                <Link to="/">
                  <TrendingUp className="w-4 h-4 mr-2" /> View Store
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
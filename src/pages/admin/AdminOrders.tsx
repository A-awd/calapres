import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  MoreVertical, 
  Eye, 
  Printer,
  Clock,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  AlertCircle,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Filter
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import OrderDetailModal from '@/components/admin/OrderDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const statusLabels: Record<string, string> = {
  all: 'الكل',
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

// Stats Card Component
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'primary' 
}: { 
  title: string; 
  value: string | number; 
  icon: any; 
  trend?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}) => {
  const colorClasses = {
    primary: 'bg-[hsl(var(--admin-primary))] text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-red-500 text-white',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-emerald-500 text-sm mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};

const AdminOrders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('تم تحديث حالة الطلب');
    },
    onError: () => {
      toast.error('فشل تحديث الحالة');
    },
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  // Calculate stats
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const completedOrders = orders.filter(o => o.status === 'delivered').length;

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      pending: Clock,
      confirmed: AlertCircle,
      processing: Package,
      shipped: Truck,
      delivered: CheckCircle,
      cancelled: XCircle,
    };
    const Icon = icons[status] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-blue-100 text-blue-700',
      processing: 'bg-indigo-100 text-indigo-700',
      shipped: 'bg-purple-100 text-purple-700',
      delivered: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPaymentBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      failed: 'bg-red-100 text-red-700',
      refunded: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      paid: 'مدفوع',
      pending: 'قيد الانتظار',
      failed: 'فشل',
      refunded: 'مسترد',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailModalOpen(true);
  };

  return (
    <AdminLayout title="إدارة الطلبات">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="إجمالي الطلبات"
          value={orders.length}
          icon={ShoppingBag}
          trend="+12% هذا الشهر"
          color="primary"
        />
        <StatCard
          title="الإيرادات"
          value={`${totalRevenue.toLocaleString()} ر.س`}
          icon={DollarSign}
          trend="+8% هذا الشهر"
          color="success"
        />
        <StatCard
          title="طلبات معلقة"
          value={pendingOrders}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="طلبات مكتملة"
          value={completedOrders}
          icon={CheckCircle}
          color="success"
        />
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        {/* Status Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-2 px-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                statusFilter === status
                  ? 'bg-[hsl(var(--admin-primary))] text-white shadow-lg shadow-[hsl(var(--admin-primary))]/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {statusLabels[status]}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                statusFilter === status ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="البحث برقم الطلب أو اسم العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-gray-50 border-gray-200 rounded-xl h-11 focus:ring-2 focus:ring-[hsl(var(--admin-primary))]/20"
            />
          </div>
          <Select defaultValue="newest">
            <SelectTrigger className="w-full sm:w-44 bg-gray-50 border-gray-200 rounded-xl h-11">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="ترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث أولاً</SelectItem>
              <SelectItem value="oldest">الأقدم أولاً</SelectItem>
              <SelectItem value="highest">الأعلى قيمة</SelectItem>
              <SelectItem value="lowest">الأقل قيمة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">لا توجد طلبات</p>
            <p className="text-gray-400 text-sm mt-1">ستظهر الطلبات الجديدة هنا</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-right font-semibold text-gray-700">رقم الطلب</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">العميل</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">التاريخ</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">المبلغ</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">الدفع</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">الحالة</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order, index) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                    >
                      <TableCell>
                        <span className="font-bold text-gray-900">{order.order_number}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{order.recipient_name}</p>
                          <p className="text-sm text-gray-500">{order.recipient_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">{formatDate(order.created_at)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-gray-900">{order.total} ر.س</span>
                      </TableCell>
                      <TableCell>
                        {getPaymentBadge(order.payment_status)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(value: OrderStatus) => updateStatus.mutate({ id: order.id, status: value })}
                        >
                          <SelectTrigger className={`w-32 h-9 rounded-full text-xs font-medium border-0 ${getStatusColor(order.status)}`}>
                            <span className="flex items-center gap-1.5">
                              {getStatusIcon(order.status)}
                              <SelectValue />
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">قيد الانتظار</SelectItem>
                            <SelectItem value="confirmed">مؤكد</SelectItem>
                            <SelectItem value="processing">قيد التجهيز</SelectItem>
                            <SelectItem value="shipped">تم الشحن</SelectItem>
                            <SelectItem value="delivered">تم التوصيل</SelectItem>
                            <SelectItem value="cancelled">ملغي</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleViewOrder(order.id)}
                            className="h-9 w-9 rounded-xl hover:bg-[hsl(var(--admin-primary))]/10 hover:text-[hsl(var(--admin-primary))]"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-gray-100"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filteredOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-gray-900">{order.order_number}</span>
                        {getPaymentBadge(order.payment_status)}
                      </div>
                      <p className="text-sm text-gray-600">{order.recipient_name}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => handleViewOrder(order.id)} className="rounded-lg">
                          <Eye className="w-4 h-4 ml-2" /> عرض التفاصيل
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg">
                          <Printer className="w-4 h-4 ml-2" /> طباعة
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-bold text-gray-900">{order.total} ر.س</span>
                      <span className="text-gray-500">{formatDate(order.created_at)}</span>
                    </div>
                    <Select
                      value={order.status}
                      onValueChange={(value: OrderStatus) => updateStatus.mutate({ id: order.id, status: value })}
                    >
                      <SelectTrigger className={`h-8 w-28 text-xs rounded-full border-0 ${getStatusColor(order.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">قيد الانتظار</SelectItem>
                        <SelectItem value="confirmed">مؤكد</SelectItem>
                        <SelectItem value="processing">قيد التجهيز</SelectItem>
                        <SelectItem value="shipped">تم الشحن</SelectItem>
                        <SelectItem value="delivered">تم التوصيل</SelectItem>
                        <SelectItem value="cancelled">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {filteredOrders.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              عرض <span className="font-medium text-gray-700">{filteredOrders.length}</span> من <span className="font-medium text-gray-700">{orders.length}</span> طلب
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled
                className="rounded-xl border-gray-200"
              >
                السابق
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="rounded-xl border-gray-200 hover:bg-[hsl(var(--admin-primary))] hover:text-white hover:border-[hsl(var(--admin-primary))]"
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </AdminLayout>
  );
};

export default AdminOrders;

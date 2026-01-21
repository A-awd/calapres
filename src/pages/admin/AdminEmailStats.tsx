import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Mail,
  Send,
  CheckCircle,
  Eye,
  MousePointer,
  AlertTriangle,
  TrendingUp,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';

const emailTypeLabels: Record<string, { ar: string; en: string; color: string }> = {
  welcome: { ar: 'ترحيب', en: 'Welcome', color: '#8B5CF6' },
  order_confirmation: { ar: 'تأكيد طلب', en: 'Order Confirmation', color: '#10B981' },
  status_update: { ar: 'تحديث حالة', en: 'Status Update', color: '#3B82F6' },
  unknown: { ar: 'أخرى', en: 'Other', color: '#6B7280' },
};

const eventTypeLabels: Record<string, { ar: string; icon: any; color: string }> = {
  sent: { ar: 'تم الإرسال', icon: Send, color: 'text-blue-600' },
  delivered: { ar: 'تم التوصيل', icon: CheckCircle, color: 'text-green-600' },
  opened: { ar: 'تم الفتح', icon: Eye, color: 'text-purple-600' },
  clicked: { ar: 'تم النقر', icon: MousePointer, color: 'text-amber-600' },
  bounced: { ar: 'مرتد', icon: AlertTriangle, color: 'text-red-600' },
};

const AdminEmailStats: React.FC = () => {
  // Fetch email stats aggregate
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['email-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_events')
        .select('email_type, event_type')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Aggregate stats manually
      const aggregated: Record<string, Record<string, number>> = {};
      const totals: Record<string, number> = {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
      };

      data?.forEach((event: any) => {
        if (!aggregated[event.email_type]) {
          aggregated[event.email_type] = { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 };
        }
        if (aggregated[event.email_type][event.event_type] !== undefined) {
          aggregated[event.email_type][event.event_type]++;
          totals[event.event_type]++;
        }
      });

      return { byType: aggregated, totals };
    },
  });

  // Fetch recent events
  const { data: recentEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['recent-email-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch daily trend (last 7 days)
  const { data: dailyTrend = [] } = useQuery({
    queryKey: ['email-daily-trend'],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { data, error } = await supabase
        .from('email_events')
        .select('created_at, event_type')
        .gte('created_at', sevenDaysAgo);
      
      if (error) throw error;

      // Group by day
      const dailyData: Record<string, { date: string; sent: number; delivered: number; opened: number }> = {};
      
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyData[date] = { date, sent: 0, delivered: 0, opened: 0 };
      }

      data?.forEach((event: any) => {
        const date = format(new Date(event.created_at), 'yyyy-MM-dd');
        if (dailyData[date]) {
          if (event.event_type === 'sent') dailyData[date].sent++;
          if (event.event_type === 'delivered') dailyData[date].delivered++;
          if (event.event_type === 'opened') dailyData[date].opened++;
        }
      });

      return Object.values(dailyData).map(d => ({
        ...d,
        displayDate: format(new Date(d.date), 'EEE', { locale: ar }),
      }));
    },
  });

  // Prepare pie chart data
  const pieData = stats?.byType
    ? Object.entries(stats.byType).map(([type, counts]) => ({
        name: emailTypeLabels[type]?.ar || type,
        value: Object.values(counts).reduce((a, b) => a + b, 0),
        color: emailTypeLabels[type]?.color || '#6B7280',
      }))
    : [];

  const openRate = stats?.totals
    ? ((stats.totals.opened / (stats.totals.delivered || 1)) * 100).toFixed(1)
    : 0;

  const deliveryRate = stats?.totals
    ? ((stats.totals.delivered / (stats.totals.sent || 1)) * 100).toFixed(1)
    : 0;

  return (
    <AdminLayout title="إحصائيات الإيميلات">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إحصائيات الإيميلات</h1>
            <p className="text-muted-foreground">تتبع أداء الإيميلات المرسلة</p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetchStats()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statsLoading ? (
            Array(5).fill(0).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Send className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-900">{stats?.totals.sent || 0}</p>
                        <p className="text-sm text-blue-600">مُرسل</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-900">{stats?.totals.delivered || 0}</p>
                        <p className="text-sm text-green-600">موصّل</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Eye className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-900">{stats?.totals.opened || 0}</p>
                        <p className="text-sm text-purple-600">مفتوح</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-900">{openRate}%</p>
                        <p className="text-sm text-amber-600">معدل الفتح</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="border-emerald-200 bg-emerald-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-900">{deliveryRate}%</p>
                        <p className="text-sm text-emerald-600">معدل التوصيل</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">الإيميلات خلال الأسبوع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="displayDate" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        direction: 'rtl',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sent"
                      name="مُرسل"
                      stackId="1"
                      stroke="#3B82F6"
                      fill="#93C5FD"
                    />
                    <Area
                      type="monotone"
                      dataKey="delivered"
                      name="موصّل"
                      stackId="2"
                      stroke="#10B981"
                      fill="#6EE7B7"
                    />
                    <Area
                      type="monotone"
                      dataKey="opened"
                      name="مفتوح"
                      stackId="3"
                      stroke="#8B5CF6"
                      fill="#C4B5FD"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">توزيع أنواع الإيميلات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend
                        wrapperStyle={{ direction: 'rtl' }}
                        formatter={(value) => <span className="text-sm">{value}</span>}
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    لا توجد بيانات
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Events Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              آخر الأحداث
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد أحداث إيميل بعد</p>
                <p className="text-sm mt-2">ستظهر الإيميلات المرسلة هنا بعد إعداد Webhook</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الحدث</TableHead>
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">المستلم</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentEvents.map((event: any) => {
                      const eventInfo = eventTypeLabels[event.event_type];
                      const typeInfo = emailTypeLabels[event.email_type];
                      const Icon = eventInfo?.icon || Mail;
                      
                      return (
                        <TableRow key={event.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${eventInfo?.color || 'text-gray-500'}`} />
                              <span>{eventInfo?.ar || event.event_type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              style={{ borderColor: typeInfo?.color, color: typeInfo?.color }}
                            >
                              {typeInfo?.ar || event.email_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {event.recipient_email}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900">إعداد Webhook</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-3">
            <p>لتتبع أحداث الإيميلات، أضف الـ Webhook التالي في لوحة تحكم Resend:</p>
            <div className="bg-white p-3 rounded-lg border border-blue-200 font-mono text-sm break-all">
              https://vozaayivzggkpazehdxr.supabase.co/functions/v1/resend-webhook
            </div>
            <p className="text-sm">
              اختر الأحداث: email.sent, email.delivered, email.opened, email.clicked, email.bounced
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminEmailStats;

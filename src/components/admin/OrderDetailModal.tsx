import React from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Gift,
  Truck,
  CreditCard,
  FileText,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Printer,
  Zap,
  Eye,
  EyeOff,
  MessageSquare,
  Save,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

interface OrderDetailModalProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  confirmed: { label: 'مؤكد', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  processing: { label: 'قيد التجهيز', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Package },
  shipped: { label: 'تم الشحن', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Truck },
  delivered: { label: 'تم التوصيل', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

const paymentConfig: Record<string, { label: string; color: string }> = {
  paid: { label: 'مدفوع', color: 'bg-green-100 text-green-800' },
  pending: { label: 'بانتظار الدفع', color: 'bg-amber-100 text-amber-800' },
  failed: { label: 'فشل الدفع', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'مسترد', color: 'bg-gray-100 text-gray-800' },
};

const deliveryLabels: Record<string, string> = {
  standard: 'توصيل عادي',
  express: 'توصيل سريع',
  scheduled: 'مجدول',
};

const paymentMethodLabels: Record<string, string> = {
  cash: 'الدفع عند الاستلام',
  card: 'بطاقة ائتمان',
  apple_pay: 'Apple Pay',
  mada: 'مدى',
};

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderId,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [internalNotes, setInternalNotes] = useState('');
  const [notesChanged, setNotesChanged] = useState(false);

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setInternalNotes(data.internal_notes || '');
        setNotesChanged(false);
      }
      return data;
    },
    enabled: !!orderId && open,
  });

  const { data: orderItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['order-items', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && open,
  });

  const { data: timeline = [], isLoading: timelineLoading } = useQuery({
    queryKey: ['order-timeline', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from('order_timeline')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && open,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ status }: { status: OrderStatus }) => {
      if (!orderId) return;
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('تم تحديث حالة الطلب');
    },
    onError: () => {
      toast.error('فشل تحديث الحالة');
    },
  });

  const saveNotes = useMutation({
    mutationFn: async () => {
      if (!orderId) return;
      const { error } = await supabase
        .from('orders')
        .update({ internal_notes: internalNotes })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      setNotesChanged(false);
      toast.success('تم حفظ الملاحظات');
    },
    onError: () => {
      toast.error('فشل حفظ الملاحظات');
    },
  });

  const isLoading = orderLoading || itemsLoading || timelineLoading;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} ر.س`;
  };

  if (!orderId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0" dir="rtl">
        <DialogHeader className="p-4 lg:p-6 border-b bg-secondary/30">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-display text-lg lg:text-xl block">
                  طلب {order?.order_number || '...'}
                </span>
                {order && (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(order.created_at)}
                  </span>
                )}
              </div>
            </div>
            {order && (
              <div className="flex flex-wrap gap-2 sm:mr-auto">
                <Badge variant="outline" className={statusConfig[order.status]?.color}>
                  {statusConfig[order.status]?.label}
                </Badge>
                <Badge variant="outline" className={paymentConfig[order.payment_status]?.color}>
                  {paymentConfig[order.payment_status]?.label}
                </Badge>
                {order.delivery_type === 'express' && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    <Zap className="w-3 h-3 ml-1" />
                    سريع
                  </Badge>
                )}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-40" />
                <Skeleton className="h-32" />
                <Skeleton className="h-48" />
              </div>
            ) : order ? (
              <>
                {/* Status Update */}
                <Card className="border-primary/20">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${statusConfig[order.status]?.color}`}>
                        {React.createElement(statusConfig[order.status]?.icon || Clock, { className: 'w-5 h-5' })}
                      </div>
                      <div>
                        <p className="font-medium">تحديث حالة الطلب</p>
                        <p className="text-sm text-muted-foreground">الحالة الحالية: {statusConfig[order.status]?.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Select
                        value={order.status}
                        onValueChange={(value: OrderStatus) => updateStatus.mutate({ status: value })}
                        disabled={updateStatus.isPending}
                      >
                        <SelectTrigger className="w-full sm:w-40">
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
                      <Button variant="outline" size="icon">
                        <Printer className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer & Shipping Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="w-4 h-4" />
                        معلومات المستلم
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{order.recipient_name}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg" dir="ltr">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{order.recipient_phone}</span>
                      </div>
                      {order.guest_email && (
                        <div className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{order.guest_email}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Shipping Address */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        عنوان التوصيل
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div className="p-3 bg-secondary/50 rounded-lg space-y-1">
                        <p className="font-medium">{order.shipping_city}</p>
                        {order.shipping_district && <p>{order.shipping_district}</p>}
                        <p>{order.shipping_street}</p>
                        {order.shipping_building && <p>مبنى: {order.shipping_building}</p>}
                        {order.shipping_apartment && <p>شقة: {order.shipping_apartment}</p>}
                        {order.shipping_notes && (
                          <p className="text-muted-foreground pt-2 border-t mt-2">
                            {order.shipping_notes}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Delivery & Payment Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Truck className="w-5 h-5 text-primary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">نوع التوصيل</p>
                      <p className="font-medium text-sm">{deliveryLabels[order.delivery_type] || order.delivery_type}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <CreditCard className="w-5 h-5 text-primary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">طريقة الدفع</p>
                      <p className="font-medium text-sm">{paymentMethodLabels[order.payment_method] || order.payment_method}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">تاريخ التوصيل</p>
                      <p className="font-medium text-sm">
                        {order.scheduled_date
                          ? new Date(order.scheduled_date).toLocaleDateString('ar-SA')
                          : 'في أقرب وقت'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">وقت التوصيل</p>
                      <p className="font-medium text-sm">{order.scheduled_time || 'أي وقت'}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Gift Options */}
                {order.is_gift && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Gift className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium">طلب هدية</p>
                            {order.hide_invoice && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <EyeOff className="w-3 h-3" />
                                الفاتورة مخفية
                              </Badge>
                            )}
                          </div>
                          {order.gift_message && (
                            <div className="p-3 bg-white/50 rounded-lg border border-primary/10">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 text-primary mt-0.5" />
                                <p className="text-sm italic">"{order.gift_message}"</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Order Items */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      منتجات الطلب ({orderItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {orderItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg"
                        >
                          {item.product_image ? (
                            <img
                              src={item.product_image}
                              alt={item.product_name_ar}
                              className="w-14 h-14 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.product_name_ar}</p>
                            {item.variant_name && (
                              <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.unit_price)} × {item.quantity}
                            </p>
                          </div>
                          <p className="font-bold text-primary">{formatCurrency(item.total_price)}</p>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-4" />

                    {/* Price Breakdown */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المجموع الفرعي</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">رسوم التوصيل</span>
                        <span>{formatCurrency(order.shipping_fee)}</span>
                      </div>
                      {order.gift_wrap_fee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">تغليف الهدية</span>
                          <span>{formatCurrency(order.gift_wrap_fee)}</span>
                        </div>
                      )}
                      {order.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>الخصم</span>
                          <span>-{formatCurrency(order.discount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg pt-1">
                        <span>الإجمالي</span>
                        <span className="text-primary">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline & Notes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Order Timeline */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        تسلسل الطلب
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {timeline.length > 0 ? (
                        <div className="relative">
                          <div className="absolute right-3 top-3 bottom-3 w-0.5 bg-border" />
                          <div className="space-y-4">
                            {timeline.map((event, index) => (
                              <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative flex items-start gap-4 pr-8"
                              >
                                <div className="absolute right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                  <CheckCircle className="w-3 h-3 text-primary-foreground" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{event.status_ar}</p>
                                  <p className="text-xs text-muted-foreground">{event.message_ar}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(event.created_at)}
                                  </p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          لا توجد تحديثات بعد
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        الملاحظات
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {order.notes && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">ملاحظات العميل</p>
                          <div className="p-3 bg-secondary/50 rounded-lg text-sm">
                            {order.notes}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">ملاحظات داخلية</p>
                        <Textarea
                          value={internalNotes}
                          onChange={(e) => {
                            setInternalNotes(e.target.value);
                            setNotesChanged(true);
                          }}
                          placeholder="أضف ملاحظات داخلية للفريق..."
                          className="min-h-[100px]"
                        />
                        {notesChanged && (
                          <Button
                            size="sm"
                            className="mt-2 gap-2"
                            onClick={() => saveNotes.mutate()}
                            disabled={saveNotes.isPending}
                          >
                            {saveNotes.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            حفظ الملاحظات
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                الطلب غير موجود
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailModal;

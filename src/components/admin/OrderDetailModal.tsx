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
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OrderDetailModalProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderId,
  open,
  onOpenChange,
}) => {
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
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && open,
  });

  const isLoading = orderLoading || itemsLoading || timelineLoading;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      shipped: 'bg-purple-100 text-purple-800 border-purple-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getPaymentColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-muted text-muted-foreground',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} SAR`;
  };

  if (!orderId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 lg:p-6 border-b">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="font-display text-lg lg:text-xl">
              Order {order?.order_number || '...'}
            </span>
            {order && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
                <Badge variant="outline" className={getPaymentColor(order.payment_status)}>
                  {order.payment_status}
                </Badge>
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
                {/* Order Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer & Recipient Info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Recipient Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{order.recipient_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{order.recipient_phone}</span>
                      </div>
                      {order.guest_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{order.guest_email}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Shipping Address */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Shipping Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>{order.shipping_street}</p>
                      {order.shipping_building && <p>Building: {order.shipping_building}</p>}
                      {order.shipping_apartment && <p>Apartment: {order.shipping_apartment}</p>}
                      {order.shipping_district && <p>District: {order.shipping_district}</p>}
                      <p>{order.shipping_city}</p>
                      {order.shipping_notes && (
                        <p className="text-muted-foreground mt-2">
                          <span className="font-medium">Notes:</span> {order.shipping_notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Delivery & Payment Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 flex items-start gap-3">
                      <Truck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Delivery Type</p>
                        <p className="font-medium capitalize">{order.delivery_type}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-start gap-3">
                      <CreditCard className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Payment Method</p>
                        <p className="font-medium capitalize">{order.payment_method}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Scheduled Date</p>
                        <p className="font-medium">
                          {order.scheduled_date
                            ? new Date(order.scheduled_date).toLocaleDateString()
                            : 'ASAP'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Time Slot</p>
                        <p className="font-medium">{order.scheduled_time || 'Any time'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Gift Options */}
                {order.is_gift && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Gift className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Gift Order</p>
                          {order.gift_message && (
                            <p className="text-sm text-muted-foreground mt-1">
                              "{order.gift_message}"
                            </p>
                          )}
                          {order.hide_invoice && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              Invoice hidden
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Order Items */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Order Items ({orderItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {orderItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                        >
                          {item.product_image ? (
                            <img
                              src={item.product_image}
                              alt={item.product_name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.product_name}</p>
                            {item.variant_name && (
                              <p className="text-xs text-muted-foreground">
                                {item.variant_name}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.unit_price)} × {item.quantity}
                            </p>
                          </div>
                          <p className="font-bold">{formatCurrency(item.total_price)}</p>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-4" />

                    {/* Price Breakdown */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{formatCurrency(order.shipping_fee)}</span>
                      </div>
                      {order.gift_wrap_fee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gift Wrap</span>
                          <span>{formatCurrency(order.gift_wrap_fee)}</span>
                        </div>
                      )}
                      {order.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>-{formatCurrency(order.discount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span>{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Timeline */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Order Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {timeline.length > 0 ? (
                      <div className="relative">
                        <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-border" />
                        <div className="space-y-4">
                          {timeline.map((event, index) => (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="relative flex items-start gap-4 ps-8"
                            >
                              <div className="absolute left-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                <CheckCircle className="w-3 h-3 text-primary-foreground" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{event.status}</p>
                                <p className="text-xs text-muted-foreground">
                                  {event.message}
                                </p>
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
                        No timeline events yet
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Notes */}
                {(order.notes || order.internal_notes) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {order.notes && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Customer Notes
                          </p>
                          <p className="text-sm">{order.notes}</p>
                        </div>
                      )}
                      {order.internal_notes && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Internal Notes
                          </p>
                          <p className="text-sm">{order.internal_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Order Meta */}
                <div className="text-xs text-muted-foreground text-center space-y-1">
                  <p>Created: {formatDate(order.created_at)}</p>
                  <p>Last Updated: {formatDate(order.updated_at)}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Order not found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailModal;

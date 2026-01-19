import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, Search, MapPin, Phone, Calendar, Loader2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OrderTimeline {
  status: string;
  status_ar: string;
  message: string;
  message_ar: string;
  created_at: string;
}

interface OrderItem {
  product_name: string;
  product_name_ar: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface TrackedOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  shipping_fee: number;
  discount: number;
  recipient_name: string;
  shipping_city: string;
  shipping_district: string | null;
  estimated_delivery: string | null;
  delivery_type: string;
  created_at: string;
  items: OrderItem[];
  timeline: OrderTimeline[];
}

const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const statusLabels: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'تم استلام الطلب', en: 'Order Received' },
  confirmed: { ar: 'تم تأكيد الطلب', en: 'Order Confirmed' },
  processing: { ar: 'جاري التجهيز', en: 'Processing' },
  shipped: { ar: 'تم الشحن', en: 'Shipped' },
  delivered: { ar: 'تم التوصيل', en: 'Delivered' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

const OrderTracking = () => {
  const { language, t } = useLanguage();
  const isRTL = language === 'ar';
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [lookupToken, setLookupToken] = useState(searchParams.get('token') || '');
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (searchParams.get('order') && searchParams.get('token')) {
      handleGuestSearch();
    } else if (searchParams.get('order') && user) {
      handleAuthenticatedSearch();
    }
  }, [user]);

  // البحث للمستخدمين المسجلين
  const handleAuthenticatedSearch = async () => {
    if (!orderNumber.trim() || !user) return;
    
    setIsSearching(true);
    setNotFound(false);
    setErrorMessage('');
    setTrackedOrder(null);
    
    // البحث عن الطلب للمستخدم المسجل
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, status, total, subtotal, shipping_fee, discount, recipient_name, shipping_city, shipping_district, estimated_delivery, delivery_type, created_at')
      .eq('order_number', orderNumber.toUpperCase())
      .eq('user_id', user.id)
      .maybeSingle();

    if (orderError || !orderData) {
      setNotFound(true);
      setIsSearching(false);
      return;
    }

    // جلب عناصر الطلب
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('product_name, product_name_ar, product_image, quantity, unit_price, total_price')
      .eq('order_id', orderData.id);

    // جلب سجل الطلب
    const { data: timelineData } = await supabase
      .from('order_timeline')
      .select('status, status_ar, message, message_ar, created_at')
      .eq('order_id', orderData.id)
      .order('created_at', { ascending: true });

    setTrackedOrder({
      ...orderData,
      items: itemsData || [],
      timeline: timelineData || []
    });

    setIsSearching(false);
  };

  // البحث للضيوف باستخدام Edge Function
  const handleGuestSearch = async () => {
    if (!orderNumber.trim() || !lookupToken.trim()) {
      setErrorMessage(t('يرجى إدخال رقم الطلب ورمز التتبع', 'Please enter order number and tracking token'));
      return;
    }
    
    setIsSearching(true);
    setNotFound(false);
    setErrorMessage('');
    setTrackedOrder(null);

    try {
      const { data, error } = await supabase.functions.invoke('track-guest-order', {
        body: {
          order_number: orderNumber.toUpperCase(),
          lookup_token: lookupToken.trim()
        }
      });

      if (error || data?.error) {
        setErrorMessage(data?.error || t('حدث خطأ في البحث', 'An error occurred'));
        setNotFound(true);
        setIsSearching(false);
        return;
      }

      setTrackedOrder(data.order);
    } catch (err) {
      setErrorMessage(t('حدث خطأ في الاتصال', 'Connection error'));
      setNotFound(true);
    }

    setIsSearching(false);
  };

  const handleSearch = () => {
    if (user) {
      handleAuthenticatedSearch();
    } else {
      handleGuestSearch();
    }
  };

  const getStatusIndex = (status: string) => {
    return statusOrder.indexOf(status);
  };

  const isStatusCompleted = (status: string) => {
    if (!trackedOrder) return false;
    return getStatusIndex(status) <= getStatusIndex(trackedOrder.status);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'confirmed':
        return CheckCircle;
      case 'processing':
        return Package;
      case 'shipped':
        return Truck;
      case 'delivered':
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    if (!trackedOrder) return 'bg-muted text-muted-foreground';
    if (status === trackedOrder.status) {
      return 'bg-primary text-primary-foreground';
    }
    if (isStatusCompleted(status)) {
      return 'bg-green-500 text-white';
    }
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t('تتبع طلبك', 'Track Your Order')}
            </h1>
            <p className="text-muted-foreground">
              {user 
                ? t('أدخل رقم الطلب لمعرفة حالة طلبك', 'Enter your order number to check its status')
                : t('أدخل رقم الطلب ورمز التتبع لمعرفة حالة طلبك', 'Enter your order number and tracking token to check its status')
              }
            </p>
          </div>

          {/* Search Box */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder={t('رقم الطلب (مثال: ORD-2024-001234)', 'Order number (e.g., ORD-2024-001234)')}
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="text-base"
                    />
                  </div>
                </div>
                
                {/* حقل رمز التتبع للضيوف فقط */}
                {!user && (
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <Key className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                      <Input
                        placeholder={t('رمز التتبع', 'Tracking Token')}
                        value={lookupToken}
                        onChange={(e) => setLookupToken(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className={`text-base ${isRTL ? 'pr-9' : 'pl-9'}`}
                      />
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleSearch} 
                  disabled={!orderNumber.trim() || (!user && !lookupToken.trim()) || isSearching}
                  className="gap-2 w-full"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {isSearching ? t('جاري البحث...', 'Searching...') : t('تتبع الطلب', 'Track Order')}
                </Button>
              </div>
              
              {notFound && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-destructive mt-4 text-center"
                >
                  {errorMessage || t('لم يتم العثور على الطلب. يرجى التحقق من البيانات المدخلة.', 'Order not found. Please check your details.')}
                </motion.p>
              )}

              {!user && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  {t('ستجد رمز التتبع في رسالة تأكيد الطلب المرسلة إليك', 'You can find the tracking token in your order confirmation message')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Order Details */}
          {trackedOrder && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Order Header */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="text-xl">
                        {t('الطلب', 'Order')} #{trackedOrder.order_number}
                      </CardTitle>
                      <p className="text-muted-foreground text-sm mt-1">
                        {t('تاريخ الطلب:', 'Order Date:')} {new Date(trackedOrder.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-sm px-4 py-2 bg-primary/10 text-primary border-primary/20"
                    >
                      {isRTL 
                        ? statusLabels[trackedOrder.status]?.ar
                        : statusLabels[trackedOrder.status]?.en
                      }
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* Progress Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('حالة الطلب', 'Order Status')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Progress Bar */}
                  <div className="relative mb-8">
                    <div className="flex justify-between items-center">
                      {statusOrder.map((status, index) => {
                        const Icon = getStatusIcon(status);
                        const isCompleted = isStatusCompleted(status);
                        const isCurrent = status === trackedOrder.status;
                        
                        return (
                          <div key={status} className="flex flex-col items-center z-10">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.1 }}
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(status)} ${isCurrent ? 'ring-4 ring-primary/30' : ''}`}
                            >
                              <Icon className="w-5 h-5" />
                            </motion.div>
                            <span className={`text-xs mt-2 text-center max-w-[80px] ${isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {isRTL ? statusLabels[status]?.ar : statusLabels[status]?.en}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Progress Line */}
                    <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted -z-0">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(getStatusIndex(trackedOrder.status) / (statusOrder.length - 1)) * 100}%` }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="h-full bg-green-500"
                      />
                    </div>
                  </div>

                  {trackedOrder.timeline.length > 0 && (
                    <>
                      <Separator className="my-6" />

                      {/* Timeline Details */}
                      <div className="space-y-4">
                        {trackedOrder.timeline.map((step, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex gap-4 items-start"
                          >
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 rounded-full bg-primary" />
                              {index < trackedOrder.timeline.length - 1 && (
                                <div className="w-0.5 h-12 bg-muted mt-1" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-foreground">
                                    {isRTL ? step.status_ar : step.status}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {isRTL ? step.message_ar : step.message}
                                  </p>
                                </div>
                                <div className="text-sm text-muted-foreground text-end">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(step.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                                  </div>
                                  <div>{new Date(step.created_at).toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Order Items & Shipping */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Order Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('المنتجات', 'Items')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {trackedOrder.items.map((item, index) => (
                      <div key={index} className="flex gap-4">
                        <img
                          src={item.product_image || '/placeholder.svg'}
                          alt={isRTL ? item.product_name_ar : item.product_name}
                          className="w-16 h-16 object-cover rounded-lg bg-muted"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{isRTL ? item.product_name_ar : item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('الكمية:', 'Qty:')} {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">{item.total_price} {t('ر.س', 'SAR')}</p>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>{t('الإجمالي', 'Total')}</span>
                      <span>{trackedOrder.total} {t('ر.س', 'SAR')}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Address */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('معلومات التوصيل', 'Delivery Info')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{trackedOrder.recipient_name}</p>
                        {trackedOrder.shipping_district && (
                          <p className="text-muted-foreground">{trackedOrder.shipping_district}</p>
                        )}
                        <p className="text-muted-foreground">{trackedOrder.shipping_city}</p>
                      </div>
                    </div>
                    {trackedOrder.estimated_delivery && (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">{t('التوصيل المتوقع', 'Expected Delivery')}</p>
                          <p className="font-medium">{new Date(trackedOrder.estimated_delivery).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Help Section */}
              <Card className="bg-muted/50">
                <CardContent className="py-6">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      {t('هل لديك أسئلة حول طلبك؟', 'Have questions about your order?')}
                    </p>
                    <Button variant="outline" className="gap-2">
                      <Phone className="w-4 h-4" />
                      {t('تواصل معنا', 'Contact Us')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Initial State */}
          {!trackedOrder && !notFound && !isSearching && (
            <Card className="bg-muted/50">
              <CardContent className="py-12 text-center">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {user 
                    ? t('أدخل رقم الطلب للبدء في التتبع', 'Enter your order number to start tracking')
                    : t('أدخل رقم الطلب ورمز التتبع للبدء', 'Enter order number and tracking token to start')
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderTracking;
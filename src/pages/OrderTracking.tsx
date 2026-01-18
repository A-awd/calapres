import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle, Clock, Search, MapPin, Phone, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import { useLanguage } from '@/contexts/LanguageContext';

interface OrderStatus {
  id: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered';
  statusAr: string;
  statusEn: string;
  date: string;
  time: string;
  description: string;
  descriptionAr: string;
}

interface TrackedOrder {
  orderNumber: string;
  currentStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered';
  estimatedDelivery: string;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  items: {
    name: string;
    nameAr: string;
    quantity: number;
    price: number;
    image: string;
  }[];
  total: number;
  timeline: OrderStatus[];
}

// Mock data for demonstration
const mockOrder: TrackedOrder = {
  orderNumber: 'ORD-2024-001234',
  currentStatus: 'shipped',
  estimatedDelivery: '2024-01-20',
  shippingAddress: {
    name: 'أحمد محمد',
    phone: '+966 50 123 4567',
    address: 'شارع الملك فهد، حي العليا',
    city: 'الرياض'
  },
  items: [
    {
      name: 'Red Roses Bouquet',
      nameAr: 'باقة ورد أحمر',
      quantity: 1,
      price: 299,
      image: '/placeholder.svg'
    },
    {
      name: 'Premium Chocolates',
      nameAr: 'شوكولاتة فاخرة',
      quantity: 2,
      price: 150,
      image: '/placeholder.svg'
    }
  ],
  total: 599,
  timeline: [
    {
      id: '1',
      status: 'pending',
      statusAr: 'تم استلام الطلب',
      statusEn: 'Order Received',
      date: '2024-01-18',
      time: '10:30 AM',
      description: 'Your order has been received and is being reviewed.',
      descriptionAr: 'تم استلام طلبك وجاري مراجعته.'
    },
    {
      id: '2',
      status: 'confirmed',
      statusAr: 'تم تأكيد الطلب',
      statusEn: 'Order Confirmed',
      date: '2024-01-18',
      time: '11:15 AM',
      description: 'Your order has been confirmed and payment verified.',
      descriptionAr: 'تم تأكيد طلبك والتحقق من الدفع.'
    },
    {
      id: '3',
      status: 'processing',
      statusAr: 'جاري التجهيز',
      statusEn: 'Processing',
      date: '2024-01-18',
      time: '02:00 PM',
      description: 'Your order is being prepared with care.',
      descriptionAr: 'يتم تجهيز طلبك بعناية.'
    },
    {
      id: '4',
      status: 'shipped',
      statusAr: 'تم الشحن',
      statusEn: 'Shipped',
      date: '2024-01-19',
      time: '09:00 AM',
      description: 'Your order is on its way to you.',
      descriptionAr: 'طلبك في الطريق إليك.'
    },
    {
      id: '5',
      status: 'delivered',
      statusAr: 'تم التوصيل',
      statusEn: 'Delivered',
      date: '',
      time: '',
      description: 'Your order has been delivered.',
      descriptionAr: 'تم توصيل طلبك.'
    }
  ]
};

const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const OrderTracking = () => {
  const { language, t } = useLanguage();
  const isRTL = language === 'ar';
  const [orderNumber, setOrderNumber] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = () => {
    setIsSearching(true);
    setNotFound(false);
    
    // Simulate API call
    setTimeout(() => {
      if (orderNumber.toUpperCase() === 'ORD-2024-001234' || orderNumber === '001234') {
        setTrackedOrder(mockOrder);
        setNotFound(false);
      } else {
        setTrackedOrder(null);
        setNotFound(true);
      }
      setIsSearching(false);
    }, 1000);
  };

  const getStatusIndex = (status: string) => {
    return statusOrder.indexOf(status);
  };

  const isStatusCompleted = (status: string) => {
    if (!trackedOrder) return false;
    return getStatusIndex(status) <= getStatusIndex(trackedOrder.currentStatus);
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
    if (status === trackedOrder.currentStatus) {
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
              {t('أدخل رقم الطلب لمعرفة حالة طلبك', 'Enter your order number to check its status')}
            </p>
          </div>

          {/* Search Box */}
          <Card className="mb-8">
            <CardContent className="pt-6">
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
                <Button 
                  onClick={handleSearch} 
                  disabled={!orderNumber.trim() || isSearching}
                  className="gap-2"
                >
                  <Search className="w-4 h-4" />
                  {isSearching ? t('جاري البحث...', 'Searching...') : t('تتبع', 'Track')}
                </Button>
              </div>
              
              {notFound && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-destructive mt-4 text-center"
                >
                  {t('لم يتم العثور على الطلب. يرجى التحقق من رقم الطلب.', 'Order not found. Please check the order number.')}
                </motion.p>
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
                        {t('الطلب', 'Order')} #{trackedOrder.orderNumber}
                      </CardTitle>
                      <p className="text-muted-foreground text-sm mt-1">
                        {t('التوصيل المتوقع:', 'Estimated Delivery:')} {trackedOrder.estimatedDelivery}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-sm px-4 py-2 bg-primary/10 text-primary border-primary/20"
                    >
                      {isRTL 
                        ? trackedOrder.timeline.find(s => s.status === trackedOrder.currentStatus)?.statusAr
                        : trackedOrder.timeline.find(s => s.status === trackedOrder.currentStatus)?.statusEn
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
                      {trackedOrder.timeline.map((step, index) => {
                        const Icon = getStatusIcon(step.status);
                        const isCompleted = isStatusCompleted(step.status);
                        const isCurrent = step.status === trackedOrder.currentStatus;
                        
                        return (
                          <div key={step.id} className="flex flex-col items-center z-10">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.1 }}
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(step.status)} ${isCurrent ? 'ring-4 ring-primary/30' : ''}`}
                            >
                              <Icon className="w-5 h-5" />
                            </motion.div>
                            <span className={`text-xs mt-2 text-center max-w-[80px] ${isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {isRTL ? step.statusAr : step.statusEn}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Progress Line */}
                    <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted -z-0">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(getStatusIndex(trackedOrder.currentStatus) / (statusOrder.length - 1)) * 100}%` }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="h-full bg-green-500"
                      />
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Timeline Details */}
                  <div className="space-y-4">
                    {trackedOrder.timeline.filter(step => isStatusCompleted(step.status) && step.date).map((step, index) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-4 items-start"
                      >
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${step.status === trackedOrder.currentStatus ? 'bg-primary' : 'bg-green-500'}`} />
                          {index < trackedOrder.timeline.filter(s => isStatusCompleted(s.status) && s.date).length - 1 && (
                            <div className="w-0.5 h-12 bg-muted mt-1" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-foreground">
                                {isRTL ? step.statusAr : step.statusEn}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {isRTL ? step.descriptionAr : step.description}
                              </p>
                            </div>
                            <div className="text-sm text-muted-foreground text-end">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {step.date}
                              </div>
                              <div>{step.time}</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
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
                          src={item.image}
                          alt={isRTL ? item.nameAr : item.name}
                          className="w-16 h-16 object-cover rounded-lg bg-muted"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{isRTL ? item.nameAr : item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('الكمية:', 'Qty:')} {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">{item.price} {t('ر.س', 'SAR')}</p>
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
                    <CardTitle>{t('عنوان التوصيل', 'Shipping Address')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{trackedOrder.shippingAddress.name}</p>
                        <p className="text-muted-foreground">{trackedOrder.shippingAddress.address}</p>
                        <p className="text-muted-foreground">{trackedOrder.shippingAddress.city}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <p className="text-muted-foreground" dir="ltr">{trackedOrder.shippingAddress.phone}</p>
                    </div>
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

          {/* Demo Hint */}
          {!trackedOrder && !notFound && (
            <Card className="bg-muted/50">
              <CardContent className="py-6 text-center">
                <p className="text-muted-foreground">
                  {t('جرب رقم الطلب: ORD-2024-001234', 'Try order number: ORD-2024-001234')}
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

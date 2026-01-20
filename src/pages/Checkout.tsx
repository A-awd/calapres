import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  CreditCard, 
  Banknote, 
  Truck, 
  Clock, 
  Gift, 
  MessageSquare,
  CheckCircle,
  MapPin,
  Phone,
  User,
  Mail,
  Building,
  Home as HomeIcon,
  ChevronDown
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useIsMobile } from '@/hooks/use-mobile';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';

// Form validation schema
const checkoutSchema = z.object({
  // Contact info
  firstName: z.string().min(2, 'الاسم الأول مطلوب').max(50),
  lastName: z.string().min(2, 'اسم العائلة مطلوب').max(50),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  phone: z.string().min(9, 'رقم الهاتف غير صحيح').max(15),
  
  // Delivery address
  city: z.string().min(2, 'المدينة مطلوبة'),
  district: z.string().min(2, 'الحي مطلوب'),
  street: z.string().min(5, 'العنوان مطلوب').max(200),
  building: z.string().optional(),
  apartment: z.string().optional(),
  notes: z.string().max(500).optional(),
  
  // Recipient info (if different)
  isGift: z.boolean().default(false),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  giftMessage: z.string().max(500).optional(),
  hideInvoice: z.boolean().default(false),
  
  // Delivery options
  deliveryType: z.enum(['standard', 'express', 'scheduled']),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  
  // Payment
  paymentMethod: z.enum(['cod', 'card', 'apple_pay', 'mada']),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

const cities = [
  { value: 'riyadh', labelAr: 'الرياض', labelEn: 'Riyadh' },
  { value: 'jeddah', labelAr: 'جدة', labelEn: 'Jeddah' },
  { value: 'dammam', labelAr: 'الدمام', labelEn: 'Dammam' },
  { value: 'makkah', labelAr: 'مكة المكرمة', labelEn: 'Makkah' },
  { value: 'madinah', labelAr: 'المدينة المنورة', labelEn: 'Madinah' },
];

const Checkout: React.FC = () => {
  const { t, language, direction } = useLanguage();
  const { items, total: cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const BackArrow = direction === 'rtl' ? ArrowRight : ArrowLeft;

  const [isGift, setIsGift] = useState(false);
  const [addGiftWrap, setAddGiftWrap] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openSections, setOpenSections] = useState({
    contact: true,
    delivery: true,
    gift: false,
    payment: true,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      deliveryType: 'standard',
      paymentMethod: 'cod',
      isGift: false,
      hideInvoice: false,
    },
  });

  const deliveryType = watch('deliveryType');
  const paymentMethod = watch('paymentMethod');

  // Pricing calculations
  const subtotal = cartTotal;
  const giftWrapPrice = addGiftWrap ? 25 : 0;
  const deliveryPrice = deliveryType === 'express' ? 35 : deliveryType === 'scheduled' ? 20 : 15;
  const total = subtotal + giftWrapPrice + deliveryPrice;

  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true);
    
    try {
      // Simulate order submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(t('تم تأكيد طلبك بنجاح!', 'Your order has been confirmed!'));
      clearCart();
      navigate('/order-success');
    } catch (error) {
      toast.error(t('حدث خطأ، يرجى المحاولة مرة أخرى', 'An error occurred, please try again'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background" dir={direction}>
        <Header />
        <main className="container-luxury py-20 text-center">
          <h1 className="font-display text-3xl font-medium mb-4">
            {t('السلة فارغة', 'Your cart is empty')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t('أضف بعض المنتجات لإتمام الشراء', 'Add some products to checkout')}
          </p>
          <Button asChild>
            <Link to="/collections">{t('تسوق الآن', 'Shop Now')}</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />

      <main className="container-luxury py-6 md:py-8 lg:py-12 px-4 md:px-6">
        {/* Back link */}
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 text-sm md:text-base text-muted-foreground hover:text-foreground transition-colors mb-4 md:mb-8"
        >
          <BackArrow className="w-4 h-4" />
          {t('العودة للسلة', 'Back to Cart')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 lg:gap-12">
          {/* Form Column */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-medium mb-4 md:mb-8">
              {t('إتمام الطلب', 'Checkout')}
            </h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Contact Information */}
              <Collapsible
                open={openSections.contact}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, contact: open }))}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-sand rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gold" />
                    <span className="font-medium">{t('معلومات الاتصال', 'Contact Information')}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform ${openSections.contact ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">{t('الاسم الأول', 'First Name')} *</Label>
                      <Input
                        id="firstName"
                        {...register('firstName')}
                        className={errors.firstName ? 'border-red-500' : ''}
                      />
                      {errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName">{t('اسم العائلة', 'Last Name')} *</Label>
                      <Input
                        id="lastName"
                        {...register('lastName')}
                        className={errors.lastName ? 'border-red-500' : ''}
                      />
                      {errors.lastName && (
                        <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">{t('البريد الإلكتروني', 'Email')} *</Label>
                      <div className="relative">
                        <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          {...register('email')}
                          className={`ps-10 ${errors.email ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phone">{t('رقم الهاتف', 'Phone')} *</Label>
                      <div className="relative">
                        <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          {...register('phone')}
                          className={`ps-10 ${errors.phone ? 'border-red-500' : ''}`}
                          placeholder="+966"
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Delivery Address */}
              <Collapsible
                open={openSections.delivery}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, delivery: open }))}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-sand rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gold" />
                    <span className="font-medium">{t('عنوان التوصيل', 'Delivery Address')}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform ${openSections.delivery ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">{t('المدينة', 'City')} *</Label>
                      <Select onValueChange={(value) => setValue('city', value)}>
                        <SelectTrigger className={errors.city ? 'border-red-500' : ''}>
                          <SelectValue placeholder={t('اختر المدينة', 'Select city')} />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map(city => (
                            <SelectItem key={city.value} value={city.value}>
                              {language === 'ar' ? city.labelAr : city.labelEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.city && (
                        <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="district">{t('الحي', 'District')} *</Label>
                      <Input
                        id="district"
                        {...register('district')}
                        className={errors.district ? 'border-red-500' : ''}
                      />
                      {errors.district && (
                        <p className="text-red-500 text-sm mt-1">{errors.district.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="street">{t('الشارع والعنوان', 'Street Address')} *</Label>
                    <div className="relative">
                      <HomeIcon className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="street"
                        {...register('street')}
                        className={`ps-10 ${errors.street ? 'border-red-500' : ''}`}
                        placeholder={t('اسم الشارع ورقم المبنى', 'Street name and building number')}
                      />
                    </div>
                    {errors.street && (
                      <p className="text-red-500 text-sm mt-1">{errors.street.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="building">{t('رقم المبنى', 'Building Number')}</Label>
                      <div className="relative">
                        <Building className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="building" {...register('building')} className="ps-10" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="apartment">{t('رقم الشقة', 'Apartment Number')}</Label>
                      <Input id="apartment" {...register('apartment')} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">{t('ملاحظات التوصيل', 'Delivery Notes')}</Label>
                    <Textarea
                      id="notes"
                      {...register('notes')}
                      placeholder={t('تعليمات خاصة للتوصيل...', 'Special delivery instructions...')}
                      rows={3}
                    />
                  </div>

                  {/* Delivery Type */}
                  <div className="pt-4">
                    <Label className="mb-3 block">{t('نوع التوصيل', 'Delivery Type')}</Label>
                    <RadioGroup
                      value={deliveryType}
                      onValueChange={(value) => setValue('deliveryType', value as any)}
                      className="space-y-3"
                    >
                      <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:border-gold transition-colors">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="standard" id="standard" />
                          <div>
                            <p className="font-medium">{t('توصيل عادي', 'Standard Delivery')}</p>
                            <p className="text-sm text-muted-foreground">{t('خلال 2-3 أيام', '2-3 days')}</p>
                          </div>
                        </div>
                        <span className="font-medium">15 {t('ر.س', 'SAR')}</span>
                      </label>
                      <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:border-gold transition-colors">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="express" id="express" />
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-500" />
                            <div>
                              <p className="font-medium">{t('توصيل سريع', 'Express Delivery')}</p>
                              <p className="text-sm text-muted-foreground">{t('خلال ساعتين', 'Within 2 hours')}</p>
                            </div>
                          </div>
                        </div>
                        <span className="font-medium">35 {t('ر.س', 'SAR')}</span>
                      </label>
                      <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:border-gold transition-colors">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="scheduled" id="scheduled" />
                          <div>
                            <p className="font-medium">{t('توصيل مجدول', 'Scheduled Delivery')}</p>
                            <p className="text-sm text-muted-foreground">{t('اختر التاريخ والوقت', 'Choose date & time')}</p>
                          </div>
                        </div>
                        <span className="font-medium">20 {t('ر.س', 'SAR')}</span>
                      </label>
                    </RadioGroup>

                    {deliveryType === 'scheduled' && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label htmlFor="scheduledDate">{t('التاريخ', 'Date')}</Label>
                          <Input type="date" id="scheduledDate" {...register('scheduledDate')} />
                        </div>
                        <div>
                          <Label htmlFor="scheduledTime">{t('الوقت', 'Time')}</Label>
                          <Select onValueChange={(value) => setValue('scheduledTime', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('اختر الوقت', 'Select time')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="9-12">9:00 - 12:00</SelectItem>
                              <SelectItem value="12-15">12:00 - 15:00</SelectItem>
                              <SelectItem value="15-18">15:00 - 18:00</SelectItem>
                              <SelectItem value="18-21">18:00 - 21:00</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Gift Options */}
              <Collapsible
                open={openSections.gift}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, gift: open }))}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-sand rounded-lg">
                  <div className="flex items-center gap-3">
                    <Gift className="w-5 h-5 text-gold" />
                    <span className="font-medium">{t('خيارات الهدية', 'Gift Options')}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform ${openSections.gift ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={isGift}
                      onCheckedChange={(checked) => {
                        setIsGift(!!checked);
                        setValue('isGift', !!checked);
                      }}
                    />
                    <span>{t('هذا الطلب هدية (التوصيل لشخص آخر)', 'This order is a gift (deliver to someone else)')}</span>
                  </label>

                  {isGift && (
                    <div className="space-y-4 p-4 bg-sand/50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="recipientName">{t('اسم المستلم', 'Recipient Name')}</Label>
                          <Input id="recipientName" {...register('recipientName')} />
                        </div>
                        <div>
                          <Label htmlFor="recipientPhone">{t('هاتف المستلم', 'Recipient Phone')}</Label>
                          <Input id="recipientPhone" type="tel" {...register('recipientPhone')} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="giftMessage">{t('رسالة الهدية', 'Gift Message')}</Label>
                        <div className="relative">
                          <MessageSquare className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Textarea
                            id="giftMessage"
                            {...register('giftMessage')}
                            className="ps-10"
                            placeholder={t('اكتب رسالتك هنا...', 'Write your message here...')}
                            rows={3}
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={watch('hideInvoice')}
                          onCheckedChange={(checked) => setValue('hideInvoice', !!checked)}
                        />
                        <span>{t('إخفاء الفاتورة من الشحنة', 'Hide invoice from shipment')}</span>
                      </label>
                    </div>
                  )}

                  <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:border-gold transition-colors">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={addGiftWrap}
                        onCheckedChange={(checked) => setAddGiftWrap(!!checked)}
                      />
                      <div>
                        <p className="font-medium">{t('تغليف هدية فاخر', 'Premium Gift Wrapping')}</p>
                        <p className="text-sm text-muted-foreground">{t('تغليف أنيق مع شريط وبطاقة', 'Elegant wrapping with ribbon and card')}</p>
                      </div>
                    </div>
                    <span className="font-medium">25 {t('ر.س', 'SAR')}</span>
                  </label>
                </CollapsibleContent>
              </Collapsible>

              {/* Payment Method */}
              <Collapsible
                open={openSections.payment}
                onOpenChange={(open) => setOpenSections(prev => ({ ...prev, payment: open }))}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-sand rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gold" />
                    <span className="font-medium">{t('طريقة الدفع', 'Payment Method')}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform ${openSections.payment ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(value) => setValue('paymentMethod', value as any)}
                    className="space-y-3"
                  >
                    <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:border-gold transition-colors">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="cod" id="cod" />
                        <Banknote className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">{t('الدفع عند الاستلام', 'Cash on Delivery')}</p>
                          <p className="text-sm text-muted-foreground">{t('ادفع نقداً عند التوصيل', 'Pay cash when delivered')}</p>
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:border-gold transition-colors">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="card" id="card" />
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{t('بطاقة ائتمان', 'Credit Card')}</p>
                          <p className="text-sm text-muted-foreground">Visa, Mastercard</p>
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:border-gold transition-colors">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="mada" id="mada" />
                        <div className="w-5 h-5 bg-green-600 rounded text-white text-xs flex items-center justify-center font-bold">M</div>
                        <div>
                          <p className="font-medium">{t('مدى', 'Mada')}</p>
                          <p className="text-sm text-muted-foreground">{t('بطاقة مدى', 'Mada debit card')}</p>
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:border-gold transition-colors">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="apple_pay" id="apple_pay" />
                        <div className="w-5 h-5 bg-black rounded text-white text-xs flex items-center justify-center">🍎</div>
                        <div>
                          <p className="font-medium">Apple Pay</p>
                          <p className="text-sm text-muted-foreground">{t('ادفع بسرعة وأمان', 'Pay quickly and securely')}</p>
                        </div>
                      </div>
                    </label>
                  </RadioGroup>
                </CollapsibleContent>
              </Collapsible>

              {/* Submit Button - Mobile */}
              <div className="lg:hidden">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-charcoal hover:bg-charcoal/90 gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    t('جاري تأكيد الطلب...', 'Confirming order...')
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {t('تأكيد الطلب', 'Confirm Order')} - {total} {t('ر.س', 'SAR')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Order Summary - Sidebar */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="lg:sticky lg:top-24 bg-sand rounded-xl p-4 md:p-6 mb-4 lg:mb-0">
              <h2 className="font-display text-lg md:text-xl font-medium mb-4 md:mb-6">
                {t('ملخص الطلب', 'Order Summary')}
              </h2>

              {/* Items - Scrollable on mobile */}
              <div className="space-y-3 md:space-y-4 mb-4 md:mb-6 max-h-48 lg:max-h-none overflow-y-auto">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-3">
                    <img
                      src={item.product.image}
                      alt={language === 'ar' ? item.product.nameAr : item.product.name}
                      loading="lazy"
                      className="w-14 h-14 md:w-16 md:h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs md:text-sm line-clamp-1">
                        {language === 'ar' ? item.product.nameAr : item.product.name}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {t('الكمية:', 'Qty:')} {item.quantity}
                      </p>
                      <p className="text-xs md:text-sm font-medium">
                        {item.product.price * item.quantity} {t('ر.س', 'SAR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/50 pt-3 md:pt-4 space-y-2 md:space-y-3">
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-muted-foreground">{t('المجموع الفرعي', 'Subtotal')}</span>
                  <span>{subtotal} {t('ر.س', 'SAR')}</span>
                </div>
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-muted-foreground">{t('التوصيل', 'Delivery')}</span>
                  <span>{deliveryPrice} {t('ر.س', 'SAR')}</span>
                </div>
                {addGiftWrap && (
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">{t('تغليف الهدية', 'Gift Wrap')}</span>
                    <span>{giftWrapPrice} {t('ر.س', 'SAR')}</span>
                  </div>
                )}
                <div className="border-t border-border/50 pt-2 md:pt-3 flex justify-between font-medium text-base md:text-lg">
                  <span>{t('الإجمالي', 'Total')}</span>
                  <span className="text-primary">{total} {t('ر.س', 'SAR')}</span>
                </div>
              </div>

              {/* Submit Button - Desktop */}
              <div className="hidden lg:block mt-4 md:mt-6">
                <Button
                  type="submit"
                  form="checkout-form"
                  size="lg"
                  className="w-full bg-charcoal hover:bg-charcoal/90 gap-2"
                  disabled={isSubmitting}
                  onClick={handleSubmit(onSubmit)}
                >
                  {isSubmitting ? (
                    t('جاري تأكيد الطلب...', 'Confirming order...')
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {t('تأكيد الطلب', 'Confirm Order')}
                    </>
                  )}
                </Button>
              </div>

              {/* Trust badges - Hidden on mobile */}
              <div className="hidden md:block mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-2">
                  <Truck className="w-3 h-3 md:w-4 md:h-4" />
                  <span>{t('توصيل آمن ومضمون', 'Safe & guaranteed delivery')}</span>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
                  <span>{t('دفع آمن 100%', '100% secure payment')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;

import { usePageMeta, PAGE_METAS } from '@/hooks/usePageMeta';
import StorefrontLayout from '@/components/storefront/StorefrontLayout';
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2, ArrowLeft, ArrowRight, Gift, MessageSquare, Eye, EyeOff, ShoppingBag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCoupon } from '@/hooks/useCoupon';
import CouponInput from '@/components/storefront/CouponInput';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const Cart: React.FC = () => {
  usePageMeta(PAGE_METAS.cart);

  const { t, direction } = useLanguage();
  const { items, total, updateQuantity, removeItem, updateItemOptions, clearCart } = useCart();
  const isMobile = useIsMobile();
  const { appliedCoupon, isValidating, error, validateCoupon, calculateDiscount, removeCoupon } = useCoupon();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  if (items.length === 0) {
    return (
      <StorefrontLayout>
        <div className="container-luxury section-padding">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto py-8 md:py-16"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <ShoppingBag className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground" />
            </div>
            <h1 className="font-display text-xl md:text-2xl font-bold mb-3 md:mb-4">
              {t('سلة التسوق فارغة', 'Your cart is empty')}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8 px-4">
              {t('ابدأ التسوق واكتشف هدايانا المميزة', 'Start shopping and discover our premium gifts')}
            </p>
            <Button asChild size={isMobile ? "default" : "lg"} className="w-full sm:w-auto">
              <Link to="/" className="gap-2">
                {t('تسوق الآن', 'Shop Now')}
                <Arrow className="w-4 h-4 md:w-5 md:h-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </StorefrontLayout>
    );
  }

  const shippingFee = total >= 500 ? 0 : 35;
  const couponDiscount = calculateDiscount(total);
  const grandTotal = total + shippingFee - couponDiscount;

  const handleApplyCoupon = async (code: string): Promise<boolean> => {
    const result = await validateCoupon(code, total);
    return result.valid;
  };

  return (
    <StorefrontLayout>
      <div className="container-luxury section-padding">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-8"
        >
          {t('سلة التسوق', 'Shopping Cart')}
          <span className="text-muted-foreground text-lg md:text-xl font-normal ms-2">
            ({items.length} {t('منتج', 'items')})
          </span>
        </motion.h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-3 md:space-y-6">
            {items.map((item, index) => (
              <motion.div
                key={`${item.product.id}-${item.variant?.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card-luxury rounded-xl p-4 md:p-6"
              >
                <div className="flex gap-3 md:gap-6">
                  {/* Image with lazy loading */}
                  <Link to={`/product/${item.product.id}`} className="flex-shrink-0">
                    <img
                      src={item.product.image}
                      alt={t(item.product.nameAr, item.product.name)}
                      loading="lazy"
                      className="w-20 h-20 md:w-28 lg:w-32 md:h-28 lg:h-32 object-cover rounded-lg"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/product/${item.product.id}`}
                          className="font-semibold text-sm md:text-lg hover:text-primary transition-colors line-clamp-2"
                        >
                          {t(item.product.nameAr, item.product.name)}
                        </Link>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {t(item.product.categoryAr, item.product.category)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id, item.variant?.id)}
                        className="p-1.5 md:p-2 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>

                    {/* Price and quantity */}
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-3 md:mb-4">
                      <span className="price-current text-sm md:text-base">
                        {item.product.price} {t('ر.س', 'SAR')}
                      </span>

                      <div className="flex items-center gap-2 md:gap-3 bg-secondary rounded-lg p-0.5 md:p-1">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)}
                          className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center hover:bg-background rounded-md transition-colors"
                        >
                          <Minus className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                        <span className="w-6 md:w-8 text-center font-medium text-sm md:text-base">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)}
                          className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center hover:bg-background rounded-md transition-colors"
                        >
                          <Plus className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Gift options - Hidden on mobile, shown on larger screens or in a collapsed section */}
                    <div className="hidden md:block space-y-3 pt-3 md:pt-4 border-t border-border">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`gift-wrap-${item.product.id}`}
                          checked={item.giftWrap}
                          onCheckedChange={(checked) => 
                            updateItemOptions(item.product.id, { giftWrap: !!checked }, item.variant?.id)
                          }
                        />
                        <label htmlFor={`gift-wrap-${item.product.id}`} className="text-sm cursor-pointer">
                          <Gift className="w-4 h-4 inline-block me-2 text-gold" />
                          {t('تغليف هدية (+15 ر.س)', 'Gift wrap (+15 SAR)')}
                        </label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`hide-invoice-${item.product.id}`}
                          checked={item.hideInvoice}
                          onCheckedChange={(checked) => 
                            updateItemOptions(item.product.id, { hideInvoice: !!checked }, item.variant?.id)
                          }
                        />
                        <label htmlFor={`hide-invoice-${item.product.id}`} className="text-sm cursor-pointer">
                          {item.hideInvoice ? <EyeOff className="w-4 h-4 inline-block me-2" /> : <Eye className="w-4 h-4 inline-block me-2" />}
                          {t('إخفاء الفاتورة', 'Hide invoice')}
                        </label>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          {t('بطاقة تهنئة (+10 ر.س)', 'Greeting card (+10 SAR)')}
                        </div>
                        <Textarea
                          placeholder={t('اكتب رسالتك هنا...', 'Write your message here...')}
                          value={item.greetingCard || ''}
                          onChange={(e) => 
                            updateItemOptions(item.product.id, { greetingCard: e.target.value }, item.variant?.id)
                          }
                          className="resize-none text-sm"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Mobile gift options summary */}
                    <div className="md:hidden flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => updateItemOptions(item.product.id, { giftWrap: !item.giftWrap }, item.variant?.id)}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                          item.giftWrap ? 'bg-gold/10 border-gold text-gold' : 'border-border'
                        }`}
                      >
                        <Gift className="w-3 h-3 inline-block me-1" />
                        {t('تغليف', 'Wrap')}
                      </button>
                      <button
                        onClick={() => updateItemOptions(item.product.id, { hideInvoice: !item.hideInvoice }, item.variant?.id)}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                          item.hideInvoice ? 'bg-primary/10 border-primary text-primary' : 'border-border'
                        }`}
                      >
                        <EyeOff className="w-3 h-3 inline-block me-1" />
                        {t('إخفاء الفاتورة', 'Hide')}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <Button variant="outline" onClick={clearCart} className="gap-2 w-full sm:w-auto" size={isMobile ? "sm" : "default"}>
              <Trash2 className="w-4 h-4" />
              {t('إفراغ السلة', 'Clear Cart')}
            </Button>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-luxury rounded-xl p-4 md:p-6 sticky top-20 md:top-24"
            >
              <h2 className="font-display text-lg md:text-xl font-bold mb-4 md:mb-6">
                {t('ملخص الطلب', 'Order Summary')}
              </h2>

              <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-muted-foreground">{t('المجموع الفرعي', 'Subtotal')}</span>
                  <span>{total.toFixed(2)} {t('ر.س', 'SAR')}</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-muted-foreground">{t('التوصيل', 'Shipping')}</span>
                  <span className={shippingFee === 0 ? 'text-green-600 font-medium' : ''}>
                    {shippingFee === 0 ? t('مجاني', 'Free') : `${shippingFee} ${t('ر.س', 'SAR')}`}
                  </span>
                </div>
                {shippingFee > 0 && (
                  <p className="text-xs md:text-sm text-muted-foreground bg-secondary/50 p-2 rounded-lg">
                    {t('أضف', 'Add')} {(500 - total).toFixed(0)} {t('ر.س للحصول على توصيل مجاني', 'SAR for free shipping')}
                  </p>
                )}
              </div>

              {/* Coupon Section */}
              <div className="border-t border-border pt-4 mb-4">
                <CouponInput
                  onApply={handleApplyCoupon}
                  onRemove={removeCoupon}
                  appliedCoupon={appliedCoupon}
                  discountAmount={couponDiscount}
                  isValidating={isValidating}
                  error={error}
                />
              </div>

              {/* Discount Row */}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm md:text-base text-green-600 mb-4">
                  <span>{t('الخصم', 'Discount')}</span>
                  <span>-{couponDiscount.toFixed(2)} {t('ر.س', 'SAR')}</span>
                </div>
              )}

              <div className="border-t border-border pt-3 md:pt-4 mb-4 md:mb-6">
                <div className="flex justify-between text-base md:text-lg font-bold">
                  <span>{t('الإجمالي', 'Total')}</span>
                  <span className="text-primary">{grandTotal.toFixed(2)} {t('ر.س', 'SAR')}</span>
                </div>
              </div>

              {/* Recipient info - Desktop only */}
              <div className="hidden lg:block space-y-3 md:space-y-4 mb-4 md:mb-6">
                <h3 className="font-medium text-sm md:text-base">{t('بيانات المستلم', 'Recipient Details')}</h3>
                <Input placeholder={t('اسم المستلم', 'Recipient name')} className="text-sm" />
                <Input placeholder={t('رقم الهاتف', 'Phone number')} dir="ltr" className="text-sm" />
                <Textarea placeholder={t('عنوان التوصيل', 'Delivery address')} rows={2} className="text-sm" />
              </div>

              <Button asChild size={isMobile ? "default" : "lg"} className="w-full gap-2" variant="luxury">
                <Link to="/checkout">
                  {t('إتمام الطلب', 'Proceed to Checkout')}
                  <Arrow className="w-4 h-4 md:w-5 md:h-5" />
                </Link>
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-3 md:mt-4">
                {t('طرق دفع آمنة ومتنوعة', 'Secure and diverse payment methods')}
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
};

export default Cart;

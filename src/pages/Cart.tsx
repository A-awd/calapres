import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2, ArrowLeft, ArrowRight, Gift, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const Cart: React.FC = () => {
  const { t, direction } = useLanguage();
  const { items, total, updateQuantity, removeItem, updateItemOptions, clearCart } = useCart();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container-luxury section-padding">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto"
          >
            <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <Gift className="w-12 h-12 text-muted-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-4">
              {t('سلة التسوق فارغة', 'Your cart is empty')}
            </h1>
            <p className="text-muted-foreground mb-8">
              {t('ابدأ التسوق واكتشف هدايانا المميزة', 'Start shopping and discover our premium gifts')}
            </p>
            <Button asChild size="lg">
              <Link to="/" className="gap-2">
                {t('تسوق الآن', 'Shop Now')}
                <Arrow className="w-5 h-5" />
              </Link>
            </Button>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  const shippingFee = total >= 500 ? 0 : 35;
  const grandTotal = total + shippingFee;

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container-luxury section-padding">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl md:text-4xl font-bold mb-8"
        >
          {t('سلة التسوق', 'Shopping Cart')}
        </motion.h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-6">
            {items.map((item, index) => (
              <motion.div
                key={`${item.product.id}-${item.variant?.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card-luxury rounded-xl p-6"
              >
                <div className="flex gap-6">
                  {/* Image */}
                  <Link to={`/product/${item.product.id}`} className="flex-shrink-0">
                    <img
                      src={item.product.image}
                      alt={t(item.product.nameAr, item.product.name)}
                      className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Link
                          to={`/product/${item.product.id}`}
                          className="font-semibold text-lg hover:text-primary transition-colors"
                        >
                          {t(item.product.nameAr, item.product.name)}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {t(item.product.categoryAr, item.product.category)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id, item.variant?.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Price and quantity */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="price-current">
                        {item.product.price} {t('ر.س', 'SAR')}
                      </span>

                      <div className="flex items-center gap-3 bg-secondary rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-background rounded-md transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-background rounded-md transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Gift options */}
                    <div className="space-y-3 pt-4 border-t border-border">
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
                          className="resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <Button variant="outline" onClick={clearCart} className="gap-2">
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
              className="card-luxury rounded-xl p-6 sticky top-24"
            >
              <h2 className="font-display text-xl font-bold mb-6">
                {t('ملخص الطلب', 'Order Summary')}
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('المجموع الفرعي', 'Subtotal')}</span>
                  <span>{total.toFixed(2)} {t('ر.س', 'SAR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('التوصيل', 'Shipping')}</span>
                  <span className={shippingFee === 0 ? 'text-green-600 font-medium' : ''}>
                    {shippingFee === 0 ? t('مجاني', 'Free') : `${shippingFee} ${t('ر.س', 'SAR')}`}
                  </span>
                </div>
                {shippingFee > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t('أضف', 'Add')} {500 - total} {t('ر.س للحصول على توصيل مجاني', 'SAR for free shipping')}
                  </p>
                )}
              </div>

              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold">
                  <span>{t('الإجمالي', 'Total')}</span>
                  <span className="text-primary">{grandTotal.toFixed(2)} {t('ر.س', 'SAR')}</span>
                </div>
              </div>

              {/* Recipient info */}
              <div className="space-y-4 mb-6">
                <h3 className="font-medium">{t('بيانات المستلم', 'Recipient Details')}</h3>
                <Input placeholder={t('اسم المستلم', 'Recipient name')} />
                <Input placeholder={t('رقم الهاتف', 'Phone number')} dir="ltr" />
                <Textarea placeholder={t('عنوان التوصيل', 'Delivery address')} rows={2} />
              </div>

              <Button size="lg" className="w-full gap-2" variant="luxury">
                {t('إتمام الطلب', 'Proceed to Checkout')}
                <Arrow className="w-5 h-5" />
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                {t('طرق دفع آمنة ومتنوعة', 'Secure and diverse payment methods')}
              </p>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Cart;

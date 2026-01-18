import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import { Button } from '@/components/ui/button';

const OrderSuccess: React.FC = () => {
  const { t, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  // Generate a random order number
  const orderNumber = `CAL-${Date.now().toString().slice(-8)}`;

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />

      <main className="container-luxury py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8"
          >
            <CheckCircle className="w-12 h-12 text-green-600" />
          </motion.div>

          <h1 className="font-display text-3xl md:text-4xl font-medium mb-4">
            {t('تم تأكيد طلبك!', 'Order Confirmed!')}
          </h1>

          <p className="text-muted-foreground mb-8">
            {t(
              'شكراً لك على طلبك. سنقوم بإرسال تفاصيل الطلب إلى بريدك الإلكتروني.',
              'Thank you for your order. We will send the order details to your email.'
            )}
          </p>

          <div className="bg-sand rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Package className="w-5 h-5 text-gold" />
              <span className="text-sm text-muted-foreground uppercase tracking-wider">
                {t('رقم الطلب', 'Order Number')}
              </span>
            </div>
            <p className="font-mono text-2xl font-medium">{orderNumber}</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t(
                'سيتم التواصل معك قريباً لتأكيد موعد التوصيل',
                'We will contact you soon to confirm the delivery time'
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline" className="gap-2">
                <Link to="/">
                  <Home className="w-4 h-4" />
                  {t('العودة للرئيسية', 'Back to Home')}
                </Link>
              </Button>
              <Button asChild className="gap-2 bg-charcoal hover:bg-charcoal/90">
                <Link to="/collections">
                  {t('متابعة التسوق', 'Continue Shopping')}
                  <Arrow className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderSuccess;

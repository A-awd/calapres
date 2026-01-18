import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Truck, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-bg.jpg';

const HeroSection: React.FC = () => {
  const { t, direction } = useLanguage();

  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-[80vh] flex items-center overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${heroImage})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-chocolate/95 via-chocolate/80 to-transparent rtl:bg-gradient-to-l" />
      </div>

      {/* Content */}
      <div className="container-luxury relative z-10">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block bg-gold/20 text-gold px-4 py-2 rounded-full text-sm font-medium mb-6">
              {t('مجموعة الربيع الجديدة', 'New Spring Collection')} ✨
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-cream leading-tight mb-6"
          >
            {t(
              'أهدِ لحظات لا تُنسى مع كالابريز',
              'Gift Unforgettable Moments with Calabriz'
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-cream/80 text-lg md:text-xl mb-8 leading-relaxed"
          >
            {t(
              'اكتشف مجموعتنا الفاخرة من الهدايا المميزة للمناسبات الخاصة. زهور طازجة، شوكولاتة فاخرة، وعطور راقية.',
              'Discover our luxury collection of premium gifts for special occasions. Fresh flowers, fine chocolates, and exquisite perfumes.'
            )}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-4 mb-12"
          >
            <Button asChild size="lg" variant="luxury">
              <Link to="/categories" className="gap-2">
                {t('تسوق الآن', 'Shop Now')}
                <Arrow className="w-5 h-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-cream text-cream hover:bg-cream hover:text-chocolate">
              <Link to="/bundle-builder">
                {t('صمم هديتك', 'Build Your Gift')}
              </Link>
            </Button>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center gap-3 text-cream/80">
              <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                <Truck className="w-5 h-5 text-gold" />
              </div>
              <span>{t('توصيل في نفس اليوم', 'Same Day Delivery')}</span>
            </div>
            <div className="flex items-center gap-3 text-cream/80">
              <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-gold" />
              </div>
              <span>{t('توصيل خلال ساعتين', '2-Hour Express')}</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Decorative elements */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.1, scale: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute bottom-0 end-0 w-96 h-96 bg-gold rounded-full blur-3xl"
      />
    </section>
  );
};

export default HeroSection;

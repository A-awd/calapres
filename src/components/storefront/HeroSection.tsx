import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import heroImage from '@/assets/hero-bg.jpg';

const HeroSection: React.FC = () => {
  const { t, direction } = useLanguage();

  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-sand">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Luxury gifts"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-white/30 rtl:bg-gradient-to-l" />
      </div>

      {/* Content */}
      <div className="container-luxury relative z-10">
        <div className="max-w-xl">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-block text-xs tracking-luxury text-gold uppercase mb-8"
          >
            {t('مجموعة الربيع الجديدة', 'NEW SPRING COLLECTION')}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-medium text-foreground leading-[1.1] mb-6"
          >
            {t(
              'أهدِ لحظات لا تُنسى مع كالابريز',
              'Gift Unforgettable Moments with Calapres'
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-base md:text-lg mb-10 leading-relaxed max-w-md"
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
            className="flex flex-wrap gap-4"
          >
            <Link
              to="/collections"
              className="inline-flex items-center gap-3 bg-charcoal text-white px-8 py-4 text-sm tracking-wider uppercase hover:bg-charcoal/90 transition-colors"
            >
              {t('تسوق الآن', 'Shop Now')}
              <Arrow className="w-4 h-4" />
            </Link>
            <Link
              to="/bundle-builder"
              className="inline-flex items-center gap-3 bg-transparent border border-charcoal text-charcoal px-8 py-4 text-sm tracking-wider uppercase hover:bg-charcoal hover:text-white transition-all"
            >
              {t('صمم هديتك', 'Build Your Gift')}
            </Link>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap gap-8 mt-16 pt-8 border-t border-border"
          >
            <div className="flex flex-col">
              <span className="text-xs tracking-wider text-muted-foreground uppercase mb-1">
                {t('توصيل', 'Delivery')}
              </span>
              <span className="text-sm font-medium">
                {t('في نفس اليوم', 'Same Day')}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs tracking-wider text-muted-foreground uppercase mb-1">
                {t('توصيل سريع', 'Express')}
              </span>
              <span className="text-sm font-medium">
                {t('خلال ساعتين', 'Within 2 Hours')}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs tracking-wider text-muted-foreground uppercase mb-1">
                {t('تغليف', 'Wrapping')}
              </span>
              <span className="text-sm font-medium">
                {t('تغليف فاخر', 'Premium Gift Wrap')}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

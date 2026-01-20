import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

interface InspirationCard {
  id: string;
  title: string;
  titleAr: string;
  subtitle?: string;
  subtitleAr?: string;
  cta: string;
  ctaAr: string;
  link: string;
  image: string;
  gradient: string;
}

const InspirationSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  const cards: InspirationCard[] = [
    {
      id: '1',
      title: 'Flowers Beyond Imagination',
      titleAr: 'زهور تفوق الخيال',
      cta: 'Gift Now',
      ctaAr: 'اهدِ الآن',
      link: '/collections/flowers',
      image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800',
      gradient: 'from-rose-900/80 via-rose-800/50 to-transparent',
    },
    {
      id: '2',
      title: 'Express Delivery',
      titleAr: 'توصيل سريع',
      cta: 'Gift Now',
      ctaAr: 'اهدِ الآن',
      link: '/collections/express',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      gradient: 'from-teal-900/80 via-teal-800/50 to-transparent',
    },
    {
      id: '3',
      title: 'Weekly Flowers, Lasting Joy',
      titleAr: 'زهور كل أسبوع، فرحة تدوم',
      subtitle: 'Subscribe Now',
      subtitleAr: 'اشترك الآن!',
      cta: 'Subscribe',
      ctaAr: 'اشترك الآن!',
      link: '/subscription',
      image: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800',
      gradient: 'from-amber-900/80 via-amber-800/50 to-transparent',
    },
  ];

  return (
    <section className="section-padding bg-white">
      <div className="container-luxury">
        {/* Header */}
        <motion.h2
          initial={initialState}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportConfig}
          className="font-display text-2xl sm:text-3xl md:text-4xl text-primary text-center mb-8 md:mb-12"
        >
          {t('اكتشف أفكاراً جديدة', 'Discover New Ideas')}
        </motion.h2>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ delay: isMobile ? 0 : index * 0.1 }}
            >
              <Link
                to={card.link}
                className="group block relative overflow-hidden rounded-2xl aspect-[4/5] md:aspect-[3/4]"
              >
                <img
                  src={card.image}
                  alt={language === 'ar' ? card.titleAr : card.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${card.gradient}`} />
                <div className="absolute inset-0 flex flex-col items-center justify-end p-6 text-white text-center">
                  <h3 className="font-display text-xl md:text-2xl font-medium mb-4">
                    {language === 'ar' ? card.titleAr : card.title}
                  </h3>
                  <Button
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-gray-900 rounded-full px-6"
                  >
                    {language === 'ar' ? card.ctaAr : card.cta}
                  </Button>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InspirationSection;

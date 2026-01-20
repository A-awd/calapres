import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Flower2, Truck, CalendarHeart, Sparkles } from 'lucide-react';

interface InspirationCard {
  id: string;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  link: string;
  icon: React.ElementType;
  bgColor: string;
  iconBg: string;
}

const InspirationSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  const cards: InspirationCard[] = [
    {
      id: '1',
      title: 'Fresh Flowers',
      titleAr: 'زهور طازجة',
      subtitle: 'Daily arrangements',
      subtitleAr: 'تنسيقات يومية',
      link: '/collections/flowers',
      icon: Flower2,
      bgColor: 'bg-gradient-to-br from-rose-50 to-pink-100',
      iconBg: 'bg-rose-500',
    },
    {
      id: '2',
      title: 'Express Delivery',
      titleAr: 'توصيل سريع',
      subtitle: 'Within 1 hour',
      subtitleAr: 'خلال ساعة',
      link: '/collections?express=true',
      icon: Truck,
      bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-100',
      iconBg: 'bg-emerald-500',
    },
    {
      id: '3',
      title: 'Occasions',
      titleAr: 'المناسبات',
      subtitle: 'All celebrations',
      subtitleAr: 'جميع الاحتفالات',
      link: '/collections',
      icon: CalendarHeart,
      bgColor: 'bg-gradient-to-br from-violet-50 to-purple-100',
      iconBg: 'bg-violet-500',
    },
    {
      id: '4',
      title: 'New Arrivals',
      titleAr: 'وصل حديثاً',
      subtitle: 'Latest collection',
      subtitleAr: 'أحدث التشكيلات',
      link: '/collections?new=true',
      icon: Sparkles,
      bgColor: 'bg-gradient-to-br from-amber-50 to-yellow-100',
      iconBg: 'bg-gold',
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
          className="font-display text-2xl sm:text-3xl text-charcoal text-center mb-8"
        >
          {t('اكتشف أفكاراً جديدة', 'Discover New Ideas')}
        </motion.h2>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ delay: isMobile ? 0 : index * 0.08 }}
            >
              <Link
                to={card.link}
                className="group block"
              >
                <div className={`relative overflow-hidden rounded-2xl p-5 md:p-6 ${card.bgColor} text-center transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1`}>
                  {/* Icon */}
                  <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl ${card.iconBg} flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <card.icon className="w-6 h-6" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="font-display text-base md:text-lg font-medium text-charcoal mb-1">
                    {language === 'ar' ? card.titleAr : card.title}
                  </h3>
                  
                  {/* Subtitle */}
                  <p className="text-charcoal/50 text-xs">
                    {language === 'ar' ? card.subtitleAr : card.subtitle}
                  </p>
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

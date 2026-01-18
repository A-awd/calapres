import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { occasions } from '@/data/mockData';

const OccasionsSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  // On mobile, load immediately without scroll-triggered animations
  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  return (
    <section className="section-padding bg-white">
      <div className="container-luxury">
        {/* Section header */}
        <div className="text-center mb-16">
          <motion.span
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            className="inline-block text-xs tracking-luxury text-gold uppercase mb-4"
          >
            {t('للمناسبات الخاصة', 'FOR SPECIAL MOMENTS')}
          </motion.span>
          <motion.h2
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            transition={{ delay: isMobile ? 0 : 0.1 }}
            className="font-display text-3xl md:text-4xl font-medium text-foreground mb-6"
          >
            {t('تسوق حسب المناسبة', 'Shop by Occasion')}
          </motion.h2>
          <motion.div
            initial={isMobile ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={viewportConfig}
            transition={{ delay: isMobile ? 0 : 0.2 }}
            className="divider-elegant mx-auto"
          />
        </div>

        {/* Occasions grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {occasions.map((occasion, index) => (
            <motion.div
              key={occasion.id}
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ delay: isMobile ? 0 : index * 0.1 }}
            >
              <Link
                to={`/collections?occasion=${occasion.slug}`}
                className="group block text-center"
              >
                <div className="relative aspect-square overflow-hidden bg-sand mb-4">
                  <img
                    src={occasion.image}
                    alt={language === 'ar' ? occasion.nameAr : occasion.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-white font-medium text-sm md:text-base">
                      {language === 'ar' ? occasion.nameAr : occasion.name}
                    </h3>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OccasionsSection;

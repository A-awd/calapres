import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStorefrontOccasions } from '@/hooks/useStorefrontData';
import { Skeleton } from '@/components/ui/skeleton';

const OccasionsSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const { data: occasions = [], isLoading } = useStorefrontOccasions();

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  if (isLoading) {
    return (
      <section className="section-padding bg-white">
        <div className="container-luxury">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="w-16 h-16 mx-auto rounded-full mb-3" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (occasions.length === 0) return null;

  return (
    <section className="section-padding bg-white">
      <div className="container-luxury">
        <div className="text-center mb-12">
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
            className="font-display text-3xl md:text-4xl font-medium text-foreground"
          >
            {t('تسوق حسب المناسبة', 'Shop by Occasion')}
          </motion.h2>
        </div>

        {/* Compact Icon Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
          {occasions.map((occasion, index) => (
            <motion.div
              key={occasion.id}
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ delay: isMobile ? 0 : index * 0.05 }}
            >
              <Link
                to={`/collections?occasion=${occasion.slug}`}
                className="group block text-center"
              >
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-sand flex items-center justify-center text-3xl group-hover:bg-gold/20 transition-colors">
                  {occasion.icon || '🎁'}
                </div>
                <h3 className="font-medium text-sm text-foreground group-hover:text-gold transition-colors">
                  {language === 'ar' ? occasion.nameAr : occasion.name}
                </h3>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OccasionsSection;

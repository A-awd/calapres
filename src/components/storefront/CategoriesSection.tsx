import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStorefrontCategories } from '@/hooks/useStorefrontData';
import { Skeleton } from '@/components/ui/skeleton';

const CategoriesSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const { data: categories = [], isLoading } = useStorefrontCategories();

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  if (isLoading) {
    return (
      <section className="section-padding bg-sand">
        <div className="container-luxury">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="section-padding bg-sand">
      <div className="container-luxury">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <motion.span
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            className="inline-block text-[10px] sm:text-xs tracking-luxury text-gold uppercase mb-3 sm:mb-4"
          >
            {t('تصفح مجموعاتنا', 'EXPLORE OUR COLLECTIONS')}
          </motion.span>
          <motion.h2
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            transition={{ delay: isMobile ? 0 : 0.1 }}
            className="font-display text-2xl sm:text-3xl md:text-4xl font-medium text-foreground"
          >
            {t('التصنيفات', 'Categories')}
          </motion.h2>
        </div>

        {/* Compact Grid - 3 columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {categories.slice(0, 6).map((category, index) => (
            <motion.div
              key={category.id}
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ delay: isMobile ? 0 : index * 0.1 }}
            >
              <Link
                to={`/collections/${category.slug}`}
                className="group block relative"
              >
                <div className="relative overflow-hidden bg-white aspect-[4/3] rounded-sm sm:rounded-md">
                  <img
                    src={category.image}
                    alt={language === 'ar' ? category.nameAr : category.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 md:p-6">
                    <h3 className="text-white font-display text-sm sm:text-base md:text-lg lg:text-xl font-medium mb-0.5 sm:mb-1">
                      {language === 'ar' ? category.nameAr : category.name}
                    </h3>
                    <p className="text-white/70 text-[10px] sm:text-xs md:text-sm">
                      {category.productCount} {t('منتج', 'Products')}
                    </p>
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

export default CategoriesSection;

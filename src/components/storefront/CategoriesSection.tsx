import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { categories } from '@/data/mockData';

const CategoriesSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  // On mobile, load immediately without scroll-triggered animations
  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  return (
    <section className="section-padding bg-sand">
      <div className="container-luxury">
        {/* Section header */}
        <div className="text-center mb-16">
          <motion.span
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            className="inline-block text-xs tracking-luxury text-gold uppercase mb-4"
          >
            {t('تصفح مجموعاتنا', 'EXPLORE OUR COLLECTIONS')}
          </motion.span>
          <motion.h2
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            transition={{ delay: isMobile ? 0 : 0.1 }}
            className="font-display text-3xl md:text-4xl font-medium text-foreground mb-6"
          >
            {t('التصنيفات', 'Categories')}
          </motion.h2>
          <motion.div
            initial={isMobile ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={viewportConfig}
            transition={{ delay: isMobile ? 0 : 0.2 }}
            className="divider-elegant mx-auto"
          />
        </div>

        {/* Categories grid - Asymmetric layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.slice(0, 4).map((category, index) => (
            <motion.div
              key={category.id}
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ delay: isMobile ? 0 : index * 0.1 }}
              className={index === 0 ? 'md:col-span-2 md:row-span-2' : ''}
            >
              <Link
                to={`/collections/${category.slug}`}
                className="group block relative h-full"
              >
                <div className={`relative overflow-hidden bg-white ${index === 0 ? 'aspect-square md:aspect-auto md:h-full' : 'aspect-square'}`}>
                  <img
                    src={category.image}
                    alt={language === 'ar' ? category.nameAr : category.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h3 className="text-white font-display text-xl md:text-2xl font-medium mb-1">
                      {language === 'ar' ? category.nameAr : category.name}
                    </h3>
                    <p className="text-white/70 text-sm">
                      {category.productCount} {t('منتج', 'Products')}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Fifth category - full width */}
        {categories[4] && (
          <motion.div
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            className="mt-4 md:mt-6"
          >
            <Link
              to={`/collections/${categories[4].slug}`}
              className="group block relative"
            >
              <div className="relative overflow-hidden bg-white aspect-[3/1]">
                <img
                  src={categories[4].image}
                  alt={language === 'ar' ? categories[4].nameAr : categories[4].name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent rtl:bg-gradient-to-l" />
                <div className="absolute inset-y-0 start-0 flex flex-col justify-center p-8 md:p-12">
                  <h3 className="text-white font-display text-2xl md:text-3xl font-medium mb-2">
                    {language === 'ar' ? categories[4].nameAr : categories[4].name}
                  </h3>
                  <p className="text-white/70 text-sm mb-4">
                    {categories[4].productCount} {t('منتج', 'Products')}
                  </p>
                  <span className="inline-flex items-center text-white text-sm tracking-wider uppercase border-b border-white/50 pb-1 w-fit group-hover:border-white transition-colors">
                    {t('تسوق الآن', 'Shop Now')}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default CategoriesSection;

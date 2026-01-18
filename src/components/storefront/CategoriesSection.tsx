import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { categories } from '@/data/mockData';

const CategoriesSection: React.FC = () => {
  const { t, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section className="section-padding">
      <div className="container-luxury">
        {/* Section header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2"
            >
              {t('تصفح حسب النوع', 'Browse by Type')}
            </motion.h2>
            <div className="divider-elegant mx-0" />
          </div>
          <Link
            to="/categories"
            className="hidden md:flex items-center gap-2 text-primary hover:gap-3 transition-all"
          >
            {t('عرض الكل', 'View All')}
            <Arrow className="w-4 h-4" />
          </Link>
        </div>

        {/* Categories grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={`/categories/${category.slug}`}
                className="group block card-luxury rounded-2xl overflow-hidden card-hover"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={category.image}
                    alt={t(category.nameAr, category.name)}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-chocolate/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 start-0 end-0 p-4 text-cream">
                    <h3 className="font-semibold text-lg mb-1">
                      {t(category.nameAr, category.name)}
                    </h3>
                    <p className="text-sm text-cream/70">
                      {category.productCount} {t('منتج', 'products')}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Mobile view all link */}
        <div className="md:hidden mt-8 text-center">
          <Link
            to="/categories"
            className="inline-flex items-center gap-2 text-primary font-medium"
          >
            {t('عرض جميع التصنيفات', 'View All Categories')}
            <Arrow className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;

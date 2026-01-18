import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { bestsellers } from '@/data/mockData';
import ProductCard from './ProductCard';

const BestsellersSection: React.FC = () => {
  const { t, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section className="section-padding bg-white">
      <div className="container-luxury">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block text-xs tracking-luxury text-gold uppercase mb-4"
            >
              {t('المفضلة لدى العملاء', 'CUSTOMER FAVORITES')}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-display text-3xl md:text-4xl font-medium text-foreground"
            >
              {t('الأكثر مبيعاً', 'Bestsellers')}
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link
              to="/bestsellers"
              className="inline-flex items-center gap-2 text-sm tracking-wider uppercase text-foreground hover:text-muted-foreground transition-colors border-b border-foreground pb-1"
            >
              {t('عرض الكل', 'View All')}
              <Arrow className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {bestsellers.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BestsellersSection;

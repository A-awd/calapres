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
    <section className="section-padding bg-secondary">
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
              {t('الأكثر مبيعاً', 'Bestsellers')}
            </motion.h2>
            <div className="divider-elegant mx-0" />
          </div>
          <Link
            to="/bestsellers"
            className="hidden md:flex items-center gap-2 text-primary hover:gap-3 transition-all"
          >
            {t('عرض الكل', 'View All')}
            <Arrow className="w-4 h-4" />
          </Link>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {bestsellers.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BestsellersSection;

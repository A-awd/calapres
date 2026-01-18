import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Zap, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { expressProducts } from '@/data/mockData';
import ProductCard from './ProductCard';

const ExpressSection: React.FC = () => {
  const { t, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section className="section-padding">
      <div className="container-luxury">
        {/* Section header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center"
            >
              <Zap className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1"
              >
                {t('توصيل سريع', 'Express Delivery')}
              </motion.h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{t('توصيل خلال ساعتين', 'Delivered within 2 hours')}</span>
              </div>
            </div>
          </div>
          <Link
            to="/express"
            className="hidden md:flex items-center gap-2 text-primary hover:gap-3 transition-all"
          >
            {t('عرض الكل', 'View All')}
            <Arrow className="w-4 h-4" />
          </Link>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {expressProducts.slice(0, 4).map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExpressSection;

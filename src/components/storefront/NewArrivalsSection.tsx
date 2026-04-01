import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStorefrontProducts } from '@/hooks/useStorefrontData';
import ProductCard from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

const NewArrivalsSection: React.FC = () => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { data: products = [], isLoading } = useStorefrontProducts();

  const newProducts = products.filter(p => p.isNew).slice(0, 8);

  if (isLoading) {
    return (
      <section className="section-padding">
        <div className="container-luxury">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (newProducts.length === 0) return null;

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  return (
    <section className="section-padding">
      <div className="container-luxury">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <motion.span
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              className="inline-block text-[10px] sm:text-xs tracking-luxury text-gold uppercase mb-2"
            >
              {t('اكتشف الجديد', 'DISCOVER WHAT\'S NEW')}
            </motion.span>
            <motion.h2
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ delay: isMobile ? 0 : 0.1 }}
              className="font-display text-xl sm:text-2xl md:text-3xl font-medium text-foreground"
            >
              {t('وصل حديثاً', 'New Arrivals')}
            </motion.h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {newProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewArrivalsSection;

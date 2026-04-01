import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBestsellerProducts } from '@/hooks/useStorefrontData';
import ProductCard from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

const BestsellersSection: React.FC = () => {
  const { t, direction } = useLanguage();
  const isMobile = useIsMobile();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const { data: products = [], isLoading } = useBestsellerProducts();

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  if (isLoading) {
    return (
      <section className="section-padding bg-white">
        <div className="container-luxury">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="section-padding bg-white">
      <div className="container-luxury">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-10 md:mb-12">
          <div>
            <motion.span
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              className="inline-block text-[10px] sm:text-xs tracking-luxury text-gold uppercase mb-3 sm:mb-4"
            >
              {t('المفضلة لدى العملاء', 'CUSTOMER FAVORITES')}
            </motion.span>
            <motion.h2
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ delay: isMobile ? 0 : 0.1 }}
              className="font-display text-2xl sm:text-3xl md:text-4xl font-medium text-foreground"
            >
              {t('الأكثر مبيعاً', 'Bestsellers')}
            </motion.h2>
          </div>
          <motion.div
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            transition={{ delay: isMobile ? 0 : 0.2 }}
          >
            <Link
              to="/collections"
              className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm tracking-wider uppercase text-foreground hover:text-muted-foreground transition-colors border-b border-foreground pb-0.5 sm:pb-1"
            >
              {t('عرض الكل', 'View All')}
              <Arrow className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
          {products.slice(0, 4).map((product, index) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BestsellersSection;

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Zap, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useExpressProducts } from '@/hooks/useStorefrontData';
import ProductCard from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

const ExpressSection: React.FC = () => {
  const { t, direction } = useLanguage();
  const isMobile = useIsMobile();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const { data: products = [], isLoading } = useExpressProducts();

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  if (isLoading) {
    return (
      <section className="section-padding bg-gradient-to-b from-green-50 to-white">
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
    <section className="section-padding bg-gradient-to-b from-green-50 to-white">
      <div className="container-luxury">
        {/* Section header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <motion.div
              initial={isMobile ? { scale: 1 } : { scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={viewportConfig}
              className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center"
            >
              <Zap className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <motion.h2
                initial={initialState}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                className="font-display text-2xl md:text-3xl font-medium text-foreground mb-1"
              >
                {t('توصيل سريع', 'Express Delivery')}
              </motion.h2>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="w-4 h-4" />
                <span>{t('توصيل خلال ساعتين', 'Delivered within 2 hours')}</span>
              </div>
            </div>
          </div>
          <Link
            to="/collections?express=true"
            className="hidden md:flex items-center gap-2 text-sm tracking-wider uppercase text-foreground hover:text-green-600 transition-colors border-b border-foreground pb-1"
          >
            {t('عرض الكل', 'View All')}
            <Arrow className="w-4 h-4" />
          </Link>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.slice(0, 4).map((product, index) => (
            <ProductCard key={product.id} product={product as any} index={isMobile ? 0 : index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExpressSection;

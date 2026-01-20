import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import ProductCard from './ProductCard';
import { useBestsellerProducts, useExpressProducts, StorefrontProduct } from '@/hooks/useStorefrontData';
import { Skeleton } from '@/components/ui/skeleton';

interface FeaturedProductsSectionProps {
  title: string;
  titleAr: string;
  filter?: 'bestseller' | 'new' | 'express';
  categorySlug?: string;
}

const FeaturedProductsSection: React.FC<FeaturedProductsSectionProps> = ({
  title,
  titleAr,
  filter,
  categorySlug,
}) => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Use appropriate hook based on filter
  const { data: bestsellers = [], isLoading: loadingBestsellers } = useBestsellerProducts();
  const { data: expressProducts = [], isLoading: loadingExpress } = useExpressProducts();
  
  const isLoading = filter === 'express' ? loadingExpress : loadingBestsellers;

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  // Get products based on filter
  const getProducts = (): StorefrontProduct[] => {
    if (filter === 'bestseller') return bestsellers;
    if (filter === 'express') return expressProducts;
    if (filter === 'new') return bestsellers.filter(p => p.isNew);
    return bestsellers;
  };
  
  const products = getProducts().slice(0, 8);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (isLoading) {
    return (
      <section className="section-padding bg-white">
        <div className="container-luxury">
          <Skeleton className="h-10 w-64 mx-auto mb-8" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-72 h-96 flex-shrink-0 rounded-xl" />
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8 md:mb-12">
          <motion.h2
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            className="font-display text-2xl sm:text-3xl md:text-4xl text-primary"
          >
            {language === 'ar' ? titleAr : title}
          </motion.h2>
          <Link
            to={`/collections${categorySlug ? `/${categorySlug}` : ''}`}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {t('اكتشف تشكيلتنا', 'Explore Collection')}
          </Link>
        </div>

        {/* Scrollable Container */}
        <div className="relative group">
          {/* Scroll Buttons */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-lg rounded-full h-10 w-10 hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-lg rounded-full h-10 w-10 hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {/* Products Carousel */}
          <div
            ref={scrollRef}
            className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={initialState}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ delay: isMobile ? 0 : index * 0.05 }}
                className="flex-shrink-0 w-64 md:w-72"
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>

          {/* Progress Line */}
          <div className="h-0.5 bg-gray-100 mt-4 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-primary rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProductsSection;

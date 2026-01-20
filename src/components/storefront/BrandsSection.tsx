import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

interface Brand {
  id: string;
  name: string;
  nameAr: string;
  logo: string;
  slug: string;
}

const BrandsSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  // Sample brands - these would come from the database
  const brands: Brand[] = [
    { id: '1', name: 'FLOWARD', nameAr: 'فلاورد', logo: 'FLOWARD', slug: 'floward' },
    { id: '2', name: 'Damas', nameAr: 'داماس', logo: 'damas', slug: 'damas' },
    { id: '3', name: 'LEVO', nameAr: 'ليفو', logo: 'LEVO', slug: 'levo' },
    { id: '4', name: 'Bostani', nameAr: 'بستاني', logo: 'Bostani', slug: 'bostani' },
    { id: '5', name: 'Sweetzerland', nameAr: 'سويتزرلاند', logo: 'SWEETZERLAND', slug: 'sweetzerland' },
    { id: '6', name: 'Mubkhar', nameAr: 'مبخر', logo: 'mubkhar.', slug: 'mubkhar' },
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

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
            {t('ماركات ستحبها', 'Brands You Will Love')}
          </motion.h2>
          <Link
            to="/collections/brands"
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {t('عرض الكل', 'View All')}
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

          {/* Brands Carousel */}
          <div
            ref={scrollRef}
            className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {brands.map((brand, index) => (
              <motion.div
                key={brand.id}
                initial={initialState}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ delay: isMobile ? 0 : index * 0.05 }}
                className="flex-shrink-0"
              >
                <Link
                  to={`/collections/brands/${brand.slug}`}
                  className="group block text-center"
                >
                  <div className="w-32 h-20 md:w-40 md:h-24 mx-auto mb-3 rounded-xl bg-[#f5f0ea] flex items-center justify-center group-hover:shadow-md transition-all duration-300">
                    <span className="font-display text-lg md:text-xl text-gray-700 font-medium tracking-wide">
                      {brand.logo}
                    </span>
                  </div>
                  <h3 className="font-medium text-sm md:text-base text-foreground group-hover:text-primary transition-colors">
                    {language === 'ar' ? brand.nameAr : brand.name}
                  </h3>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Progress Line */}
          <div className="h-0.5 bg-gray-100 mt-4 rounded-full overflow-hidden">
            <div className="h-full w-1/4 bg-primary rounded-full ms-auto" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandsSection;

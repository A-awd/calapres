import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

interface GiftIdea {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  emoji: string;
}

const GiftIdeasSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  const giftIdeas: GiftIdea[] = [
    { id: 'flowers', name: 'Hand Bouquets', nameAr: 'باقات يد', slug: 'flowers', emoji: '💐' },
    { id: 'vases', name: 'Flowers in Vases', nameAr: 'زهور في المزهريات', slug: 'vases', emoji: '🌸' },
    { id: 'chocolates', name: 'Chocolates', nameAr: 'شوكولاتة', slug: 'chocolates', emoji: '🍫' },
    { id: 'cakes', name: 'Cakes', nameAr: 'كيك', slug: 'cakes', emoji: '🎂' },
    { id: 'perfumes', name: 'Perfumes', nameAr: 'عطور', slug: 'perfumes', emoji: '🌹' },
    { id: 'jewelry', name: 'Jewelry', nameAr: 'مجوهرات', slug: 'jewelry', emoji: '💍' },
    { id: 'balloons', name: 'Balloons', nameAr: 'بالونات', slug: 'balloons', emoji: '🎈' },
    { id: 'plants', name: 'Plants', nameAr: 'نباتات', slug: 'plants', emoji: '🌿' },
    { id: 'watches', name: 'Watches', nameAr: 'ساعات يد', slug: 'watches', emoji: '⌚' },
    { id: 'fashion', name: 'Fashion', nameAr: 'الأزياء', slug: 'fashion', emoji: '👔' },
    { id: 'toys', name: 'Kids Toys', nameAr: 'ألعاب الأطفال', slug: 'toys', emoji: '🧸' },
    { id: 'luxury', name: 'Luxury Gifts', nameAr: 'هدايا فاخرة', slug: 'luxury', emoji: '🎁' },
    { id: 'home', name: 'Home Decor', nameAr: 'ديكور المنزل', slug: 'home-decor', emoji: '🏠' },
    { id: 'skincare', name: 'Skincare', nameAr: 'العناية بالبشرة', slug: 'skincare', emoji: '✨' },
    { id: 'coffee', name: 'Coffee & Tea', nameAr: 'قهوة وشاي', slug: 'coffee-tea', emoji: '☕' },
    { id: 'vouchers', name: 'Vouchers', nameAr: 'قسائم وبطاقات', slug: 'vouchers', emoji: '🎟️' },
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
        <motion.h2
          initial={initialState}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportConfig}
          className="font-display text-2xl sm:text-3xl md:text-4xl text-primary text-center mb-8 md:mb-12"
        >
          {t('اكتشف أفكار هدايا رائعة', 'Discover Great Gift Ideas')}
        </motion.h2>

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

          {/* Ideas Carousel */}
          <div
            ref={scrollRef}
            className="flex gap-6 md:gap-8 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {giftIdeas.map((idea) => (
              <div
                key={idea.id}
                className="flex-shrink-0"
              >
                <Link
                  to={`/collections/${idea.slug}`}
                  className="group block text-center"
                >
                  <div className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-3 rounded-full bg-[#f5f0ea] flex items-center justify-center text-4xl md:text-5xl transition-all duration-300 shadow-sm group-hover:scale-110 group-hover:shadow-md group-hover:bg-primary/10 group-hover:-translate-y-1">
                    {idea.emoji}
                  </div>
                  <h3 className="font-medium text-sm md:text-base text-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                    {language === 'ar' ? idea.nameAr : idea.name}
                  </h3>
                </Link>
              </div>
            ))}
          </div>

          {/* Progress Line */}
          <div className="h-0.5 bg-gray-100 mt-4 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-primary rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default GiftIdeasSection;

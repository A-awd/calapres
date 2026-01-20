import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

interface Recipient {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  emoji: string;
  gradient: string;
}

const GiftRecipientsSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  const recipients: Recipient[] = [
    { id: 'father', name: 'Father', nameAr: 'الأب', slug: 'for-him', emoji: '👨', gradient: 'from-blue-100 to-blue-50' },
    { id: 'mother', name: 'Mother', nameAr: 'الأم', slug: 'for-her', emoji: '👩', gradient: 'from-pink-100 to-pink-50' },
    { id: 'husband', name: 'Husband', nameAr: 'الزوج', slug: 'for-him', emoji: '🤵', gradient: 'from-slate-100 to-slate-50' },
    { id: 'wife', name: 'Wife', nameAr: 'الزوجة', slug: 'for-her', emoji: '👰', gradient: 'from-rose-100 to-rose-50' },
    { id: 'friends', name: 'Friends', nameAr: 'أصدقاء', slug: 'friends', emoji: '👯', gradient: 'from-purple-100 to-purple-50' },
    { id: 'colleagues', name: 'Colleagues', nameAr: 'زملاء', slug: 'corporate', emoji: '👔', gradient: 'from-gray-100 to-gray-50' },
    { id: 'grandfather', name: 'Grandfather', nameAr: 'الجد', slug: 'for-him', emoji: '👴', gradient: 'from-amber-100 to-amber-50' },
    { id: 'grandmother', name: 'Grandmother', nameAr: 'الجدة', slug: 'for-her', emoji: '👵', gradient: 'from-orange-100 to-orange-50' },
    { id: 'uncle', name: 'Uncle', nameAr: 'العم أو الخال', slug: 'for-him', emoji: '👨‍🦳', gradient: 'from-teal-100 to-teal-50' },
    { id: 'aunt', name: 'Aunt', nameAr: 'العمة او الخالة', slug: 'for-her', emoji: '👩‍🦳', gradient: 'from-cyan-100 to-cyan-50' },
    { id: 'kids', name: 'Kids', nameAr: 'الأبناء', slug: 'kids', emoji: '👧', gradient: 'from-yellow-100 to-yellow-50' },
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
          {t('ستهديها لمن؟', 'Who Will You Gift?')}
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

          {/* Recipients Carousel */}
          <div
            ref={scrollRef}
            className="flex gap-6 md:gap-8 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {recipients.map((recipient, index) => (
              <motion.div
                key={recipient.id}
                initial={initialState}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ delay: isMobile ? 0 : index * 0.05 }}
                className="flex-shrink-0"
              >
                <Link
                  to={`/collections/${recipient.slug}`}
                  className="group block text-center"
                >
                  <div className={`w-24 h-24 md:w-28 md:h-28 mx-auto mb-3 rounded-full bg-gradient-to-br ${recipient.gradient} flex items-center justify-center text-5xl md:text-6xl group-hover:scale-105 transition-transform duration-300 shadow-sm overflow-hidden`}>
                    <span className="drop-shadow-sm">{recipient.emoji}</span>
                  </div>
                  <h3 className="font-medium text-sm md:text-base text-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                    {language === 'ar' ? recipient.nameAr : recipient.name}
                  </h3>
                </Link>
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

export default GiftRecipientsSection;

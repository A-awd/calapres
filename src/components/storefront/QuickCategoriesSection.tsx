import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flower2, Gift, Cake, Sparkles, Package, Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';

const quickCategories = [
  { icon: Flower2, labelAr: 'ورد', labelEn: 'Flowers', slug: 'flowers', color: 'text-pink-500', bg: 'bg-pink-50' },
  { icon: Cake, labelAr: 'كيك', labelEn: 'Cakes', slug: 'cakes', color: 'text-amber-500', bg: 'bg-amber-50' },
  { icon: Gift, labelAr: 'هدايا', labelEn: 'Gifts', slug: 'gifts', color: 'text-purple-500', bg: 'bg-purple-50' },
  { icon: Sparkles, labelAr: 'عطور', labelEn: 'Perfumes', slug: 'perfumes', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: Package, labelAr: 'شوكولاتة', labelEn: 'Chocolates', slug: 'chocolates', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  { icon: Heart, labelAr: 'باقات', labelEn: 'Bundles', slug: 'bundles', color: 'text-red-500', bg: 'bg-red-50' },
];

const QuickCategoriesSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  return (
    <section className="py-6 sm:py-8 bg-background border-b border-border/30">
      <div className="container-luxury">
        <div className="flex justify-between items-center overflow-x-auto scrollbar-hide gap-2 sm:gap-4 pb-1">
          {quickCategories.map((cat, index) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.slug}
                initial={isMobile ? { opacity: 1 } : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex-shrink-0"
              >
                <Link
                  to={`/collections/${cat.slug}`}
                  className="group flex flex-col items-center gap-2 min-w-[64px] sm:min-w-[80px]"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${cat.bg} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${cat.color}`} strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] sm:text-xs text-foreground/70 group-hover:text-foreground transition-colors font-medium text-center whitespace-nowrap">
                    {language === 'ar' ? cat.labelAr : cat.labelEn}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default QuickCategoriesSection;

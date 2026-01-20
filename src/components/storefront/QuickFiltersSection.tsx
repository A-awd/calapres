import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Zap, TrendingUp, Clock, Sparkles, Gift, Heart } from 'lucide-react';

interface QuickFilter {
  id: string;
  name: string;
  nameAr: string;
  icon: React.ReactNode;
  link: string;
  color: string;
}

const QuickFiltersSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  const quickFilters: QuickFilter[] = [
    {
      id: 'last-minute',
      name: 'Last Minute Gifts',
      nameAr: 'هدايا آخر لحظة',
      icon: <Clock className="w-5 h-5" />,
      link: '/collections?filter=last-minute',
      color: 'bg-red-50 text-red-600 hover:bg-red-100',
    },
    {
      id: 'most-ordered',
      name: 'Most Ordered',
      nameAr: 'الأكثر طلباً',
      icon: <TrendingUp className="w-5 h-5" />,
      link: '/collections?filter=most-ordered',
      color: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
    },
    {
      id: 'express',
      name: 'Express Delivery',
      nameAr: 'توصيل سريع',
      icon: <Zap className="w-5 h-5" />,
      link: '/collections?filter=express',
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    },
    {
      id: 'new',
      name: 'New Arrivals',
      nameAr: 'وصل حديثاً',
      icon: <Sparkles className="w-5 h-5" />,
      link: '/collections?filter=new',
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    },
    {
      id: 'under-100',
      name: 'Under 100 SAR',
      nameAr: 'أقل من 100 ر.س',
      icon: <Gift className="w-5 h-5" />,
      link: '/collections?maxPrice=100',
      color: 'bg-green-50 text-green-600 hover:bg-green-100',
    },
    {
      id: 'luxury',
      name: 'Luxury Gifts',
      nameAr: 'هدايا فاخرة',
      icon: <Heart className="w-5 h-5" />,
      link: '/collections?minPrice=500',
      color: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
    },
  ];

  return (
    <section className="py-6 bg-background">
      <div className="container-luxury">
        <div className="flex flex-wrap justify-center gap-3">
          {quickFilters.map((filter, index) => (
            <motion.div
              key={filter.id}
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ delay: isMobile ? 0 : index * 0.05 }}
            >
              <Link
                to={filter.link}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${filter.color}`}
              >
                {filter.icon}
                <span>{language === 'ar' ? filter.nameAr : filter.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QuickFiltersSection;
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Wallet, Sparkles, Crown, Gem } from 'lucide-react';

interface BudgetRange {
  id: string;
  label: string;
  labelAr: string;
  subtitle: string;
  subtitleAr: string;
  min: number;
  max: number | null;
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
}

const BudgetSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  const budgetRanges: BudgetRange[] = [
    { 
      id: 'under-100', 
      label: 'Under 100', 
      labelAr: 'أقل من 100', 
      subtitle: 'Simple Gifts',
      subtitleAr: 'هدايا بسيطة',
      min: 0, 
      max: 100, 
      icon: Sparkles,
      bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-100 hover:from-emerald-100 hover:to-teal-150',
      iconColor: 'text-emerald-600',
    },
    { 
      id: '100-250', 
      label: '100 - 250', 
      labelAr: '100 - 250', 
      subtitle: 'Special Touch',
      subtitleAr: 'لمسة مميزة',
      min: 100, 
      max: 250, 
      icon: Wallet,
      bgColor: 'bg-gradient-to-br from-sky-50 to-blue-100 hover:from-sky-100 hover:to-blue-150',
      iconColor: 'text-sky-600',
    },
    { 
      id: '250-500', 
      label: '250 - 500', 
      labelAr: '250 - 500', 
      subtitle: 'Premium Selection',
      subtitleAr: 'اختيار متميز',
      min: 250, 
      max: 500, 
      icon: Crown,
      bgColor: 'bg-gradient-to-br from-violet-50 to-purple-100 hover:from-violet-100 hover:to-purple-150',
      iconColor: 'text-violet-600',
    },
    { 
      id: 'luxury', 
      label: '500+', 
      labelAr: '+500', 
      subtitle: 'Luxury Gifts',
      subtitleAr: 'هدايا فاخرة',
      min: 500, 
      max: null, 
      icon: Gem,
      bgColor: 'bg-gradient-to-br from-amber-50 to-yellow-100 hover:from-amber-100 hover:to-yellow-150',
      iconColor: 'text-gold',
    },
  ];

  return (
    <section className="section-padding bg-[#FDFBF7]">
      <div className="container-luxury">
        <div className="text-center mb-8">
          <motion.h2
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            className="font-display text-2xl md:text-3xl font-medium text-charcoal"
          >
            {t('اختر حسب ميزانيتك', 'Shop by Budget')}
          </motion.h2>
          <motion.p
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            transition={{ delay: 0.1 }}
            className="text-charcoal/60 mt-2 text-sm"
          >
            {t('هدايا مميزة لكل الميزانيات', 'Perfect gifts for every budget')}
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {budgetRanges.map((range, index) => (
            <motion.div
              key={range.id}
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ delay: isMobile ? 0 : index * 0.08 }}
            >
              <Link
                to={`/collections?minPrice=${range.min}${range.max ? `&maxPrice=${range.max}` : ''}`}
                className="group block"
              >
                <div className={`relative overflow-hidden rounded-2xl p-5 md:p-6 ${range.bgColor} text-center transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1 border border-transparent group-hover:border-gold/20`}>
                  {/* Icon */}
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-white/80 flex items-center justify-center ${range.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                    <range.icon className="w-5 h-5" />
                  </div>
                  
                  {/* Price */}
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-charcoal mb-1">
                    {language === 'ar' ? range.labelAr : range.label}
                  </h3>
                  <p className="text-charcoal/50 text-[10px] uppercase tracking-wider mb-2">
                    {t('ر.س', 'SAR')}
                  </p>
                  
                  {/* Subtitle */}
                  <p className="text-charcoal/60 text-xs">
                    {language === 'ar' ? range.subtitleAr : range.subtitle}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BudgetSection;

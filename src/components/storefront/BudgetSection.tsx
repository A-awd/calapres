import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Wallet } from 'lucide-react';

interface BudgetRange {
  id: string;
  label: string;
  labelAr: string;
  min: number;
  max: number | null;
  color: string;
}

const BudgetSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  const budgetRanges: BudgetRange[] = [
    { id: 'under-100', label: 'Under 100', labelAr: 'أقل من 100', min: 0, max: 100, color: 'from-green-400 to-green-600' },
    { id: '100-250', label: '100 - 250', labelAr: '100 - 250', min: 100, max: 250, color: 'from-blue-400 to-blue-600' },
    { id: '250-500', label: '250 - 500', labelAr: '250 - 500', min: 250, max: 500, color: 'from-purple-400 to-purple-600' },
    { id: 'luxury', label: '500+', labelAr: '+500', min: 500, max: null, color: 'from-gold to-amber-600' },
  ];

  return (
    <section className="section-padding bg-sand/50">
      <div className="container-luxury">
        <div className="text-center mb-10">
          <motion.div
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            className="inline-flex items-center gap-2 text-xs tracking-luxury text-gold uppercase mb-4"
          >
            <Wallet className="w-4 h-4" />
            {t('تسوق حسب الميزانية', 'SHOP BY BUDGET')}
          </motion.div>
          <motion.h2
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            transition={{ delay: isMobile ? 0 : 0.1 }}
            className="font-display text-2xl md:text-3xl font-medium text-foreground"
          >
            {t('اختر حسب ميزانيتك', 'Choose Your Budget')}
          </motion.h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {budgetRanges.map((range, index) => (
            <motion.div
              key={range.id}
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ delay: isMobile ? 0 : index * 0.1 }}
            >
              <Link
                to={`/collections?minPrice=${range.min}${range.max ? `&maxPrice=${range.max}` : ''}`}
                className="group block"
              >
                <div className={`relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-br ${range.color} text-white text-center transition-transform duration-300 group-hover:scale-105`}>
                  <div className="relative z-10">
                    <p className="text-white/80 text-sm mb-1">{t('ر.س', 'SAR')}</p>
                    <h3 className="font-display text-2xl md:text-3xl font-bold">
                      {language === 'ar' ? range.labelAr : range.label}
                    </h3>
                  </div>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
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
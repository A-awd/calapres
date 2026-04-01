import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Truck, X } from 'lucide-react';
import { useCity, City } from '@/contexts/CityContext';
import { useLanguage } from '@/contexts/LanguageContext';

const CitySelector: React.FC = () => {
  const { selectedCity, showCityModal, setShowCityModal } = useCity();
  const cities: any[] = [];
  const isFirstVisit = false;
  const setCity = (_city: City) => {};
  const { t, language } = useLanguage();

  const handleSelect = (city: City) => {
    setCity(city);
  };

  return (
    <AnimatePresence>
      {showCityModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => !isFirstVisit && setShowCityModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-background rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button - only if not first visit */}
            {!isFirstVisit && (
              <button
                onClick={() => setShowCityModal(false)}
                className="absolute top-4 end-4 z-10 p-1.5 text-foreground/40 hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Header */}
            <div className="bg-gradient-to-br from-charcoal to-charcoal-light px-6 py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-gold" />
              </div>
              <h2 className="font-display text-2xl text-white mb-2">
                {t('اختر مدينتك', 'Choose Your City')}
              </h2>
              <p className="text-white/60 text-sm">
                {t(
                  'لنعرض لك المنتجات المتاحة وخيارات التوصيل',
                  'So we can show you available products and delivery options'
                )}
              </p>
            </div>

            {/* Cities Grid */}
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cities.filter(c => c.isActive).map((city) => {
                  const isSelected = selectedCity?.id === city.id;
                  return (
                    <button
                      key={city.id}
                      onClick={() => handleSelect(city)}
                      className={`group relative flex flex-col items-center gap-2.5 p-4 rounded-lg border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-gold bg-gold/5 shadow-sm'
                          : 'border-border/50 hover:border-gold/50 hover:bg-sand/50'
                      }`}
                    >
                      {/* City icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-gold text-white' : 'bg-sand text-foreground/40 group-hover:bg-gold/10 group-hover:text-gold'
                      }`}>
                        <MapPin className="w-5 h-5" />
                      </div>

                      {/* City name */}
                      <span className={`text-sm font-medium transition-colors ${
                        isSelected ? 'text-foreground' : 'text-foreground/70'
                      }`}>
                        {language === 'ar' ? city.nameAr : city.name}
                      </span>

                      {/* Delivery info */}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Truck className="w-3 h-3" />
                        <span>{language === 'ar' ? city.estimatedDeliveryAr : city.estimatedDelivery}</span>
                      </div>

                      {/* Selected checkmark */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-gold flex items-center justify-center"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Delivery note */}
              <div className="mt-5 flex items-start gap-2.5 p-3 bg-sand/60 rounded-lg">
                <Truck className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(
                    'التوصيل متاح في نفس اليوم لمعظم المدن. أوقات التوصيل قد تختلف حسب المنطقة.',
                    'Same-day delivery available in most cities. Delivery times may vary by area.'
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CitySelector;

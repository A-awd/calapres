import React from 'react';
import { motion } from 'framer-motion';
import { Truck, Clock, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDelivery, DeliverySlot } from '@/hooks/useDelivery';

const DeliveryPicker: React.FC = () => {
  const { t, language } = useLanguage();
  const {
    availableDates,
    selectedDate,
    selectedSlot,
    currentDateSlots,
    deliveryFee,
    selectDate,
    selectSlot,
  } = useDelivery();

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="flex items-center gap-2">
        <Truck className="w-5 h-5 text-gold" />
        <h3 className="font-display text-lg font-medium">
          {t('موعد التوصيل', 'Delivery Schedule')}
        </h3>
      </div>

      {/* Date Selection */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          {t('اختر التاريخ', 'Select Date')}
        </p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {availableDates.map((dateItem) => {
            const isSelected = dateItem.date.toDateString() === selectedDate.toDateString();
            const dayNumber = dateItem.date.getDate();
            const dayName = dateItem.date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' });

            return (
              <button
                key={dateItem.date.toISOString()}
                onClick={() => selectDate(dateItem.date)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 w-16 sm:w-18 py-3 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-gold bg-gold/5 shadow-sm'
                    : 'border-border/50 hover:border-gold/40'
                }`}
              >
                <span className={`text-[10px] uppercase tracking-wider ${
                  isSelected ? 'text-gold font-medium' : 'text-muted-foreground'
                }`}>
                  {dateItem.isToday
                    ? t('اليوم', 'Today')
                    : dateItem.isTomorrow
                    ? t('غداً', 'Tmrw')
                    : dayName
                  }
                </span>
                <span className={`text-lg font-medium ${
                  isSelected ? 'text-foreground' : 'text-foreground/70'
                }`}>
                  {dayNumber}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot Selection */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          {t('اختر الوقت', 'Select Time Slot')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {currentDateSlots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              isSelected={selectedSlot?.id === slot.id}
              onSelect={() => selectSlot(slot)}
              language={language}
              t={t}
            />
          ))}
        </div>
      </div>

      {/* Delivery Fee Summary */}
      <div className="flex items-center justify-between p-4 bg-sand/60 rounded-lg">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground/70">
            {t('رسوم التوصيل', 'Delivery Fee')}
          </span>
        </div>
        <span className="text-sm font-medium">
          {deliveryFee > 0
            ? `${deliveryFee} ${t('ر.س', 'SAR')}`
            : t('مجاني', 'Free')
          }
        </span>
      </div>
    </div>
  );
};

interface SlotCardProps {
  slot: DeliverySlot;
  isSelected: boolean;
  onSelect: () => void;
  language: string;
  t: (ar: string, en: string) => string;
}

const SlotCard: React.FC<SlotCardProps> = ({ slot, isSelected, onSelect, language, t }) => {
  const isExpress = slot.id === 'express';

  return (
    <button
      onClick={onSelect}
      disabled={!slot.isAvailable}
      className={`relative flex items-center gap-3 p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-start ${
        !slot.isAvailable
          ? 'border-border/30 bg-muted/30 opacity-50 cursor-not-allowed'
          : isSelected
          ? 'border-gold bg-gold/5 shadow-sm'
          : 'border-border/50 hover:border-gold/40'
      }`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base flex-shrink-0 ${
        isExpress ? 'bg-amber-50' : 'bg-sand'
      }`}>
        {isExpress ? <Zap className="w-5 h-5 text-amber-500" /> : <span>{slot.icon}</span>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
          {language === 'ar' ? slot.labelAr : slot.label}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3" />
          {language === 'ar' ? slot.timeRangeAr : slot.timeRange}
        </p>
      </div>

      {/* Extra fee */}
      {slot.extraFee > 0 && (
        <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
          isExpress
            ? 'bg-amber-100 text-amber-700'
            : 'bg-muted text-muted-foreground'
        }`}>
          +{slot.extraFee} {t('ر.س', 'SAR')}
        </span>
      )}

      {/* Selected indicator */}
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

      {/* Unavailable overlay */}
      {!slot.isAvailable && (
        <span className="text-[10px] text-muted-foreground tracking-wider">
          {t('غير متاح', 'N/A')}
        </span>
      )}
    </button>
  );
};

export default DeliveryPicker;

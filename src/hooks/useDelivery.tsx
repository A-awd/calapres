import { useState, useMemo, useCallback } from 'react';
import { useCity } from '@/contexts/CityContext';
import { useLanguage } from '@/contexts/LanguageContext';

export interface DeliverySlot {
  id: string;
  label: string;
  labelAr: string;
  timeRange: string;
  timeRangeAr: string;
  extraFee: number;
  isAvailable: boolean;
  icon: string;
}

export interface DeliveryDate {
  date: Date;
  label: string;
  labelAr: string;
  isToday: boolean;
  isTomorrow: boolean;
  slots: DeliverySlot[];
}

const BASE_SLOTS: Omit<DeliverySlot, 'isAvailable'>[] = [
  {
    id: 'express',
    label: 'Express (2 hours)',
    labelAr: 'سريع (ساعتين)',
    timeRange: 'Within 2 hours',
    timeRangeAr: 'خلال ساعتين',
    extraFee: 30,
    icon: '⚡',
  },
  {
    id: 'morning',
    label: 'Morning',
    labelAr: 'صباحي',
    timeRange: '8:00 AM - 12:00 PM',
    timeRangeAr: '٨:٠٠ ص - ١٢:٠٠ م',
    extraFee: 0,
    icon: '🌅',
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    labelAr: 'ظهري',
    timeRange: '12:00 PM - 4:00 PM',
    timeRangeAr: '١٢:٠٠ م - ٤:٠٠ م',
    extraFee: 0,
    icon: '☀️',
  },
  {
    id: 'evening',
    label: 'Evening',
    labelAr: 'مسائي',
    timeRange: '4:00 PM - 8:00 PM',
    timeRangeAr: '٤:٠٠ م - ٨:٠٠ م',
    extraFee: 0,
    icon: '🌆',
  },
  {
    id: 'night',
    label: 'Night',
    labelAr: 'ليلي',
    timeRange: '8:00 PM - 11:00 PM',
    timeRangeAr: '٨:٠٠ م - ١١:٠٠ م',
    extraFee: 10,
    icon: '🌙',
  },
];

function getAvailableSlots(date: Date): DeliverySlot[] {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const currentHour = now.getHours();

  return BASE_SLOTS.map(slot => {
    let isAvailable = true;

    if (isToday) {
      switch (slot.id) {
        case 'express':
          isAvailable = currentHour < 20; // available until 8 PM
          break;
        case 'morning':
          isAvailable = currentHour < 6; // must order before 6 AM
          break;
        case 'afternoon':
          isAvailable = currentHour < 10; // must order before 10 AM
          break;
        case 'evening':
          isAvailable = currentHour < 14; // must order before 2 PM
          break;
        case 'night':
          isAvailable = currentHour < 18; // must order before 6 PM
          break;
      }
    }

    return { ...slot, isAvailable };
  });
}

function formatDate(date: Date, language: 'ar' | 'en'): string {
  return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export const useDelivery = () => {
  const { selectedCity } = useCity();
  const { language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null);

  // Generate next 7 days
  const availableDates = useMemo((): DeliveryDate[] => {
    const dates: DeliveryDate[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const isToday = i === 0;
      const isTomorrow = i === 1;

      dates.push({
        date,
        label: isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatDate(date, 'en'),
        labelAr: isToday ? 'اليوم' : isTomorrow ? 'غداً' : formatDate(date, 'ar'),
        isToday,
        isTomorrow,
        slots: getAvailableSlots(date),
      });
    }

    return dates;
  }, []);

  const currentDateSlots = useMemo(() => {
    const found = availableDates.find(d => d.date.toDateString() === selectedDate.toDateString());
    return found?.slots || [];
  }, [selectedDate, availableDates]);

  const deliveryFee = useMemo(() => {
    const baseFee = selectedCity?.deliveryFee || 25;
    const slotFee = selectedSlot?.extraFee || 0;
    return baseFee + slotFee;
  }, [selectedCity, selectedSlot]);

  const selectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null); // reset slot when date changes
  }, []);

  const selectSlot = useCallback((slot: DeliverySlot) => {
    if (slot.isAvailable) {
      setSelectedSlot(slot);
    }
  }, []);

  const deliverySummary = useMemo(() => {
    if (!selectedSlot) return null;
    const dateObj = availableDates.find(d => d.date.toDateString() === selectedDate.toDateString());

    return {
      date: language === 'ar' ? (dateObj?.labelAr || '') : (dateObj?.label || ''),
      slot: language === 'ar' ? selectedSlot.labelAr : selectedSlot.label,
      timeRange: language === 'ar' ? selectedSlot.timeRangeAr : selectedSlot.timeRange,
      fee: deliveryFee,
      city: language === 'ar' ? selectedCity?.nameAr : selectedCity?.name,
    };
  }, [selectedSlot, selectedDate, availableDates, language, deliveryFee, selectedCity]);

  return {
    availableDates,
    selectedDate,
    selectedSlot,
    currentDateSlots,
    deliveryFee,
    deliverySummary,
    selectDate,
    selectSlot,
  };
};

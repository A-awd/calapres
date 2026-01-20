import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Truck, Gift, Percent } from 'lucide-react';

const AnnouncementBar: React.FC = () => {
  const { t, language } = useLanguage();

  const announcements = [
    {
      icon: Truck,
      text: t('توصيل سريع خلال ساعة واحدة', 'Fast delivery within 1 hour'),
    },
    {
      icon: Gift,
      text: t('شحن مجاني للطلبات فوق 500 ريال', 'Free shipping for orders above 500 SAR'),
    },
    {
      icon: Percent,
      text: t('خصم 15% على أول طلب', '15% off your first order'),
    },
  ];

  // Duplicate for seamless loop
  const items = [...announcements, ...announcements, ...announcements];

  return (
    <div className="bg-gold text-charcoal overflow-hidden py-2.5 fixed top-0 left-0 right-0 z-[60]">
      <div 
        className="flex animate-marquee whitespace-nowrap"
        style={{
          animationDuration: '30s',
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 mx-8 text-xs sm:text-sm font-medium"
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.text}</span>
            <span className="mx-4 text-charcoal/30">•</span>
          </div>
        ))}
      </div>
      
      {/* Duplicate for seamless loop */}
      <div 
        className="flex animate-marquee whitespace-nowrap absolute top-2.5"
        style={{
          animationDuration: '30s',
          animationDelay: '-15s',
        }}
      >
        {items.map((item, index) => (
          <div
            key={`dup-${index}`}
            className="flex items-center gap-2 mx-8 text-xs sm:text-sm font-medium"
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.text}</span>
            <span className="mx-4 text-charcoal/30">•</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementBar;

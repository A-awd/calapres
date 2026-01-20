import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Truck, Gift, Percent } from 'lucide-react';

const AnnouncementBar: React.FC = () => {
  const { t } = useLanguage();

  const announcements = [
    {
      icon: Truck,
      text: t('توصيل سريع خلال ساعة', 'Fast delivery within 1 hour'),
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

  // Duplicate items multiple times for seamless infinite scroll
  const items = [...announcements, ...announcements, ...announcements, ...announcements];

  return (
    <div className="bg-gold text-charcoal overflow-hidden h-10 fixed top-0 left-0 right-0 z-[60] flex items-center">
      <div className="flex animate-marquee-infinite">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-6 whitespace-nowrap"
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{item.text}</span>
            <span className="text-charcoal/30 px-4">✦</span>
          </div>
        ))}
      </div>
      <div className="flex animate-marquee-infinite" aria-hidden="true">
        {items.map((item, index) => (
          <div
            key={`dup-${index}`}
            className="flex items-center gap-2 px-6 whitespace-nowrap"
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{item.text}</span>
            <span className="text-charcoal/30 px-4">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementBar;

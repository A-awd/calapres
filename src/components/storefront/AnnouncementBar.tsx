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

  // Create the content block that will be repeated
  const ContentBlock = () => (
    <>
      {announcements.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-2 shrink-0"
        >
          <item.icon className="w-4 h-4 shrink-0" />
          <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{item.text}</span>
          <span className="text-charcoal/40 mx-6 sm:mx-8">✦</span>
        </div>
      ))}
    </>
  );

  return (
    <div className="announcement-bar bg-gold text-charcoal h-10 fixed top-0 left-0 right-0 z-[60] flex items-center overflow-hidden">
      <div className="marquee-track flex">
        {/* First copy */}
        <div className="marquee-content flex items-center">
          <ContentBlock />
        </div>
        {/* Second copy for seamless loop */}
        <div className="marquee-content flex items-center" aria-hidden="true">
          <ContentBlock />
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBar;

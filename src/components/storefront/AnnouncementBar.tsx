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

  // Single item component with trailing separator (ensures consistent spacing)
  const AnnouncementItem = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
    <div className="marquee-item">
      <Icon className="w-4 h-4 shrink-0" />
      <span>{text}</span>
      <span className="marquee-separator">✦</span>
    </div>
  );

  // Full track with all items - will be duplicated for seamless loop
  const Track = () => (
    <div className="marquee-track-inner">
      {announcements.map((item, index) => (
        <AnnouncementItem key={index} icon={item.icon} text={item.text} />
      ))}
    </div>
  );

  return (
    <div className="marquee-container">
      <div className="marquee-track">
        <Track />
        <Track />
        <Track />
        <Track />
      </div>
    </div>
  );
};

export default AnnouncementBar;

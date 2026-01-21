import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Truck, Gift, Percent, Star, Heart, Clock, Sparkles, BadgeCheck, ShieldCheck } from 'lucide-react';

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
    {
      icon: Star,
      text: t('هدايا فاخرة لجميع المناسبات', 'Luxury gifts for all occasions'),
    },
    {
      icon: Heart,
      text: t('تغليف هدايا مجاني', 'Free gift wrapping'),
    },
    {
      icon: Clock,
      text: t('توصيل في نفس اليوم', 'Same day delivery'),
    },
    {
      icon: Sparkles,
      text: t('منتجات أصلية 100%', '100% authentic products'),
    },
    {
      icon: BadgeCheck,
      text: t('ضمان جودة المنتجات', 'Quality guarantee'),
    },
    {
      icon: ShieldCheck,
      text: t('دفع آمن ومضمون', 'Secure payment'),
    },
    {
      icon: Gift,
      text: t('أفكار هدايا مميزة', 'Unique gift ideas'),
    },
    {
      icon: Truck,
      text: t('توصيل لجميع مناطق المملكة', 'Delivery to all regions'),
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

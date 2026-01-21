import React from 'react';
import * as LucideIcons from 'lucide-react';
import { useActiveAnnouncements } from '@/hooks/useAnnouncements';
import { useLanguage } from '@/contexts/LanguageContext';

const getIconComponent = (iconName: string) => {
  const pascalCase = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  const IconComponent = (LucideIcons as any)[pascalCase];
  return IconComponent || LucideIcons.Sparkles;
};

const AnnouncementBar: React.FC = () => {
  const { announcements, isLoading } = useActiveAnnouncements();
  const { language } = useLanguage();

  if (isLoading || announcements.length === 0) {
    return null;
  }

  const AnnouncementItem = ({ icon, text }: { icon: string; text: string }) => {
    const IconComponent = getIconComponent(icon);
    return (
      <div className="marquee-item">
        <IconComponent className="w-4 h-4 flex-shrink-0" />
        <span>{text}</span>
        <span className="marquee-separator">✦</span>
      </div>
    );
  };

  const Track = () => (
    <div className="marquee-track-inner">
      {announcements.map((announcement) => (
        <AnnouncementItem
          key={announcement.id}
          icon={announcement.icon}
          text={language === 'ar' ? announcement.text_ar : announcement.text}
        />
      ))}
    </div>
  );

  return (
    <div className="marquee-container bg-gold text-charcoal py-2">
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

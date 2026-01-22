import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Announcement } from '@/hooks/useAnnouncements';
import { Eye } from 'lucide-react';

const getIconComponent = (iconName: string) => {
  const pascalCase = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  const IconComponent = (LucideIcons as any)[pascalCase];
  return IconComponent || LucideIcons.Sparkles;
};

interface AnnouncementBarPreviewProps {
  announcements: Announcement[];
  speed: number;
}

const AnnouncementBarPreview: React.FC<AnnouncementBarPreviewProps> = ({
  announcements,
  speed,
}) => {
  const activeAnnouncements = announcements.filter(a => a.is_active);

  if (activeAnnouncements.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <Eye className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">لا توجد إعلانات نشطة للمعاينة</p>
      </div>
    );
  }

  const AnnouncementItem = ({ icon, text }: { icon: string; text: string }) => {
    const IconComponent = getIconComponent(icon);
    return (
      <div className="flex items-center gap-2 px-6 whitespace-nowrap">
        <IconComponent className="w-4 h-4 flex-shrink-0" />
        <span>{text}</span>
        <span className="text-gold/60 mx-2">✦</span>
      </div>
    );
  };

  const Track = () => (
    <div className="flex items-center">
      {activeAnnouncements.map((announcement) => (
        <AnnouncementItem
          key={announcement.id}
          icon={announcement.icon}
          text={announcement.text_ar}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Eye className="w-4 h-4" />
        <span>معاينة مباشرة للشريط</span>
        <span className="text-xs text-gray-400">(السرعة: {speed} ثانية)</span>
      </div>
      <div 
        className="relative overflow-hidden rounded-xl border border-gray-200"
        dir="ltr"
      >
        <div className="bg-[#D4AF37] text-[#1a1a1a] py-2.5 font-medium text-sm">
          <style>{`
            @keyframes preview-marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-25%); }
            }
            .preview-track {
              display: flex;
              animation: preview-marquee ${speed}s linear infinite;
            }
          `}</style>
          <div className="preview-track">
            <Track />
            <Track />
            <Track />
            <Track />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBarPreview;

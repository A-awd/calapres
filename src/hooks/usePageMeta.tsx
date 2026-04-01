import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PageMeta {
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
}

const BRAND = 'CALAPRES';

export const usePageMeta = ({ titleAr, titleEn, descriptionAr, descriptionEn }: PageMeta) => {
  const { language } = useLanguage();

  useEffect(() => {
    const title = language === 'ar' ? titleAr : titleEn;
    document.title = `${title} | ${BRAND}`;

    // Update meta description
    const desc = language === 'ar' ? (descriptionAr || '') : (descriptionEn || '');
    if (desc) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = desc;
    }

    // Update OG tags
    const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
    if (ogTitle) ogTitle.content = `${title} | ${BRAND}`;

    return () => {
      document.title = BRAND;
    };
  }, [language, titleAr, titleEn, descriptionAr, descriptionEn]);
};

// Pre-defined page metas
export const PAGE_METAS = {
  home: {
    titleAr: 'الرئيسية',
    titleEn: 'Home',
    descriptionAr: 'كالابريز - أفخم الهدايا والورود مع توصيل في نفس اليوم',
    descriptionEn: 'CALAPRES - Premium gifts and flowers with same-day delivery',
  },
  collections: {
    titleAr: 'المجموعات',
    titleEn: 'Collections',
    descriptionAr: 'تصفح مجموعاتنا من الورود والهدايا الفاخرة',
    descriptionEn: 'Browse our premium flowers and gifts collections',
  },
  cart: {
    titleAr: 'سلة التسوق',
    titleEn: 'Shopping Cart',
  },
  checkout: {
    titleAr: 'إتمام الطلب',
    titleEn: 'Checkout',
  },
  about: {
    titleAr: 'من نحن',
    titleEn: 'About Us',
    descriptionAr: 'تعرف على كالابريز - منصة الهدايا الفاخرة',
    descriptionEn: 'Learn about CALAPRES - Premium gifting platform',
  },
  faq: {
    titleAr: 'الأسئلة الشائعة',
    titleEn: 'FAQ',
  },
  account: {
    titleAr: 'حسابي',
    titleEn: 'My Account',
  },
  trackOrder: {
    titleAr: 'تتبع الطلب',
    titleEn: 'Track Order',
  },
  bundleBuilder: {
    titleAr: 'صمم هديتك',
    titleEn: 'Build Your Gift',
    descriptionAr: 'صمم باقة هديتك المخصصة',
    descriptionEn: 'Design your custom gift bundle',
  },
  ramadan: {
    titleAr: 'رمضان',
    titleEn: 'Ramadan Collection',
    descriptionAr: 'مجموعة هدايا رمضان المميزة',
    descriptionEn: 'Special Ramadan gifts collection',
  },
};

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface AudienceCard {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image: string;
  emoji: string;
}

const TargetAudienceSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  const audiences: AudienceCard[] = [
    {
      id: 'mens',
      name: "Men's Gifts",
      nameAr: 'هدايا رجالية',
      slug: 'mens-gifts',
      image: 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=600',
      emoji: '👔',
    },
    {
      id: 'womens',
      name: "Women's Gifts",
      nameAr: 'هدايا نسائية',
      slug: 'womens-gifts',
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600',
      emoji: '👗',
    },
    {
      id: 'kids',
      name: "Kids' Gifts",
      nameAr: 'هدايا أطفال',
      slug: 'kids-gifts',
      image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600',
      emoji: '🧸',
    },
    {
      id: 'corporate',
      name: 'Corporate Gifts',
      nameAr: 'هدايا شركات',
      slug: 'corporate',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600',
      emoji: '🏢',
    },
  ];

  return (
    <section className="section-padding bg-white">
      <div className="container-luxury">
        <div className="text-center mb-10">
          <motion.span
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            className="inline-block text-xs tracking-luxury text-gold uppercase mb-4"
          >
            {t('تسوق حسب الشخص', 'SHOP FOR SOMEONE SPECIAL')}
          </motion.span>
          <motion.h2
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            transition={{ delay: isMobile ? 0 : 0.1 }}
            className="font-display text-2xl md:text-3xl font-medium text-foreground"
          >
            {t('هدايا حسب الفئة', 'Gifts by Recipient')}
          </motion.h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {audiences.map((audience, index) => (
            <motion.div
              key={audience.id}
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ delay: isMobile ? 0 : index * 0.1 }}
            >
              <Link
                to={`/collections/${audience.slug}`}
                className="group block relative overflow-hidden rounded-2xl aspect-square"
              >
                <img
                  src={audience.image}
                  alt={language === 'ar' ? audience.nameAr : audience.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                  <span className="text-4xl mb-3">{audience.emoji}</span>
                  <h3 className="font-display text-lg md:text-xl font-medium text-center">
                    {language === 'ar' ? audience.nameAr : audience.name}
                  </h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TargetAudienceSection;
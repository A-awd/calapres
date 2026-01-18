import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { occasions } from '@/data/mockData';

const OccasionsSection: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className="section-padding bg-cream-light">
      <div className="container-luxury">
        {/* Section header */}
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4"
          >
            {t('تسوق حسب المناسبة', 'Shop by Occasion')}
          </motion.h2>
          <div className="divider-elegant mb-4" />
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t(
              'اختر الهدية المثالية لكل مناسبة خاصة في حياتك',
              'Choose the perfect gift for every special occasion in your life'
            )}
          </p>
        </div>

        {/* Occasions grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {occasions.map((occasion, index) => (
            <motion.div
              key={occasion.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={`/occasions/${occasion.slug}`}
                className="group block"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden mb-4">
                  <img
                    src={occasion.image}
                    alt={t(occasion.nameAr, occasion.name)}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-chocolate/60 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className={`w-12 h-12 ${occasion.color} rounded-full flex items-center justify-center`}>
                      <span className="text-white text-xl">❤️</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-center font-semibold text-foreground group-hover:text-primary transition-colors">
                  {t(occasion.nameAr, occasion.name)}
                </h3>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OccasionsSection;

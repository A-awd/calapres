import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { bundles } from '@/data/mockData';
import { Button } from '@/components/ui/button';

const BundlesSection: React.FC = () => {
  const { t, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section className="section-padding bg-rose-light">
      <div className="container-luxury">
        {/* Section header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4"
          >
            <Package className="w-5 h-5" />
            <span className="font-medium">{t('وفر أكثر', 'Save More')}</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4"
          >
            {t('باقات الهدايا المميزة', 'Premium Gift Bundles')}
          </motion.h2>
          <div className="divider-elegant mb-4" />
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t(
              'مجموعات هدايا منتقاة بعناية لتوفر لك أفضل قيمة',
              'Carefully curated gift sets offering you the best value'
            )}
          </p>
        </div>

        {/* Bundles grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {bundles.map((bundle, index) => (
            <motion.div
              key={bundle.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <Link to={`/bundles/${bundle.id}`} className="block">
                <div className="card-luxury rounded-2xl overflow-hidden card-hover">
                  <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    <div className="relative md:w-1/2 aspect-video md:aspect-auto overflow-hidden">
                      <img
                        src={bundle.image}
                        alt={t(bundle.nameAr, bundle.name)}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {bundle.originalPrice && (
                        <span className="absolute top-4 start-4 price-discount">
                          -{Math.round((1 - bundle.price / bundle.originalPrice) * 100)}%
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="md:w-1/2 p-6 flex flex-col justify-center">
                      <h3 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {t(bundle.nameAr, bundle.name)}
                      </h3>
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {t(bundle.descriptionAr, bundle.description)}
                      </p>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm text-muted-foreground">
                          {bundle.products.length} {t('منتجات', 'products')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <span className="price-current text-xl">
                          {bundle.price} {t('ر.س', 'SAR')}
                        </span>
                        {bundle.originalPrice && (
                          <span className="price-original">
                            {bundle.originalPrice} {t('ر.س', 'SAR')}
                          </span>
                        )}
                      </div>

                      <Button className="w-fit gap-2">
                        {t('عرض الباقة', 'View Bundle')}
                        <Arrow className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button asChild size="lg" variant="outline">
            <Link to="/bundle-builder" className="gap-2">
              <Package className="w-5 h-5" />
              {t('صمم باقتك الخاصة', 'Build Your Own Bundle')}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BundlesSection;

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Package, Crown, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStorefrontBundles } from '@/hooks/useStorefrontData';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const tierConfig: Record<string, { icon: any; label: string; labelAr: string; color: string }> = {
  basic: { icon: Package, label: 'Basic', labelAr: 'أساسي', color: 'bg-secondary text-secondary-foreground' },
  premium: { icon: Sparkles, label: 'Premium', labelAr: 'مميز', color: 'bg-gold/20 text-gold' },
  luxury: { icon: Crown, label: 'Luxury', labelAr: 'فاخر', color: 'bg-charcoal text-white' },
};

const BundlesSection: React.FC = () => {
  const { t, direction, language } = useLanguage();
  const isMobile = useIsMobile();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const { data: bundles = [], isLoading } = useStorefrontBundles();

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  if (isLoading) {
    return (
      <section className="section-padding bg-sand">
        <div className="container-luxury">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (bundles.length === 0) return null;

  return (
    <section className="section-padding bg-sand">
      <div className="container-luxury">
        <div className="text-center mb-12">
          <motion.span
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            className="inline-block text-xs tracking-luxury text-gold uppercase mb-4"
          >
            {t('قيمة أفضل', 'BETTER VALUE')}
          </motion.span>
          <motion.h2
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            className="font-display text-3xl md:text-4xl font-medium text-foreground mb-4"
          >
            {t('باقات الهدايا', 'Gift Bundles')}
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bundles.slice(0, 4).map((bundle, index) => {
            const tier = tierConfig[bundle.tier || 'basic'];
            const TierIcon = tier.icon;

            return (
              <motion.div
                key={bundle.id}
                initial={initialState}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ delay: isMobile ? 0 : index * 0.1 }}
                className="group"
              >
                <Link to={`/bundles/${bundle.id}`} className="block">
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                    <div className="flex flex-col md:flex-row">
                      <div className="relative md:w-2/5 aspect-video md:aspect-auto overflow-hidden">
                        <img
                          src={bundle.image}
                          alt={language === 'ar' ? bundle.nameAr : bundle.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {bundle.originalPrice && (
                          <span className="absolute top-3 start-3 bg-destructive text-white px-2 py-1 text-xs font-medium rounded">
                            -{Math.round((1 - bundle.price / bundle.originalPrice) * 100)}%
                          </span>
                        )}
                        <span className={`absolute top-3 end-3 px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${tier.color}`}>
                          <TierIcon className="w-3 h-3" />
                          {language === 'ar' ? tier.labelAr : tier.label}
                        </span>
                      </div>

                      <div className="md:w-3/5 p-5 flex flex-col justify-center">
                        <h3 className="font-display text-lg font-medium text-foreground mb-2 group-hover:text-gold transition-colors line-clamp-1">
                          {language === 'ar' ? bundle.nameAr : bundle.name}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                          {language === 'ar' ? bundle.descriptionAr : bundle.description}
                        </p>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-medium text-foreground">
                            {bundle.price} {t('ر.س', 'SAR')}
                          </span>
                          {bundle.originalPrice && (
                            <span className="text-sm text-muted-foreground line-through">
                              {bundle.originalPrice} {t('ر.س', 'SAR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Button asChild variant="outline" size="lg">
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

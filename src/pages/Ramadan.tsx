import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Moon, Gift, ArrowLeft, ArrowRight, Crown, Sparkles, Package } from 'lucide-react';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import WhatsAppButton from '@/components/storefront/WhatsAppButton';
import ProductCard from '@/components/storefront/ProductCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOccasionProducts, useOccasionBundles } from '@/hooks/useStorefrontData';

const RAMADAN_OCCASION_ID = '53f7856d-c84a-4d82-b1ad-88e0b2f1fba8';

const tierConfig: Record<string, { icon: any; label: string; labelAr: string; color: string }> = {
  basic: { icon: Package, label: 'Basic', labelAr: 'أساسي', color: 'bg-secondary text-secondary-foreground' },
  premium: { icon: Sparkles, label: 'Premium', labelAr: 'مميز', color: 'bg-gold/20 text-gold' },
  luxury: { icon: Crown, label: 'Luxury', labelAr: 'فاخر', color: 'bg-charcoal text-white' },
};

const Ramadan: React.FC = () => {
  const { t, language, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const { data: products = [], isLoading: productsLoading } = useOccasionProducts(RAMADAN_OCCASION_ID);
  const { data: bundles = [], isLoading: bundlesLoading } = useOccasionBundles(RAMADAN_OCCASION_ID);

  return (
    <div className="min-h-screen">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=1920&q=90"
              alt="Ramadan"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/90 via-purple-900/70 to-transparent rtl:bg-gradient-to-l" />
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-20 end-20 text-gold/30 hidden lg:block">
            <Moon className="w-32 h-32" />
          </div>

          <div className="container-luxury relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-xl"
            >
              <span className="inline-flex items-center gap-2 text-gold text-sm tracking-wider uppercase mb-6">
                <Moon className="w-4 h-4" />
                {t('مجموعة رمضان', 'RAMADAN COLLECTION')}
              </span>

              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-medium text-white leading-[1.1] mb-6">
                {t('بركات رمضان', 'Ramadan Blessings')}
              </h1>

              <p className="text-white/80 text-base md:text-lg mb-8 leading-relaxed">
                {t(
                  'اكتشف مجموعتنا الخاصة من هدايا رمضان الفاخرة. فوانيس، سجادات صلاة، تمور فاخرة، وعود عربي أصيل.',
                  'Discover our exclusive Ramadan gift collection. Lanterns, prayer mats, premium dates, and authentic Arabian oud.'
                )}
              </p>

              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-gold hover:bg-gold/90 text-charcoal gap-2">
                  <Gift className="w-5 h-5" />
                  {t('تسوق المجموعة', 'Shop Collection')}
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-charcoal">
                  {t('صمم هديتك', 'Build Your Gift')}
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Bundles Section */}
        <section className="section-padding bg-gradient-to-b from-purple-50 to-white">
          <div className="container-luxury">
            <div className="text-center mb-12">
              <span className="inline-block text-xs tracking-luxury text-gold uppercase mb-4">
                {t('باقات رمضان', 'RAMADAN BUNDLES')}
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground mb-4">
                {t('صناديق هدايا رمضان', 'Ramadan Gift Boxes')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t(
                  'باقات منتقاة بعناية تناسب جميع الميزانيات - من الأساسي إلى الفاخر',
                  'Carefully curated packages for all budgets - from Basic to Luxury'
                )}
              </p>
            </div>

            {bundlesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-80" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {bundles.map((bundle, index) => {
                  const tier = tierConfig[bundle.tier || 'basic'];
                  const TierIcon = tier.icon;

                  return (
                    <motion.div
                      key={bundle.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="group"
                    >
                      <Link to={`/bundles/${bundle.id}`} className="block h-full">
                        <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow h-full flex flex-col">
                          <div className="relative aspect-[4/3] overflow-hidden">
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
                            <span className={`absolute top-3 end-3 px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1.5 ${tier.color}`}>
                              <TierIcon className="w-4 h-4" />
                              {language === 'ar' ? tier.labelAr : tier.label}
                            </span>
                          </div>

                          <div className="p-5 flex flex-col flex-grow">
                            <h3 className="font-display text-lg font-medium text-foreground mb-2 group-hover:text-gold transition-colors">
                              {language === 'ar' ? bundle.nameAr : bundle.name}
                            </h3>
                            <p className="text-muted-foreground text-sm mb-4 flex-grow line-clamp-2">
                              {language === 'ar' ? bundle.descriptionAr : bundle.description}
                            </p>
                            
                            <div className="flex items-center justify-between mt-auto">
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-medium text-foreground">
                                  {bundle.price} {t('ر.س', 'SAR')}
                                </span>
                                {bundle.originalPrice && (
                                  <span className="text-sm text-muted-foreground line-through">
                                    {bundle.originalPrice}
                                  </span>
                                )}
                              </div>
                              <Arrow className="w-5 h-5 text-muted-foreground group-hover:text-gold transition-colors" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Products Section */}
        <section className="section-padding bg-white">
          <div className="container-luxury">
            <div className="text-center mb-12">
              <span className="inline-block text-xs tracking-luxury text-gold uppercase mb-4">
                {t('منتجات رمضان', 'RAMADAN ESSENTIALS')}
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground">
                {t('مستلزمات رمضان', 'Ramadan Products')}
              </h2>
            </div>

            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="aspect-[3/4] w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {products.slice(0, 8).map((product, index) => (
                  <ProductCard key={product.id} product={product as any} index={index} />
                ))}
              </div>
            )}

            {products.length === 0 && !productsLoading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {t('سيتم إضافة منتجات رمضان قريباً', 'Ramadan products coming soon')}
                </p>
                <Button asChild variant="outline">
                  <Link to="/collections">{t('تصفح جميع المنتجات', 'Browse All Products')}</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-purple-900 to-purple-700">
          <div className="container-luxury text-center">
            <Moon className="w-12 h-12 text-gold mx-auto mb-6" />
            <h2 className="font-display text-3xl md:text-4xl font-medium text-white mb-4">
              {t('صمم صندوق رمضان الخاص بك', 'Build Your Own Ramadan Box')}
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-8">
              {t(
                'اختر المنتجات التي تريدها وصمم هديتك المميزة لأحبائك',
                'Choose the products you want and create a unique gift for your loved ones'
              )}
            </p>
            <Button size="lg" className="bg-gold hover:bg-gold/90 text-charcoal" asChild>
              <Link to="/bundle-builder" className="gap-2">
                <Gift className="w-5 h-5" />
                {t('ابدأ التصميم', 'Start Building')}
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Ramadan;

import StorefrontLayout from '@/components/storefront/StorefrontLayout';
import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gift, ArrowLeft, ArrowRight, Crown, Sparkles, Package, Heart, Cake, PartyPopper, Moon } from 'lucide-react';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import WhatsAppButton from '@/components/storefront/WhatsAppButton';
import ProductCard from '@/components/storefront/ProductCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOccasionProducts, useOccasionBundles } from '@/hooks/useStorefrontData';

// Occasion configurations with their IDs and styling
const occasionConfigs: Record<string, {
  id: string;
  icon: any;
  heroImage: string;
  gradientFrom: string;
  gradientTo: string;
  bgGradient: string;
  title: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  description: { ar: string; en: string };
  ctaText: { ar: string; en: string };
}> = {
  wedding: {
    id: '994bafd2-3ce9-4925-a077-f012f5ba0e4c',
    icon: Heart,
    heroImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=90',
    gradientFrom: 'from-rose-900/90',
    gradientTo: 'to-pink-900/70',
    bgGradient: 'from-rose-50 to-white',
    title: { ar: 'هدايا الزفاف', en: 'Wedding Gifts' },
    subtitle: { ar: 'مجموعة الزفاف', en: 'WEDDING COLLECTION' },
    description: {
      ar: 'اكتشف مجموعتنا الفاخرة من هدايا الزفاف. باقات ورد، شوكولاتة فاخرة، وهدايا تذكارية مميزة.',
      en: 'Discover our exquisite wedding gift collection. Flower arrangements, premium chocolates, and memorable keepsakes.',
    },
    ctaText: { ar: 'تسوق هدايا الزفاف', en: 'Shop Wedding Gifts' },
  },
  birthday: {
    id: 'd024b243-1253-4906-a5b2-030e2dfe8f64',
    icon: Cake,
    heroImage: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=1920&q=90',
    gradientFrom: 'from-amber-900/90',
    gradientTo: 'to-orange-800/70',
    bgGradient: 'from-amber-50 to-white',
    title: { ar: 'هدايا عيد الميلاد', en: 'Birthday Gifts' },
    subtitle: { ar: 'مجموعة عيد الميلاد', en: 'BIRTHDAY COLLECTION' },
    description: {
      ar: 'احتفل بأحبائك مع هدايا عيد ميلاد مميزة. بالونات، كيك، شوكولاتة، وباقات ورد.',
      en: 'Celebrate your loved ones with unique birthday gifts. Balloons, cakes, chocolates, and flower bouquets.',
    },
    ctaText: { ar: 'تسوق هدايا عيد الميلاد', en: 'Shop Birthday Gifts' },
  },
  'thank-you': {
    id: 'ab62b706-2681-4bbb-9c92-0d559e1d6dc1',
    icon: PartyPopper,
    heroImage: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1920&q=90',
    gradientFrom: 'from-teal-900/90',
    gradientTo: 'to-emerald-800/70',
    bgGradient: 'from-teal-50 to-white',
    title: { ar: 'هدايا الشكر', en: 'Thank You Gifts' },
    subtitle: { ar: 'مجموعة الامتنان', en: 'GRATITUDE COLLECTION' },
    description: {
      ar: 'عبر عن امتنانك بهدايا شكر مميزة. باقات ورد، شوكولاتة فاخرة، وهدايا تعبر عن تقديرك.',
      en: 'Express your gratitude with thoughtful thank you gifts. Flower bouquets, premium chocolates, and appreciation tokens.',
    },
    ctaText: { ar: 'تسوق هدايا الشكر', en: 'Shop Thank You Gifts' },
  },
};

const tierConfig: Record<string, { icon: any; label: string; labelAr: string; color: string }> = {
  basic: { icon: Package, label: 'Basic', labelAr: 'أساسي', color: 'bg-secondary text-secondary-foreground' },
  premium: { icon: Sparkles, label: 'Premium', labelAr: 'مميز', color: 'bg-gold/20 text-gold' },
  luxury: { icon: Crown, label: 'Luxury', labelAr: 'فاخر', color: 'bg-charcoal text-white' },
};

const OccasionLanding: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, language, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;
  
  const config = slug ? occasionConfigs[slug] : null;
  
  const { data: products = [], isLoading: productsLoading } = useOccasionProducts(config?.id || '');
  const { data: bundles = [], isLoading: bundlesLoading } = useOccasionBundles(config?.id || '');

  if (!config) {
    return <Navigate to="/collections" replace />;
  }

  const OccasionIcon = config.icon;

  return (
    <StorefrontLayout>
<main>
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={config.heroImage}
              alt={language === 'ar' ? config.title.ar : config.title.en}
              className="w-full h-full object-cover"
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${config.gradientFrom} via-black/50 ${config.gradientTo} rtl:bg-gradient-to-l`} />
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-20 end-20 text-white/20 hidden lg:block">
            <OccasionIcon className="w-32 h-32" />
          </div>

          <div className="container-luxury relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-xl"
            >
              <span className="inline-flex items-center gap-2 text-gold text-sm tracking-wider uppercase mb-6">
                <OccasionIcon className="w-4 h-4" />
                {language === 'ar' ? config.subtitle.ar : config.subtitle.en}
              </span>

              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-medium text-white leading-[1.1] mb-6">
                {language === 'ar' ? config.title.ar : config.title.en}
              </h1>

              <p className="text-white/80 text-base md:text-lg mb-8 leading-relaxed">
                {language === 'ar' ? config.description.ar : config.description.en}
              </p>

              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-gold hover:bg-gold/90 text-charcoal gap-2">
                  <Gift className="w-5 h-5" />
                  {language === 'ar' ? config.ctaText.ar : config.ctaText.en}
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-charcoal">
                  {t('صمم هديتك', 'Build Your Gift')}
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Bundles Section */}
        {(bundles.length > 0 || bundlesLoading) && (
          <section className={`section-padding bg-gradient-to-b ${config.bgGradient}`}>
            <div className="container-luxury">
              <div className="text-center mb-12">
                <span className="inline-block text-xs tracking-luxury text-gold uppercase mb-4">
                  {t('الباقات', 'BUNDLES')}
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground mb-4">
                  {t('صناديق الهدايا', 'Gift Boxes')}
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {t(
                    'باقات منتقاة بعناية تناسب جميع الميزانيات',
                    'Carefully curated packages for all budgets'
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
        )}

        {/* Products Section */}
        <section className="section-padding bg-white">
          <div className="container-luxury">
            <div className="text-center mb-12">
              <span className="inline-block text-xs tracking-luxury text-gold uppercase mb-4">
                {t('المنتجات', 'PRODUCTS')}
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground">
                {language === 'ar' ? config.title.ar : config.title.en}
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
                  {t('سيتم إضافة المنتجات قريباً', 'Products coming soon')}
                </p>
                <Button asChild variant="outline">
                  <Link to="/collections">{t('تصفح جميع المنتجات', 'Browse All Products')}</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className={`py-16 bg-gradient-to-r ${config.gradientFrom.replace('/90', '')} ${config.gradientTo.replace('/70', '')}`}>
          <div className="container-luxury text-center">
            <OccasionIcon className="w-12 h-12 text-gold mx-auto mb-6" />
            <h2 className="font-display text-3xl md:text-4xl font-medium text-white mb-4">
              {t('صمم هديتك الخاصة', 'Build Your Own Gift Box')}
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
    </StorefrontLayout>
  );
};

export default OccasionLanding;
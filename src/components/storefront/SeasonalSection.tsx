import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { seasonalBundles, corporateBundles, fastGiftingBundles, emotionalBundles } from '@/data/mockData';
import { Gift, Briefcase, Zap, Heart, Star, Crown, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Bundle } from '@/types';

const SeasonalSection: React.FC = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'basic':
        return { icon: Star, label: isRTL ? 'أساسي' : 'Basic', className: 'bg-zinc-100 text-zinc-700' };
      case 'premium':
        return { icon: Crown, label: isRTL ? 'فاخر' : 'Premium', className: 'bg-amber-100 text-amber-700' };
      case 'luxury':
        return { icon: Sparkles, label: isRTL ? 'فخم' : 'Luxury', className: 'bg-purple-100 text-purple-700' };
      default:
        return null;
    }
  };

  const categories = [
    {
      id: 'seasonal',
      title: isRTL ? 'هدايا موسمية وخاصة' : 'Seasonal & Special Gifts',
      subtitle: isRTL ? 'مجموعات رمضان والمناسبات الدينية' : 'Ramadan & Religious Occasions',
      icon: Gift,
      bundles: seasonalBundles.slice(0, 3),
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'corporate',
      title: isRTL ? 'الأفضل للشركات' : 'Best for Corporate Orders',
      subtitle: isRTL ? 'هدايا الموظفين والمعلمين' : 'Employee & Teacher Appreciation',
      icon: Briefcase,
      bundles: corporateBundles.slice(0, 3),
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'fast',
      title: isRTL ? 'الأفضل للإهداء السريع' : 'Best for Fast Gifting',
      subtitle: isRTL ? 'جاهزة للتسليم الفوري' : 'Ready for Immediate Delivery',
      icon: Zap,
      bundles: fastGiftingBundles.slice(0, 3),
      color: 'from-orange-500 to-red-500',
    },
    {
      id: 'emotional',
      title: isRTL ? 'هدايا عاطفية ومعنوية' : 'Emotional & Meaningful Gifts',
      subtitle: isRTL ? 'للشفاء والتقدير والحب' : 'For Healing, Appreciation & Love',
      icon: Heart,
      bundles: emotionalBundles.slice(0, 3),
      color: 'from-pink-500 to-rose-600',
    },
  ];

  const BundleCard = ({ bundle, index }: { bundle: Bundle; index: number }) => {
    const tierBadge = getTierBadge(bundle.tier);
    const TierIcon = tierBadge?.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.1 }}
        className="group"
      >
        <Link to={`/bundle/${bundle.id}`}>
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={bundle.image}
                alt={isRTL ? bundle.nameAr : bundle.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {tierBadge && (
                <Badge className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} ${tierBadge.className} gap-1`}>
                  {TierIcon && <TierIcon className="w-3 h-3" />}
                  {tierBadge.label}
                </Badge>
              )}
              {bundle.originalPrice && (
                <Badge className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} bg-red-500 text-white`}>
                  {Math.round(((bundle.originalPrice - bundle.price) / bundle.originalPrice) * 100)}% {isRTL ? 'خصم' : 'OFF'}
                </Badge>
              )}
            </div>
            <div className="p-4">
              <h4 className="font-semibold text-foreground mb-1 line-clamp-1">
                {isRTL ? bundle.nameAr : bundle.name}
              </h4>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {isRTL ? bundle.descriptionAr : bundle.description}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">{bundle.price} SAR</span>
                {bundle.originalPrice && (
                  <span className="text-sm text-muted-foreground line-through">{bundle.originalPrice} SAR</span>
                )}
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {isRTL ? 'مجموعات الهدايا الخاصة' : 'Special Gift Collections'}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {isRTL
              ? 'اكتشف مجموعاتنا المنتقاة بعناية لكل مناسبة'
              : 'Discover our carefully curated collections for every occasion'}
          </p>
        </motion.div>

        <div className="space-y-12">
          {categories.map((category, catIndex) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: catIndex * 0.1 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${category.color} text-white`}>
                  <category.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{category.title}</h3>
                  <p className="text-sm text-muted-foreground">{category.subtitle}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.bundles.map((bundle, index) => (
                  <BundleCard key={bundle.id} bundle={bundle} index={index} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link
            to="/collections?filter=bundles"
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            {isRTL ? 'عرض جميع المجموعات' : 'View All Collections'}
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default SeasonalSection;

import React from 'react';
import { Link } from 'react-router-dom';
import { Flower2, Gift, Cake, Sparkles, Package, Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const cats = [
  { icon: Flower2, ar: 'ورد', en: 'Flowers', slug: 'flowers', color: 'text-pink-500', bg: 'bg-pink-50' },
  { icon: Cake, ar: 'كيك', en: 'Cakes', slug: 'cakes', color: 'text-amber-500', bg: 'bg-amber-50' },
  { icon: Gift, ar: 'هدايا', en: 'Gifts', slug: 'gifts', color: 'text-purple-500', bg: 'bg-purple-50' },
  { icon: Sparkles, ar: 'عطور', en: 'Perfumes', slug: 'perfumes', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: Package, ar: 'شوكولاتة', en: 'Chocolates', slug: 'chocolates', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  { icon: Heart, ar: 'باقات', en: 'Bundles', slug: 'bundles', color: 'text-red-500', bg: 'bg-red-50' },
];

const QuickCategoriesSection: React.FC = () => {
  const { language } = useLanguage();

  return (
    <section className="py-5 sm:py-6 border-b border-border/30">
      <div className="container-luxury">
        <div className="flex justify-between items-center overflow-x-auto scrollbar-hide gap-2 sm:gap-4">
          {cats.map((c) => (
            <Link key={c.slug} to={`/collections/${c.slug}`} className="group flex flex-col items-center gap-1.5 min-w-[60px] sm:min-w-[76px] flex-shrink-0">
              <div className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full ${c.bg} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                <c.icon className={`w-5 h-5 ${c.color}`} strokeWidth={1.5} />
              </div>
              <span className="text-[10px] sm:text-xs text-foreground/60 group-hover:text-foreground transition-colors text-center">{language === 'ar' ? c.ar : c.en}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QuickCategoriesSection;

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAllProducts } from '@/hooks/useStorefrontData';
import ProductCard from './ProductCard';

const NewArrivalsSection: React.FC = () => {
  const { t } = useLanguage();
  const { data: products = [], isLoading } = useAllProducts();
  const newProducts = products.filter(p => p.isNew).slice(0, 8);

  if (isLoading || newProducts.length === 0) return null;

  return (
    <section className="section-padding">
      <div className="container-luxury">
        <div className="mb-6 sm:mb-8">
          <span className="text-[10px] sm:text-xs tracking-luxury text-gold uppercase mb-2 block">{t('اكتشف الجديد', "WHAT'S NEW")}</span>
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-medium">{t('وصل حديثاً', 'New Arrivals')}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {newProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
    </section>
  );
};

export default NewArrivalsSection;

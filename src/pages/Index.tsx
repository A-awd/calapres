import { usePageMeta, PAGE_METAS } from '@/hooks/usePageMeta';
import React from 'react';
import StorefrontLayout from '@/components/storefront/StorefrontLayout';
import HeroSection from '@/components/storefront/HeroSection';
import QuickCategoriesSection from '@/components/storefront/QuickCategoriesSection';
import OccasionsSection from '@/components/storefront/OccasionsSection';
import BestsellersSection from '@/components/storefront/BestsellersSection';
import NewArrivalsSection from '@/components/storefront/NewArrivalsSection';
import BudgetSection from '@/components/storefront/BudgetSection';
import BundlesSection from '@/components/storefront/BundlesSection';
import BrandsSection from '@/components/storefront/BrandsSection';
import TestimonialsSection from '@/components/storefront/TestimonialsSection';

const Index: React.FC = () => {
  usePageMeta(PAGE_METAS.home);

  return (
    <StorefrontLayout>
      <HeroSection />
      <QuickCategoriesSection />
      <OccasionsSection />
      <BestsellersSection />
      <NewArrivalsSection />
      <BudgetSection />
      <BundlesSection />
      <BrandsSection />
      <TestimonialsSection />
    </StorefrontLayout>
  );
};

export default Index;

import React from 'react';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import WhatsAppButton from '@/components/storefront/WhatsAppButton';
import AnnouncementBar from '@/components/storefront/AnnouncementBar';
import CitySelector from '@/components/storefront/CitySelector';
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
  return (
    <div className="min-h-screen">
      <AnnouncementBar />
      <Header />
      <CitySelector />
      
      <main>
        {/* 1. Hero - seasonal offers */}
        <HeroSection />

        {/* 2. Quick Categories - icon strip (flowers, cakes, gifts, perfumes, chocolates) */}
        <QuickCategoriesSection />

        {/* 3. Occasions - horizontal strip (birthday, congrats, thank you, apology) */}
        <OccasionsSection />

        {/* 4. Bestsellers - most popular products */}
        <BestsellersSection />

        {/* 5. New Arrivals */}
        <NewArrivalsSection />

        {/* 6. Shop by Budget */}
        <BudgetSection />

        {/* 7. Bundles - ready gift packages */}
        <BundlesSection />

        {/* 8. Brands */}
        <BrandsSection />

        {/* 9. Testimonials */}
        <TestimonialsSection />
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;

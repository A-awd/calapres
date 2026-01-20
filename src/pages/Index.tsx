import React from 'react';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import WhatsAppButton from '@/components/storefront/WhatsAppButton';
import HeroSection from '@/components/storefront/HeroSection';
import QuickFiltersSection from '@/components/storefront/QuickFiltersSection';
import OccasionsSection from '@/components/storefront/OccasionsSection';
import GiftIdeasSection from '@/components/storefront/GiftIdeasSection';
import CategoriesSection from '@/components/storefront/CategoriesSection';
import GiftRecipientsSection from '@/components/storefront/GiftRecipientsSection';
import BrandsSection from '@/components/storefront/BrandsSection';
import InspirationSection from '@/components/storefront/InspirationSection';
import BudgetSection from '@/components/storefront/BudgetSection';
import BestsellersSection from '@/components/storefront/BestsellersSection';
import ExpressSection from '@/components/storefront/ExpressSection';
import BundlesSection from '@/components/storefront/BundlesSection';
import TestimonialsSection from '@/components/storefront/TestimonialsSection';
import FeaturedProductsSection from '@/components/storefront/FeaturedProductsSection';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main>
        <HeroSection />
        <QuickFiltersSection />
        <OccasionsSection />
        <GiftIdeasSection />
        <InspirationSection />
        <FeaturedProductsSection title="Flowers from the Heart" titleAr="زهور تنطق بما في القلب" filter="new" />
        <BrandsSection />
        <GiftRecipientsSection />
        <BestsellersSection />
        <FeaturedProductsSection title="The Scent of Love" titleAr="رائحة الحب" categorySlug="perfumes" />
        <ExpressSection />
        <CategoriesSection />
        <BudgetSection />
        <BundlesSection />
        <TestimonialsSection />
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;

import React from 'react';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import WhatsAppButton from '@/components/storefront/WhatsAppButton';
import HeroSection from '@/components/storefront/HeroSection';
import OccasionsSection from '@/components/storefront/OccasionsSection';
import CategoriesSection from '@/components/storefront/CategoriesSection';
import BestsellersSection from '@/components/storefront/BestsellersSection';
import ExpressSection from '@/components/storefront/ExpressSection';
import BundlesSection from '@/components/storefront/BundlesSection';
import SeasonalSection from '@/components/storefront/SeasonalSection';
import TestimonialsSection from '@/components/storefront/TestimonialsSection';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main>
        <HeroSection />
        <OccasionsSection />
        <CategoriesSection />
        <BestsellersSection />
        <ExpressSection />
        <SeasonalSection />
        <BundlesSection />
        <TestimonialsSection />
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;

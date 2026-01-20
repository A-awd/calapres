import React from 'react';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import WhatsAppButton from '@/components/storefront/WhatsAppButton';
import AnnouncementBar from '@/components/storefront/AnnouncementBar';
import HeroSection from '@/components/storefront/HeroSection';
import OccasionsSection from '@/components/storefront/OccasionsSection';
import GiftIdeasSection from '@/components/storefront/GiftIdeasSection';
import InspirationSection from '@/components/storefront/InspirationSection';
import BrandsSection from '@/components/storefront/BrandsSection';
import BudgetSection from '@/components/storefront/BudgetSection';
import BestsellersSection from '@/components/storefront/BestsellersSection';
import ExpressSection from '@/components/storefront/ExpressSection';
import BundlesSection from '@/components/storefront/BundlesSection';
import TestimonialsSection from '@/components/storefront/TestimonialsSection';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen">
      <AnnouncementBar />
      <Header />
      
      <main>
        <HeroSection />
        <OccasionsSection />
        <GiftIdeasSection />
        <InspirationSection />
        <BestsellersSection />
        <BrandsSection />
        <BudgetSection />
        <ExpressSection />
        <BundlesSection />
        <TestimonialsSection />
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;

import React, { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from './Header';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import AnnouncementBar from './AnnouncementBar';

interface StorefrontLayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}

const StorefrontLayout: React.FC<StorefrontLayoutProps> = ({ children, hideFooter = false }) => {
  const { direction } = useLanguage();

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <AnnouncementBar />
      <Header />
      <main>{children}</main>
      {!hideFooter && <Footer />}
      <WhatsAppButton />
    </div>
  );
};

export default StorefrontLayout;

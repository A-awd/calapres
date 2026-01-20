import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram, Facebook, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import logo from '@/assets/logo.png';

const Footer: React.FC = () => {
  const { t, language } = useLanguage();

  const quickLinks = [
    { label: t('الرئيسية', 'Home'), href: '/' },
    { label: t('المناسبات', 'Occasions'), href: '/occasions' },
    { label: t('التصنيفات', 'Categories'), href: '/categories' },
    { label: t('الباقات', 'Bundles'), href: '/bundles' },
    { label: t('صمم هديتك', 'Build Your Gift'), href: '/bundle-builder' },
  ];

  const supportLinks = [
    { label: t('تتبع الطلب', 'Track Order'), href: '/track-order' },
    { label: t('الأسئلة الشائعة', 'FAQ'), href: '/faq' },
    { label: t('اتصل بنا', 'Contact Us'), href: '/contact' },
    { label: t('سياسة الإرجاع', 'Return Policy'), href: '/returns' },
    { label: t('الشروط والأحكام', 'Terms & Conditions'), href: '/terms' },
  ];

  const aboutLinks = [
    { label: t('من نحن', 'About Us'), href: '/about' },
    { label: t('وظائف', 'Careers'), href: '/careers' },
    { label: t('المدونة', 'Blog'), href: '/blog' },
    { label: t('سياسة الخصوصية', 'Privacy Policy'), href: '/privacy' },
  ];

  return (
    <footer className="bg-gradient-to-b from-[#F8F5F0] to-[#F0EBE3] text-charcoal">
      {/* App Download Section */}
      <div className="bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 py-10 sm:py-12">
        <div className="container-luxury">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-start">
              <h3 className="font-display text-2xl sm:text-3xl text-charcoal font-medium mb-2">
                {t('حمّل تطبيق كالابريز', 'Download Calapres App')}
              </h3>
              <p className="text-charcoal/60 text-sm sm:text-base">
                {t(
                  'تسوق بسهولة أكبر واستمتع بعروض حصرية',
                  'Shop easier and enjoy exclusive offers'
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* App Store */}
              <a 
                href="#" 
                className="flex items-center gap-3 bg-charcoal text-white px-5 py-3 rounded-xl hover:bg-charcoal/90 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                </svg>
                <div className={`text-${language === 'ar' ? 'right' : 'left'}`}>
                  <span className="text-[10px] text-white/70 block">{t('حمّل من', 'Download on')}</span>
                  <span className="text-sm font-medium">App Store</span>
                </div>
              </a>
              {/* Google Play */}
              <a 
                href="#" 
                className="flex items-center gap-3 bg-charcoal text-white px-5 py-3 rounded-xl hover:bg-charcoal/90 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                </svg>
                <div className={`text-${language === 'ar' ? 'right' : 'left'}`}>
                  <span className="text-[10px] text-white/70 block">{t('متوفر على', 'Get it on')}</span>
                  <span className="text-sm font-medium">Google Play</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="bg-gold/10 py-8 sm:py-10">
        <div className="container-luxury">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-start">
              <h3 className="font-display text-xl sm:text-2xl font-medium text-charcoal mb-1">
                {t('انضم إلى قائمتنا البريدية', 'Subscribe to our Newsletter')}
              </h3>
              <p className="text-charcoal/50 text-xs sm:text-sm">
                {t(
                  'احصل على آخر العروض والمجموعات الجديدة',
                  'Get the latest offers and new collections'
                )}
              </p>
            </div>
            <form className="flex w-full lg:w-auto gap-2">
              <input
                type="email"
                placeholder={t('بريدك الإلكتروني', 'Your email address')}
                className="flex-1 lg:w-80 bg-white border border-charcoal/10 px-4 py-3 text-sm placeholder:text-charcoal/40 focus:outline-none focus:border-gold transition-colors rounded-lg"
              />
              <button
                type="submit"
                className="bg-gold text-charcoal px-6 py-3 text-sm font-medium hover:bg-gold/90 transition-colors rounded-lg whitespace-nowrap"
              >
                {t('اشترك الآن', 'Subscribe')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container-luxury py-12 sm:py-14">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1 space-y-5">
            <Link to="/" className="flex flex-col items-start gap-2">
              <img src={logo} alt="Calapres" className="h-12 w-auto" />
              <span className="font-display text-lg tracking-wider text-charcoal">CALAPRES</span>
            </Link>
            <p className="text-charcoal/50 text-sm leading-relaxed">
              {t(
                'نحن نقدم أفضل الهدايا الفاخرة للمناسبات الخاصة.',
                'We deliver premium gifts for special occasions.'
              )}
            </p>
            {/* Social Media */}
            <div className="flex gap-2">
              <a 
                href="#" 
                className="w-10 h-10 bg-charcoal/5 rounded-full flex items-center justify-center hover:bg-gold hover:text-charcoal text-charcoal/60 transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-charcoal/5 rounded-full flex items-center justify-center hover:bg-gold hover:text-charcoal text-charcoal/60 transition-all"
                aria-label="Twitter"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-charcoal/5 rounded-full flex items-center justify-center hover:bg-gold hover:text-charcoal text-charcoal/60 transition-all"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-charcoal/5 rounded-full flex items-center justify-center hover:bg-gold hover:text-charcoal text-charcoal/60 transition-all"
                aria-label="TikTok"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-medium tracking-wider uppercase mb-5 text-gold">
              {t('روابط سريعة', 'Quick Links')}
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-charcoal/60 hover:text-charcoal transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-medium tracking-wider uppercase mb-5 text-gold">
              {t('الدعم', 'Support')}
            </h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-charcoal/60 hover:text-charcoal transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-sm font-medium tracking-wider uppercase mb-5 text-gold">
              {t('عن كالابريز', 'About Us')}
            </h4>
            <ul className="space-y-3">
              {aboutLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-charcoal/60 hover:text-charcoal transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-medium tracking-wider uppercase mb-5 text-gold">
              {t('تواصل معنا', 'Contact Us')}
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="tel:+966501234567" className="flex items-center gap-3 text-charcoal/60 hover:text-charcoal transition-colors text-sm">
                  <div className="w-8 h-8 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-3.5 h-3.5 text-gold" />
                  </div>
                  <span dir="ltr">+966 50 123 4567</span>
                </a>
              </li>
              <li>
                <a href="https://wa.me/966501234567" className="flex items-center gap-3 text-charcoal/60 hover:text-charcoal transition-colors text-sm">
                  <div className="w-8 h-8 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-3.5 h-3.5 text-gold" />
                  </div>
                  <span>{t('واتساب', 'WhatsApp')}</span>
                </a>
              </li>
              <li>
                <a href="mailto:info@calapres.com" className="flex items-center gap-3 text-charcoal/60 hover:text-charcoal transition-colors text-sm">
                  <div className="w-8 h-8 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3.5 h-3.5 text-gold" />
                  </div>
                  <span>info@calapres.com</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-charcoal/60 text-sm">
                <div className="w-8 h-8 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-gold" />
                </div>
                <span className="pt-1.5">
                  {t('الرياض، المملكة العربية السعودية', 'Riyadh, Saudi Arabia')}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-charcoal/10">
        <div className="container-luxury py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Payment Methods */}
          <div className="flex items-center gap-3">
            <span className="text-charcoal/40 text-xs">{t('طرق الدفع', 'Payments')}:</span>
            <div className="flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MasterCard_Logo.svg/200px-MasterCard_Logo.svg.png" alt="Mastercard" className="h-5 opacity-70" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png" alt="Visa" className="h-4 opacity-70" />
              <span className="text-charcoal text-[10px] font-medium bg-charcoal/10 px-2 py-0.5 rounded">mada</span>
              <span className="text-charcoal text-[10px] font-medium bg-charcoal/10 px-2 py-0.5 rounded">Tabby</span>
            </div>
          </div>

          {/* Copyright */}
          <p className="text-charcoal/40 text-xs tracking-wider text-center">
            © {new Date().getFullYear()} CALAPRES. {t('جميع الحقوق محفوظة', 'All Rights Reserved')}.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

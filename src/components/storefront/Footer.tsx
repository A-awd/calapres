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
              <img src={logo} alt="Calapres" className="h-12 w-auto" width="45" height="48" />
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
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MasterCard_Logo.svg/200px-MasterCard_Logo.svg.png" alt="Mastercard" className="h-5 opacity-70" width="33" height="20" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png" alt="Visa" className="h-4 opacity-70" width="49" height="16" />
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

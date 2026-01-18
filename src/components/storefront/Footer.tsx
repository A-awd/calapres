import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram } from 'lucide-react';
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

  return (
    <footer className="bg-charcoal text-white">
      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="container-luxury py-16">
          <div className="max-w-xl mx-auto text-center">
            <h3 className="font-display text-2xl md:text-3xl font-medium mb-4">
              {t('انضم إلى قائمتنا البريدية', 'Join Our Newsletter')}
            </h3>
            <p className="text-white/60 mb-8 text-sm">
              {t(
                'احصل على آخر العروض والمجموعات الجديدة',
                'Get the latest offers and new collections'
              )}
            </p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder={t('بريدك الإلكتروني', 'Your email address')}
                className="flex-1 bg-white/10 border border-white/20 px-5 py-3.5 text-sm placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-colors"
              />
              <button
                type="submit"
                className="bg-white text-charcoal px-8 py-3.5 text-sm tracking-wider uppercase hover:bg-white/90 transition-colors"
              >
                {t('اشترك', 'Subscribe')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="container-luxury py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="flex flex-col items-start gap-2">
              <img src={logo} alt="Calapres" className="h-16 w-auto brightness-0 invert" />
              <span className="font-display text-xl tracking-wider">CALAPRES</span>
            </Link>
            <p className="text-white/50 text-sm leading-relaxed">
              {t(
                'نحن نقدم أفضل الهدايا الفاخرة للمناسبات الخاصة. جودة عالية وتوصيل سريع.',
                'We deliver premium gifts for special occasions. High quality and fast delivery.'
              )}
            </p>
            <div className="flex gap-3">
              <a 
                href="#" 
                className="w-10 h-10 border border-white/20 flex items-center justify-center hover:bg-white hover:text-charcoal transition-all"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 border border-white/20 flex items-center justify-center hover:bg-white hover:text-charcoal transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a 
                href="#" 
                className="w-10 h-10 border border-white/20 flex items-center justify-center hover:bg-white hover:text-charcoal transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm tracking-wider uppercase mb-6">
              {t('روابط سريعة', 'Quick Links')}
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm tracking-wider uppercase mb-6">
              {t('الدعم', 'Support')}
            </h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm tracking-wider uppercase mb-6">
              {t('تواصل معنا', 'Contact Us')}
            </h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-white/50 text-sm">
                <Phone className="w-4 h-4 text-gold" />
                <span dir="ltr">+966 50 123 4567</span>
              </li>
              <li className="flex items-center gap-3 text-white/50 text-sm">
                <Mail className="w-4 h-4 text-gold" />
                <span>info@calapres.com</span>
              </li>
              <li className="flex items-start gap-3 text-white/50 text-sm">
                <MapPin className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                <span>
                  {t('الرياض، المملكة العربية السعودية', 'Riyadh, Saudi Arabia')}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-luxury py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-xs tracking-wider">
            © 2024 CALAPRES. {t('جميع الحقوق محفوظة', 'ALL RIGHTS RESERVED')}.
          </p>
          <div className="flex items-center gap-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MasterCard_Logo.svg/200px-MasterCard_Logo.svg.png" alt="Mastercard" className="h-6 opacity-40 hover:opacity-70 transition-opacity" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png" alt="Visa" className="h-6 opacity-40 hover:opacity-70 transition-opacity" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/160px-Apple_logo_black.svg.png" alt="Apple Pay" className="h-6 opacity-40 hover:opacity-70 transition-opacity invert" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

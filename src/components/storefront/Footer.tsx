import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram, Twitter, Facebook } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import logo from '@/assets/logo.png';

const Footer: React.FC = () => {
  const { t } = useLanguage();

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
    <footer className="bg-chocolate text-cream">
      {/* Main footer */}
      <div className="container-luxury section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Calapres" className="h-16 w-auto brightness-150" />
              <span className="font-display text-2xl font-bold">Calapres</span>
            </Link>
            <p className="text-cream/70 leading-relaxed">
              {t(
                'نحن نقدم أفضل الهدايا الفاخرة للمناسبات الخاصة. جودة عالية وتوصيل سريع.',
                'We deliver premium gifts for special occasions. High quality and fast delivery.'
              )}
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-cream/10 rounded-full flex items-center justify-center hover:bg-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-cream/10 rounded-full flex items-center justify-center hover:bg-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-cream/10 rounded-full flex items-center justify-center hover:bg-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-6">
              {t('روابط سريعة', 'Quick Links')}
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-cream/70 hover:text-cream transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-6">
              {t('الدعم', 'Support')}
            </h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-cream/70 hover:text-cream transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-6">
              {t('تواصل معنا', 'Contact Us')}
            </h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-cream/70">
                <Phone className="w-5 h-5 text-gold" />
                <span dir="ltr">+966 50 123 4567</span>
              </li>
              <li className="flex items-center gap-3 text-cream/70">
                <Mail className="w-5 h-5 text-gold" />
                <span>info@calapres.com</span>
              </li>
              <li className="flex items-start gap-3 text-cream/70">
                <MapPin className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                <span>
                  {t('الرياض، المملكة العربية السعودية', 'Riyadh, Saudi Arabia')}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-cream/10">
        <div className="container-luxury py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-cream/50 text-sm">
            © 2024 Calapres. {t('جميع الحقوق محفوظة', 'All rights reserved')}.
          </p>
          <div className="flex items-center gap-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MasterCard_Logo.svg/200px-MasterCard_Logo.svg.png" alt="Mastercard" className="h-8 opacity-50 hover:opacity-100 transition-opacity" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png" alt="Visa" className="h-8 opacity-50 hover:opacity-100 transition-opacity" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/160px-Apple_logo_black.svg.png" alt="Apple Pay" className="h-8 opacity-50 hover:opacity-100 transition-opacity invert" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

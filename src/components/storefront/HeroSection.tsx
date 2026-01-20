import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const heroSlides = [
  {
    image: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=1920&q=90',
    titleEn: 'Luxury Flowers',
    titleAr: 'زهور فاخرة',
    subtitleEn: 'FRESH & ELEGANT',
    subtitleAr: 'طازجة وأنيقة',
    descEn: 'Hand-picked premium blooms for every occasion',
    descAr: 'زهور مميزة منتقاة بعناية لكل مناسبة',
  },
  {
    image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=1920&q=90',
    titleEn: 'Fine Chocolates',
    titleAr: 'شوكولاتة فاخرة',
    subtitleEn: 'HANDCRAFTED DELIGHTS',
    subtitleAr: 'حلويات مصنوعة يدوياً',
    descEn: 'Belgian chocolate collections for moments of indulgence',
    descAr: 'مجموعات شوكولاتة بلجيكية للحظات الاستمتاع',
  },
  {
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1920&q=90',
    titleEn: 'Exclusive Perfumes',
    titleAr: 'عطور حصرية',
    subtitleEn: 'SIGNATURE SCENTS',
    subtitleAr: 'روائح مميزة',
    descEn: 'Luxury fragrances from renowned houses',
    descAr: 'عطور فاخرة من أشهر دور العطور',
  },
];

const HeroSection: React.FC = () => {
  const { t, direction } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  return (
    <section className="relative h-[70vh] sm:h-[75vh] md:h-[85vh] lg:h-[90vh] overflow-hidden">
      {/* Background Slides */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <img
            src={heroSlides[currentSlide].image}
            alt="Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent rtl:bg-gradient-to-l" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="container-luxury relative z-10 h-full flex items-center pb-16 sm:pb-0">
        <div className="max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block text-[10px] sm:text-xs tracking-luxury text-gold uppercase mb-4 sm:mb-6">
                {t(heroSlides[currentSlide].subtitleAr, heroSlides[currentSlide].subtitleEn)}
              </span>

              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-medium text-white leading-[1.15] mb-4 sm:mb-6">
                {t(heroSlides[currentSlide].titleAr, heroSlides[currentSlide].titleEn)}
              </h1>

              <p className="text-white/80 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 leading-relaxed max-w-md">
                {t(heroSlides[currentSlide].descAr, heroSlides[currentSlide].descEn)}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  to="/collections"
                  className="inline-flex items-center justify-center gap-2 sm:gap-3 bg-white text-charcoal px-6 sm:px-8 py-3 sm:py-4 text-xs sm:text-sm tracking-wider uppercase hover:bg-gold hover:text-white transition-colors"
                >
                  {t('تسوق الآن', 'Shop Now')}
                  <Arrow className="w-3 h-3 sm:w-4 sm:h-4" />
                </Link>
                <Link
                  to="/bundle-builder"
                  className="inline-flex items-center justify-center gap-2 sm:gap-3 bg-transparent border border-white text-white px-6 sm:px-8 py-3 sm:py-4 text-xs sm:text-sm tracking-wider uppercase hover:bg-white hover:text-charcoal transition-all"
                >
                  {t('صمم هديتك', 'Build Your Gift')}
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Slide Controls */}
      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-4">
        <button
          onClick={prevSlide}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/50 flex items-center justify-center text-white hover:bg-white hover:text-charcoal transition-all"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <div className="flex gap-1.5 sm:gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all ${
                index === currentSlide ? 'bg-gold w-6 sm:w-8' : 'bg-white/50 hover:bg-white'
              }`}
            />
          ))}
        </div>
        <button
          onClick={nextSlide}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/50 flex items-center justify-center text-white hover:bg-white hover:text-charcoal transition-all"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Quick Features */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent py-6 hidden md:block">
        <div className="container-luxury">
          <div className="flex justify-center gap-16 text-white">
            <div className="text-center">
              <span className="block text-2xl font-display mb-1">{t('٢', '2')}</span>
              <span className="text-xs tracking-wider uppercase opacity-80">{t('ساعات توصيل', 'Hour Delivery')}</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-display mb-1">{t('تغليف', 'Gift')}</span>
              <span className="text-xs tracking-wider uppercase opacity-80">{t('فاخر مجاني', 'Wrap Free')}</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-display mb-1">{t('+٥٠٠', '+500')}</span>
              <span className="text-xs tracking-wider uppercase opacity-80">{t('منتج مميز', 'Unique Gifts')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

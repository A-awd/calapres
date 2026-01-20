import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { testimonials } from '@/data/mockData';

const TestimonialsSection: React.FC = () => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  // On mobile, load immediately without scroll-triggered animations
  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  return (
    <section className="section-padding bg-cream/50 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 start-0 w-64 h-64 bg-gold/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 end-0 w-64 h-64 bg-gold/20 rounded-full blur-3xl" />

      <div className="container-luxury relative z-10">
        {/* Section header */}
        <div className="text-center mb-12">
          <motion.h2
            initial={initialState}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            className="font-display text-3xl md:text-4xl font-bold mb-4 text-charcoal"
          >
            {t('ماذا يقول عملاؤنا', 'What Our Customers Say')}
          </motion.h2>
          <div className="w-20 h-0.5 mx-auto bg-gold" />
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={initialState}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
              transition={{ delay: isMobile ? 0 : index * 0.1 }}
              className="bg-background border border-gold/20 rounded-2xl p-6 shadow-sm hover:shadow-elegant transition-shadow duration-300"
            >
              <Quote className="w-10 h-10 text-gold/40 mb-4" />
              
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-gold fill-gold" />
                ))}
              </div>

              <p className="text-charcoal/80 mb-6 leading-relaxed">
                "{t(testimonial.textAr, testimonial.text)}"
              </p>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gold/20 rounded-full flex items-center justify-center">
                  <span className="text-gold font-bold text-lg">
                    {t(testimonial.nameAr, testimonial.name).charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-charcoal">{t(testimonial.nameAr, testimonial.name)}</p>
                  <p className="text-sm text-charcoal/60">
                    {t('عميل موثق', 'Verified Customer')}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

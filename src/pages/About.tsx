import StorefrontLayout from '@/components/storefront/StorefrontLayout';
import { motion } from "framer-motion";
import { Heart, Gift, Star, Users, Award, Sparkles } from "lucide-react";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import WhatsAppButton from "@/components/storefront/WhatsAppButton";

const About = () => {
  const values = [
    {
      icon: Heart,
      title: "شغف بالتميز",
      titleEn: "Passion for Excellence",
      description: "نختار كل منتج بعناية فائقة لنضمن أعلى معايير الجودة والأناقة"
    },
    {
      icon: Gift,
      title: "فن الإهداء",
      titleEn: "Art of Gifting",
      description: "نؤمن أن الهدية ليست مجرد شيء، بل رسالة حب وتقدير"
    },
    {
      icon: Star,
      title: "تجربة فريدة",
      titleEn: "Unique Experience",
      description: "نسعى لجعل كل لحظة إهداء تجربة لا تُنسى"
    },
    {
      icon: Users,
      title: "عملاؤنا أولاً",
      titleEn: "Customers First",
      description: "رضا عملائنا هو مقياس نجاحنا الحقيقي"
    }
  ];

  const milestones = [
    { year: "2020", event: "تأسيس كالابريز" },
    { year: "2021", event: "توسيع خدمات التوصيل السريع" },
    { year: "2022", event: "إطلاق تجربة تصميم الهدايا المخصصة" },
    { year: "2023", event: "الوصول لأكثر من 10,000 عميل سعيد" },
    { year: "2024", event: "افتتاح فروع جديدة وتوسيع نطاق الخدمة" }
  ];

  return (
    <StorefrontLayout>
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/10 to-transparent" />
        <div className="container-luxury relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-gold/20 px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-charcoal">CALAPRES | كالابريز</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display text-charcoal mb-6 leading-tight">
              نصنع لحظات <span className="text-gold">لا تُنسى</span>
            </h1>
            <p className="text-lg md:text-xl text-charcoal/70 leading-relaxed">
              كالابريز ليست مجرد متجر هدايا، بل وجهة لكل من يبحث عن التميز والأناقة في فن الإهداء
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-cream/50">
        <div className="container-luxury">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <span className="text-gold text-sm font-medium tracking-widest uppercase mb-4 block">قصتنا</span>
              <h2 className="text-3xl md:text-4xl font-display text-charcoal mb-6">
                رحلة بدأت بشغف
              </h2>
              <div className="space-y-4 text-charcoal/70 leading-relaxed">
                <p>
                  انطلقت كالابريز من فكرة بسيطة: أن الهدية المثالية يمكن أن تغير يوم شخص ما بالكامل. 
                  بدأنا رحلتنا بشغف كبير لتقديم تجربة إهداء استثنائية تجمع بين الجودة العالية والذوق الرفيع.
                </p>
                <p>
                  اليوم، نفتخر بأننا أصبحنا الوجهة المفضلة لآلاف العملاء الذين يبحثون عن هدايا مميزة 
                  لأحبائهم. من الزهور الطازجة إلى الشوكولاتة الفاخرة، ومن العطور الراقية إلى الهدايا المخصصة، 
                  نسعى دائماً لتقديم الأفضل.
                </p>
                <p>
                  نؤمن أن كل هدية تحمل قصة، ومهمتنا هي مساعدتك في رواية قصتك بأجمل طريقة ممكنة.
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-elegant">
                <img 
                  src="https://images.unsplash.com/photo-1549488344-cbb6c34cf08b?w=800&q=80&fm=webp&auto=format" 
                  alt="Luxury Gift Box"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width="800"
                  height="1000"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-gold text-charcoal p-6 rounded-xl shadow-lg">
                <div className="text-3xl font-display font-bold">+10K</div>
                <div className="text-sm">عميل سعيد</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-20">
        <div className="container-luxury">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-charcoal to-charcoal/90 text-cream p-8 md:p-12 rounded-2xl"
            >
              <Award className="w-12 h-12 text-gold mb-6" />
              <h3 className="text-2xl md:text-3xl font-display mb-4">رؤيتنا</h3>
              <p className="text-cream/80 leading-relaxed">
                أن نكون الخيار الأول والأفضل في عالم الهدايا الفاخرة في المنطقة، 
                ونعيد تعريف تجربة الإهداء بأسلوب يجمع بين الأصالة والحداثة.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-gradient-to-br from-gold to-gold-light text-charcoal p-8 md:p-12 rounded-2xl"
            >
              <Heart className="w-12 h-12 text-charcoal mb-6" />
              <h3 className="text-2xl md:text-3xl font-display mb-4">رسالتنا</h3>
              <p className="text-charcoal/80 leading-relaxed">
                نسعى لتحويل كل مناسبة إلى ذكرى جميلة من خلال تقديم هدايا استثنائية 
                تعكس مشاعر الحب والتقدير، مع ضمان تجربة تسوق سلسة وممتعة.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-cream/50">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-gold text-sm font-medium tracking-widest uppercase mb-4 block">قيمنا</span>
            <h2 className="text-3xl md:text-4xl font-display text-charcoal">
              ما يميزنا
            </h2>
          </motion.div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-background p-6 rounded-xl shadow-sm hover:shadow-elegant transition-shadow duration-300 text-center group"
              >
                <div className="w-14 h-14 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-gold/20 transition-colors">
                  <value.icon className="w-7 h-7 text-gold" />
                </div>
                <h4 className="text-lg font-display text-charcoal mb-2">{value.title}</h4>
                <p className="text-sm text-charcoal/60">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-gold text-sm font-medium tracking-widest uppercase mb-4 block">مسيرتنا</span>
            <h2 className="text-3xl md:text-4xl font-display text-charcoal">
              محطات في رحلتنا
            </h2>
          </motion.div>
          
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute right-6 md:right-1/2 top-0 bottom-0 w-px bg-gold/30 transform md:translate-x-1/2" />
              
              {milestones.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? 30 : -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`relative flex items-center gap-6 mb-8 ${
                    index % 2 === 0 ? 'md:flex-row-reverse md:text-left' : 'md:text-right'
                  }`}
                >
                  <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center shrink-0 z-10 shadow-lg">
                    <span className="text-charcoal font-bold text-sm">{milestone.year}</span>
                  </div>
                  <div className="flex-1 bg-cream/50 p-4 rounded-xl">
                    <p className="text-charcoal font-medium">{milestone.event}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-charcoal to-charcoal/95">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-display text-cream mb-6">
              مستعد لتجربة التميز؟
            </h2>
            <p className="text-cream/70 mb-8">
              اكتشف مجموعتنا الفاخرة من الهدايا وابدأ رحلتك معنا اليوم
            </p>
            <a 
              href="/collections"
              className="inline-flex items-center gap-2 bg-gold text-charcoal px-8 py-4 rounded-full font-medium hover:bg-gold-light transition-colors"
            >
              <Gift className="w-5 h-5" />
              تصفح المجموعات
            </a>
          </motion.div>
        </div>
      </section>
    </StorefrontLayout>
  );
};

export default About;

import StorefrontLayout from '@/components/storefront/StorefrontLayout';
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import WhatsAppButton from '@/components/storefront/WhatsAppButton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Truck, CreditCard, RotateCcw, Gift, Clock, HelpCircle } from 'lucide-react';

const FAQ: React.FC = () => {
  const { t, language } = useLanguage();

  const faqCategories = [
    {
      id: 'delivery',
      icon: Truck,
      title: t('التوصيل والشحن', 'Delivery & Shipping'),
      questions: [
        {
          q: t('ما هي مناطق التوصيل المتاحة؟', 'What areas do you deliver to?'),
          a: t(
            'نوفر خدمة التوصيل لجميع مناطق المملكة العربية السعودية، بما في ذلك الرياض، جدة، الدمام، مكة، المدينة، وجميع المدن الرئيسية الأخرى.',
            'We deliver to all regions of Saudi Arabia, including Riyadh, Jeddah, Dammam, Makkah, Madinah, and all other major cities.'
          ),
        },
        {
          q: t('كم تستغرق عملية التوصيل؟', 'How long does delivery take?'),
          a: t(
            'التوصيل العادي يستغرق 2-4 ساعات داخل المدينة. التوصيل السريع (Express) متاح خلال ساعة واحدة. للمدن الأخرى، يتم التوصيل خلال 24-48 ساعة.',
            'Standard delivery takes 2-4 hours within the city. Express delivery is available within 1 hour. For other cities, delivery is within 24-48 hours.'
          ),
        },
        {
          q: t('هل يمكنني جدولة التوصيل لوقت محدد؟', 'Can I schedule delivery for a specific time?'),
          a: t(
            'نعم، يمكنك اختيار تاريخ ووقت التوصيل المفضل لديك عند إتمام الطلب. نوفر فترات توصيل مرنة تناسب جدولك.',
            'Yes, you can choose your preferred delivery date and time during checkout. We offer flexible delivery slots to fit your schedule.'
          ),
        },
        {
          q: t('ما هي رسوم التوصيل؟', 'What are the delivery fees?'),
          a: t(
            'رسوم التوصيل العادي 25 ريال، والتوصيل السريع 50 ريال. التوصيل مجاني للطلبات التي تتجاوز 500 ريال.',
            'Standard delivery is 25 SAR, Express delivery is 50 SAR. Free delivery for orders above 500 SAR.'
          ),
        },
        {
          q: t('هل يمكنني تتبع طلبي؟', 'Can I track my order?'),
          a: t(
            'نعم، ستتلقى رابط تتبع عبر الرسائل النصية والبريد الإلكتروني فور شحن طلبك. يمكنك أيضًا تتبع طلبك من خلال صفحة "تتبع الطلب" على موقعنا.',
            'Yes, you will receive a tracking link via SMS and email once your order is shipped. You can also track your order through the "Track Order" page on our website.'
          ),
        },
      ],
    },
    {
      id: 'payment',
      icon: CreditCard,
      title: t('الدفع والفواتير', 'Payment & Billing'),
      questions: [
        {
          q: t('ما هي طرق الدفع المتاحة؟', 'What payment methods are available?'),
          a: t(
            'نقبل جميع البطاقات الائتمانية (Visa, Mastercard)، مدى، Apple Pay، STC Pay، وخدمة تابي للدفع بالتقسيط. كما نوفر خيار الدفع عند الاستلام.',
            'We accept all credit cards (Visa, Mastercard), Mada, Apple Pay, STC Pay, and Tabby for installment payments. Cash on delivery is also available.'
          ),
        },
        {
          q: t('هل الدفع آمن على موقعكم؟', 'Is payment secure on your website?'),
          a: t(
            'نعم، جميع المعاملات مشفرة ومحمية بأعلى معايير الأمان (SSL). نحن نستخدم بوابات دفع معتمدة ولا نحتفظ ببيانات بطاقتك.',
            'Yes, all transactions are encrypted and protected with the highest security standards (SSL). We use certified payment gateways and do not store your card information.'
          ),
        },
        {
          q: t('هل يمكنني الحصول على فاتورة ضريبية؟', 'Can I get a tax invoice?'),
          a: t(
            'نعم، يتم إرسال فاتورة ضريبية إلكترونية إلى بريدك الإلكتروني بعد إتمام الطلب. يمكنك أيضًا تحميلها من حسابك.',
            'Yes, an electronic tax invoice is sent to your email after order completion. You can also download it from your account.'
          ),
        },
        {
          q: t('ما هي خدمة تابي للدفع بالتقسيط؟', 'What is Tabby installment payment?'),
          a: t(
            'تابي تتيح لك تقسيم مبلغ طلبك على 4 دفعات بدون فوائد أو رسوم إضافية. الدفعة الأولى عند الشراء والباقي على 3 أشهر.',
            'Tabby allows you to split your order amount into 4 payments with no interest or additional fees. First payment at purchase and the rest over 3 months.'
          ),
        },
      ],
    },
    {
      id: 'returns',
      icon: RotateCcw,
      title: t('الإرجاع والاستبدال', 'Returns & Exchange'),
      questions: [
        {
          q: t('ما هي سياسة الإرجاع لديكم؟', 'What is your return policy?'),
          a: t(
            'نظرًا لطبيعة منتجاتنا (الزهور والهدايا الطازجة)، لا يمكن إرجاع المنتجات بعد التوصيل. لكن إذا كان هناك أي مشكلة في جودة المنتج، نضمن استبداله أو استرداد المبلغ.',
            'Due to the nature of our products (fresh flowers and gifts), returns are not accepted after delivery. However, if there is any quality issue, we guarantee replacement or refund.'
          ),
        },
        {
          q: t('ماذا أفعل إذا وصل المنتج تالفًا؟', 'What if my product arrives damaged?'),
          a: t(
            'في حالة وصول المنتج تالفًا، يرجى التواصل معنا خلال ساعتين من الاستلام مع إرفاق صور واضحة. سنقوم باستبدال المنتج فورًا أو استرداد المبلغ.',
            'If your product arrives damaged, please contact us within 2 hours of receipt with clear photos. We will replace the product immediately or refund your payment.'
          ),
        },
        {
          q: t('هل يمكنني إلغاء طلبي؟', 'Can I cancel my order?'),
          a: t(
            'يمكنك إلغاء طلبك مجانًا قبل بدء تجهيزه. بعد بدء التجهيز، يتم خصم 25% من قيمة الطلب كرسوم إلغاء.',
            'You can cancel your order for free before it starts being prepared. After preparation begins, a 25% cancellation fee applies.'
          ),
        },
        {
          q: t('كيف أطلب استرداد المبلغ؟', 'How do I request a refund?'),
          a: t(
            'يمكنك طلب الاسترداد عبر التواصل مع خدمة العملاء أو من خلال حسابك. يتم معالجة الاسترداد خلال 5-7 أيام عمل.',
            'You can request a refund by contacting customer service or through your account. Refunds are processed within 5-7 business days.'
          ),
        },
      ],
    },
    {
      id: 'gifts',
      icon: Gift,
      title: t('الهدايا والتغليف', 'Gifts & Wrapping'),
      questions: [
        {
          q: t('هل يمكنني إضافة بطاقة تهنئة؟', 'Can I add a greeting card?'),
          a: t(
            'نعم، نوفر بطاقات تهنئة مجانية مع جميع الطلبات. يمكنك كتابة رسالتك الشخصية عند إتمام الطلب.',
            'Yes, we provide free greeting cards with all orders. You can write your personal message during checkout.'
          ),
        },
        {
          q: t('ما هي خيارات التغليف المتاحة؟', 'What wrapping options are available?'),
          a: t(
            'نوفر تغليف أنيق مجاني، وتغليف فاخر بـ 30 ريال، وصناديق هدايا فاخرة بأحجام مختلفة تبدأ من 50 ريال.',
            'We offer free elegant wrapping, premium wrapping for 30 SAR, and luxury gift boxes in various sizes starting from 50 SAR.'
          ),
        },
        {
          q: t('هل يمكن إخفاء الفاتورة من الهدية؟', 'Can I hide the invoice from the gift?'),
          a: t(
            'نعم، يمكنك اختيار "إخفاء الفاتورة" عند إتمام الطلب لضمان عدم ظهور السعر مع الهدية.',
            'Yes, you can select "Hide Invoice" during checkout to ensure the price is not shown with the gift.'
          ),
        },
        {
          q: t('هل يمكنني طلب هدية مفاجئة؟', 'Can I order a surprise gift?'),
          a: t(
            'بالتأكيد! نحن متخصصون في هدايا المفاجآت. يمكنك إدخال بيانات المستلم مباشرة وسنوصل الهدية دون علمه مسبقًا.',
            'Absolutely! We specialize in surprise gifts. You can enter the recipient details directly and we will deliver the gift without their prior knowledge.'
          ),
        },
      ],
    },
    {
      id: 'orders',
      icon: Clock,
      title: t('الطلبات والحساب', 'Orders & Account'),
      questions: [
        {
          q: t('كيف أنشئ حسابًا؟', 'How do I create an account?'),
          a: t(
            'يمكنك إنشاء حساب من خلال الضغط على "تسجيل الدخول" ثم "إنشاء حساب جديد". يمكنك أيضًا التسجيل باستخدام حساب جوجل.',
            'You can create an account by clicking "Login" then "Create New Account". You can also sign up using your Google account.'
          ),
        },
        {
          q: t('نسيت كلمة المرور، ماذا أفعل؟', 'I forgot my password, what should I do?'),
          a: t(
            'اضغط على "نسيت كلمة المرور" في صفحة تسجيل الدخول، وأدخل بريدك الإلكتروني. ستتلقى رابطًا لإعادة تعيين كلمة المرور.',
            'Click "Forgot Password" on the login page and enter your email. You will receive a link to reset your password.'
          ),
        },
        {
          q: t('كيف أعدل أو ألغي طلبي؟', 'How do I modify or cancel my order?'),
          a: t(
            'يمكنك تعديل أو إلغاء طلبك من خلال حسابك أو بالتواصل مع خدمة العملاء قبل بدء تجهيز الطلب.',
            'You can modify or cancel your order through your account or by contacting customer service before order preparation begins.'
          ),
        },
        {
          q: t('هل يمكنني الطلب كضيف بدون حساب؟', 'Can I order as a guest without an account?'),
          a: t(
            'نعم، يمكنك إتمام طلبك كضيف. لكن ننصح بإنشاء حساب للاستفادة من تتبع الطلبات وتذكيرات المناسبات والعروض الحصرية.',
            'Yes, you can complete your order as a guest. However, we recommend creating an account to benefit from order tracking, occasion reminders, and exclusive offers.'
          ),
        },
      ],
    },
    {
      id: 'other',
      icon: HelpCircle,
      title: t('أسئلة أخرى', 'Other Questions'),
      questions: [
        {
          q: t('هل لديكم تطبيق للهاتف؟', 'Do you have a mobile app?'),
          a: t(
            'نعم، تطبيقنا متاح على App Store و Google Play. حمّل التطبيق للحصول على تجربة تسوق أفضل وعروض حصرية.',
            'Yes, our app is available on App Store and Google Play. Download the app for a better shopping experience and exclusive offers.'
          ),
        },
        {
          q: t('كيف أتواصل مع خدمة العملاء؟', 'How do I contact customer service?'),
          a: t(
            'يمكنك التواصل معنا عبر الواتساب على الرقم +966 50 123 4567، أو البريد الإلكتروني info@calapres.com، أو من خلال الدردشة المباشرة على الموقع.',
            'You can reach us via WhatsApp at +966 50 123 4567, email at info@calapres.com, or through live chat on the website.'
          ),
        },
        {
          q: t('هل تقدمون خدمات للشركات؟', 'Do you offer corporate services?'),
          a: t(
            'نعم، نوفر خدمات خاصة للشركات تشمل هدايا الموظفين، هدايا العملاء، وتنسيقات المناسبات. تواصل معنا للحصول على عرض خاص.',
            'Yes, we offer special corporate services including employee gifts, client gifts, and event arrangements. Contact us for a special quote.'
          ),
        },
        {
          q: t('ما هي ساعات عمل خدمة العملاء؟', 'What are customer service hours?'),
          a: t(
            'خدمة العملاء متاحة يوميًا من الساعة 9 صباحًا حتى 11 مساءً. في المناسبات الخاصة، نوفر دعمًا على مدار الساعة.',
            'Customer service is available daily from 9 AM to 11 PM. During special occasions, we provide 24/7 support.'
          ),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#F8F5F0] to-[#EDE8E0] py-16 sm:py-20">
        <div className="container-luxury text-center">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-charcoal font-medium mb-4">
            {t('الأسئلة الشائعة', 'Frequently Asked Questions')}
          </h1>
          <p className="text-charcoal/60 text-base sm:text-lg max-w-2xl mx-auto">
            {t(
              'نجيب على أكثر الأسئلة شيوعًا لمساعدتك في تجربة تسوق سلسة',
              'We answer the most common questions to help you with a smooth shopping experience'
            )}
          </p>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-12 sm:py-16 container-luxury">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {faqCategories.map((category) => (
            <a
              key={category.id}
              href={`#${category.id}`}
              className="flex flex-col items-center gap-3 p-4 bg-white border border-border rounded-xl hover:border-gold hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                <category.icon className="w-5 h-5 text-gold" />
              </div>
              <span className="text-sm text-charcoal font-medium text-center">
                {category.title}
              </span>
            </a>
          ))}
        </div>

        {/* FAQ Accordions */}
        <div className="space-y-10">
          {faqCategories.map((category) => (
            <div key={category.id} id={category.id} className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-gold" />
                </div>
                <h2 className="font-display text-xl sm:text-2xl text-charcoal font-medium">
                  {category.title}
                </h2>
              </div>
              
              <Accordion type="single" collapsible className="space-y-3">
                {category.questions.map((item, index) => (
                  <AccordionItem
                    key={index}
                    value={`${category.id}-${index}`}
                    className="bg-white border border-border rounded-xl px-5 sm:px-6 data-[state=open]:border-gold data-[state=open]:shadow-md transition-all"
                  >
                    <AccordionTrigger className="text-start text-charcoal hover:no-underline py-5 text-sm sm:text-base font-medium">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-charcoal/70 text-sm sm:text-base leading-relaxed pb-5">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-12 sm:py-16 bg-charcoal">
        <div className="container-luxury text-center">
          <h3 className="font-display text-2xl sm:text-3xl text-white font-medium mb-4">
            {t('لم تجد إجابة لسؤالك؟', "Didn't find your answer?")}
          </h3>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">
            {t(
              'فريق خدمة العملاء جاهز لمساعدتك على مدار الساعة',
              'Our customer service team is ready to help you around the clock'
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://wa.me/966501234567"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#25D366]/90 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {t('تواصل عبر واتساب', 'Chat on WhatsApp')}
            </a>
            <a
              href="mailto:info@calapres.com"
              className="inline-flex items-center gap-2 bg-white text-charcoal px-6 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              {t('راسلنا بالإيميل', 'Email Us')}
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default FAQ;

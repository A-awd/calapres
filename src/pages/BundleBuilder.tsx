import StorefrontLayout from '@/components/storefront/StorefrontLayout';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Gift, 
  Ribbon, 
  MessageSquare, 
  Check, 
  Plus, 
  Minus, 
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  X,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import { giftBoxes, giftItems, giftWraps, ribbons } from '@/data/bundleBuilderData';
import { GiftBox, GiftItem, GiftWrap, Ribbon as RibbonType, BundleBuilderPricing } from '@/types/bundleBuilder';
import { toast } from 'sonner';

type Step = 'box' | 'items' | 'wrap' | 'details';

const BundleBuilder: React.FC = () => {
  const { t, language, direction } = useLanguage();
  const { addItem } = useCart();
  
  const [currentStep, setCurrentStep] = useState<Step>('box');
  const [selectedBox, setSelectedBox] = useState<GiftBox | null>(null);
  const [selectedItems, setSelectedItems] = useState<GiftItem[]>([]);
  const [selectedWrap, setSelectedWrap] = useState<GiftWrap | null>(null);
  const [selectedRibbon, setSelectedRibbon] = useState<RibbonType | null>(null);
  const [greetingCard, setGreetingCard] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [hideInvoice, setHideInvoice] = useState(false);

  const steps: { key: Step; icon: React.ElementType; label: string; labelAr: string }[] = [
    { key: 'box', icon: Package, label: 'Choose Box', labelAr: 'اختر الصندوق' },
    { key: 'items', icon: Gift, label: 'Add Items', labelAr: 'أضف المنتجات' },
    { key: 'wrap', icon: Ribbon, label: 'Wrapping', labelAr: 'التغليف' },
    { key: 'details', icon: MessageSquare, label: 'Details', labelAr: 'التفاصيل' },
  ];

  const pricing: BundleBuilderPricing = useMemo(() => {
    const boxPrice = selectedBox?.price || 0;
    const itemsPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);
    const wrapPrice = selectedWrap?.price || 0;
    const ribbonPrice = selectedRibbon?.price || 0;
    const cardPrice = greetingCard.trim() ? 10 : 0;
    return {
      boxPrice,
      itemsPrice,
      wrapPrice,
      ribbonPrice,
      cardPrice,
      total: boxPrice + itemsPrice + wrapPrice + ribbonPrice + cardPrice,
    };
  }, [selectedBox, selectedItems, selectedWrap, selectedRibbon, greetingCard]);

  const canProceed = () => {
    switch (currentStep) {
      case 'box':
        return selectedBox !== null;
      case 'items':
        return selectedItems.length > 0;
      case 'wrap':
        return true;
      case 'details':
        return true;
      default:
        return false;
    }
  };

  const getStepIndex = (step: Step) => steps.findIndex(s => s.key === step);

  const nextStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key);
    }
  };

  const prevStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key);
    }
  };

  const toggleItem = (item: GiftItem) => {
    if (!selectedBox) return;
    
    const isSelected = selectedItems.some(i => i.id === item.id);
    if (isSelected) {
      setSelectedItems(prev => prev.filter(i => i.id !== item.id));
    } else if (selectedItems.length < selectedBox.maxItems) {
      setSelectedItems(prev => [...prev, item]);
    } else {
      toast.error(t(
        `الحد الأقصى ${selectedBox.maxItems} منتجات لهذا الصندوق`,
        `Maximum ${selectedBox.maxItems} items for this box`
      ));
    }
  };

  const handleAddToCart = () => {
    if (!selectedBox || selectedItems.length === 0) return;

    // Create a custom bundle product
    const bundleProduct = {
      id: `custom-bundle-${Date.now()}`,
      name: `Custom Gift Box - ${selectedBox.name}`,
      nameAr: `صندوق هدية مخصص - ${selectedBox.nameAr}`,
      price: pricing.total,
      image: selectedBox.image,
      category: 'Custom Bundle',
      categoryAr: 'باقة مخصصة',
      description: `Custom bundle with ${selectedItems.length} items`,
      descriptionAr: `باقة مخصصة تحتوي على ${selectedItems.length} منتجات`,
      inStock: true,
      stockCount: 1,
      sku: `BUNDLE-${Date.now()}`,
      tags: ['custom', 'bundle'],
      createdAt: new Date().toISOString(),
    };

    addItem(bundleProduct, 1, {
      giftWrap: !!selectedWrap,
      greetingCard: greetingCard || undefined,
      hideInvoice,
      recipientName: recipientName || undefined,
      recipientPhone: recipientPhone || undefined,
      recipientAddress: recipientAddress || undefined,
    });

    toast.success(t('تمت إضافة الباقة إلى السلة', 'Bundle added to cart'));
  };

  const Arrow = direction === 'rtl' ? ChevronLeft : ChevronRight;
  const BackArrow = direction === 'rtl' ? ChevronRight : ChevronLeft;

  return (
    <StorefrontLayout>
      
      <main className="container-luxury section-padding">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              {t('صمم هديتك الخاصة', 'Create Your Custom Gift')}
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
            {t('منشئ الباقات', 'Bundle Builder')}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t(
              'اختر الصندوق المثالي، أضف المنتجات التي تحبها، واختر التغليف الأنيق لإنشاء هدية لا تُنسى.',
              'Choose the perfect box, add your favorite items, and select elegant wrapping to create an unforgettable gift.'
            )}
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-2 md:gap-4">
            {steps.map((step, index) => {
              const isActive = currentStep === step.key;
              const isCompleted = getStepIndex(currentStep) > index;
              const Icon = step.icon;

              return (
                <React.Fragment key={step.key}>
                  <button
                    onClick={() => {
                      if (isCompleted || isActive) {
                        setCurrentStep(step.key);
                      }
                    }}
                    disabled={!isCompleted && !isActive}
                    className={`flex flex-col items-center gap-2 transition-all ${
                      isCompleted || isActive ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg scale-110'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs md:text-sm font-medium hidden md:block ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {language === 'ar' ? step.labelAr : step.label}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`w-8 md:w-16 h-0.5 ${
                      isCompleted ? 'bg-green-500' : 'bg-secondary'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Step 1: Choose Box */}
              {currentStep === 'box' && (
                <motion.div
                  key="box"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="font-display text-2xl font-bold">
                    {t('اختر حجم الصندوق', 'Choose Box Size')}
                  </h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    {giftBoxes.map((box) => (
                      <motion.div
                        key={box.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedBox(box);
                          if (selectedItems.length > box.maxItems) {
                            setSelectedItems(prev => prev.slice(0, box.maxItems));
                          }
                        }}
                        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedBox?.id === box.id
                            ? 'border-primary bg-primary/5 shadow-elegant'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {selectedBox?.id === box.id && (
                          <div className="absolute top-2 end-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                        <img
                          src={box.image}
                          alt={language === 'ar' ? box.nameAr : box.name}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                        <h3 className="font-semibold text-lg mb-1">
                          {language === 'ar' ? box.nameAr : box.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {language === 'ar' ? box.dimensionsAr : box.dimensions}
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          {t(`حتى ${box.maxItems} منتجات`, `Up to ${box.maxItems} items`)}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {box.price} {t('ر.س', 'SAR')}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Add Items */}
              {currentStep === 'items' && (
                <motion.div
                  key="items"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl font-bold">
                      {t('أضف المنتجات', 'Add Items')}
                    </h2>
                    <span className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                      {selectedItems.length}/{selectedBox?.maxItems || 0} {t('منتجات', 'items')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {giftItems.map((item) => {
                      const isSelected = selectedItems.some(i => i.id === item.id);
                      const isDisabled = !isSelected && selectedItems.length >= (selectedBox?.maxItems || 0);

                      return (
                        <motion.div
                          key={item.id}
                          whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                          whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                          onClick={() => !isDisabled && toggleItem(item)}
                          className={`relative p-3 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : isDisabled
                              ? 'border-border opacity-50 cursor-not-allowed'
                              : 'border-border hover:border-primary/50 cursor-pointer'
                          }`}
                        >
                          {isSelected && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItem(item);
                              }}
                              className="absolute top-2 end-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center z-10"
                            >
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </button>
                          )}
                          <img
                            src={item.image}
                            alt={language === 'ar' ? item.nameAr : item.name}
                            className="w-full h-24 object-cover rounded-lg mb-2"
                          />
                          <h4 className="font-medium text-sm mb-1 line-clamp-1">
                            {language === 'ar' ? item.nameAr : item.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-1">
                            {language === 'ar' ? item.categoryAr : item.category}
                          </p>
                          <p className="text-sm font-bold text-primary">
                            {item.price} {t('ر.س', 'SAR')}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Wrapping */}
              {currentStep === 'wrap' && (
                <motion.div
                  key="wrap"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  {/* Gift Wrap */}
                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-bold">
                      {t('اختر ورق التغليف', 'Choose Gift Wrap')}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {giftWraps.map((wrap) => (
                        <motion.div
                          key={wrap.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedWrap(selectedWrap?.id === wrap.id ? null : wrap)}
                          className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedWrap?.id === wrap.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {selectedWrap?.id === wrap.id && (
                            <div className="absolute top-2 end-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                          <div
                            className="w-full h-20 rounded-lg mb-3"
                            style={{ backgroundColor: wrap.color }}
                          />
                          <h4 className="font-medium text-sm mb-1">
                            {language === 'ar' ? wrap.nameAr : wrap.name}
                          </h4>
                          <p className="text-sm font-bold text-primary">
                            +{wrap.price} {t('ر.س', 'SAR')}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Ribbon */}
                  <div className="space-y-4">
                    <h2 className="font-display text-xl font-bold">
                      {t('اختر الشريط', 'Choose Ribbon')}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {ribbons.map((ribbon) => (
                        <button
                          key={ribbon.id}
                          onClick={() => setSelectedRibbon(selectedRibbon?.id === ribbon.id ? null : ribbon)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                            selectedRibbon?.id === ribbon.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div
                            className="w-6 h-6 rounded-full border-2 border-border"
                            style={{ backgroundColor: ribbon.color }}
                          />
                          <span className="font-medium text-sm">
                            {language === 'ar' ? ribbon.nameAr : ribbon.name}
                          </span>
                          <span className="text-sm text-primary font-bold">
                            +{ribbon.price} {t('ر.س', 'SAR')}
                          </span>
                          {selectedRibbon?.id === ribbon.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Details */}
              {currentStep === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="font-display text-2xl font-bold">
                    {t('تفاصيل الهدية', 'Gift Details')}
                  </h2>
                  
                  {/* Greeting Card */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">
                      {t('بطاقة تهنئة (+10 ر.س)', 'Greeting Card (+10 SAR)')}
                    </Label>
                    <Textarea
                      value={greetingCard}
                      onChange={(e) => setGreetingCard(e.target.value)}
                      placeholder={t('اكتب رسالتك هنا...', 'Write your message here...')}
                      className="min-h-[120px]"
                      maxLength={250}
                    />
                    <p className="text-xs text-muted-foreground">
                      {greetingCard.length}/250 {t('حرف', 'characters')}
                    </p>
                  </div>

                  {/* Recipient Details */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      {t('تفاصيل المستلم (اختياري)', 'Recipient Details (Optional)')}
                    </Label>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder={t('اسم المستلم', 'Recipient Name')}
                      />
                      <Input
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder={t('رقم هاتف المستلم', 'Recipient Phone')}
                        dir="ltr"
                      />
                    </div>
                    <Textarea
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder={t('عنوان التوصيل', 'Delivery Address')}
                      className="min-h-[80px]"
                    />
                  </div>

                  {/* Hide Invoice */}
                  <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
                    <Checkbox
                      id="hideInvoice"
                      checked={hideInvoice}
                      onCheckedChange={(checked) => setHideInvoice(checked as boolean)}
                    />
                    <Label htmlFor="hideInvoice" className="cursor-pointer">
                      {t('إخفاء الفاتورة (الهدية مفاجأة)', 'Hide invoice (Gift is a surprise)')}
                    </Label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 'box'}
                className="gap-2"
              >
                <BackArrow className="w-4 h-4" />
                {t('السابق', 'Previous')}
              </Button>
              
              {currentStep === 'details' ? (
                <Button
                  onClick={handleAddToCart}
                  disabled={!selectedBox || selectedItems.length === 0}
                  className="gap-2"
                  variant="luxury"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {t('أضف إلى السلة', 'Add to Cart')}
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="gap-2"
                >
                  {t('التالي', 'Next')}
                  <Arrow className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Pricing Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 bg-card border border-border rounded-2xl shadow-elegant">
              <h3 className="font-display text-xl font-bold mb-6">
                {t('ملخص الطلب', 'Order Summary')}
              </h3>
              
              <div className="space-y-4 mb-6">
                {/* Box */}
                {selectedBox && (
                  <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                    <img
                      src={selectedBox.image}
                      alt={language === 'ar' ? selectedBox.nameAr : selectedBox.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {language === 'ar' ? selectedBox.nameAr : selectedBox.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('الصندوق', 'Box')}
                      </p>
                    </div>
                    <span className="font-bold text-sm">
                      {selectedBox.price} {t('ر.س', 'SAR')}
                    </span>
                  </div>
                )}

                {/* Items */}
                {selectedItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('المنتجات', 'Items')} ({selectedItems.length})
                    </p>
                    {selectedItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg">
                        <img
                          src={item.image}
                          alt={language === 'ar' ? item.nameAr : item.name}
                          className="w-8 h-8 object-cover rounded"
                        />
                        <span className="flex-1 text-sm line-clamp-1">
                          {language === 'ar' ? item.nameAr : item.name}
                        </span>
                        <span className="text-sm font-medium">
                          {item.price} {t('ر.س', 'SAR')}
                        </span>
                        <button
                          onClick={() => toggleItem(item)}
                          className="p-1 hover:bg-destructive/10 rounded-full text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Wrap */}
                {selectedWrap && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('التغليف', 'Gift Wrap')}: {language === 'ar' ? selectedWrap.nameAr : selectedWrap.name}
                    </span>
                    <span className="font-medium">+{selectedWrap.price} {t('ر.س', 'SAR')}</span>
                  </div>
                )}

                {/* Ribbon */}
                {selectedRibbon && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('الشريط', 'Ribbon')}: {language === 'ar' ? selectedRibbon.nameAr : selectedRibbon.name}
                    </span>
                    <span className="font-medium">+{selectedRibbon.price} {t('ر.س', 'SAR')}</span>
                  </div>
                )}

                {/* Card */}
                {greetingCard.trim() && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('بطاقة تهنئة', 'Greeting Card')}</span>
                    <span className="font-medium">+10 {t('ر.س', 'SAR')}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">{t('المجموع الفرعي', 'Subtotal')}</span>
                  <span className="font-medium">{pricing.total} {t('ر.س', 'SAR')}</span>
                </div>
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>{t('الإجمالي', 'Total')}</span>
                  <span className="text-primary">{pricing.total} {t('ر.س', 'SAR')}</span>
                </div>
              </div>

              {/* Empty State */}
              {!selectedBox && selectedItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t('ابدأ بإضافة صندوق ومنتجات', 'Start by adding a box and items')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </StorefrontLayout>
  );
};

export default BundleBuilder;

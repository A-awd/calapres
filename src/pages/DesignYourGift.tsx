import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useGiftBoxes, useGiftItems, useGiftWraps, useRibbons, GiftBox, GiftItem, GiftWrap, Ribbon } from '@/hooks/useGiftBuilder';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import StorefrontLayout from '@/components/storefront/StorefrontLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Package, 
  Gift, 
  Ribbon as RibbonIcon, 
  Sparkles, 
  Check, 
  Plus, 
  Minus, 
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';

type Step = 'box' | 'items' | 'wrap' | 'ribbon' | 'card' | 'summary';

const STEPS: { key: Step; labelEn: string; labelAr: string; icon: React.ReactNode }[] = [
  { key: 'box', labelEn: 'Choose Box', labelAr: 'اختر البوكس', icon: <Package className="w-5 h-5" /> },
  { key: 'items', labelEn: 'Add Items', labelAr: 'أضف المنتجات', icon: <Gift className="w-5 h-5" /> },
  { key: 'wrap', labelEn: 'Gift Wrap', labelAr: 'التغليف', icon: <Sparkles className="w-5 h-5" /> },
  { key: 'ribbon', labelEn: 'Ribbon', labelAr: 'الشريط', icon: <RibbonIcon className="w-5 h-5" /> },
  { key: 'card', labelEn: 'Greeting Card', labelAr: 'كرت التهنئة', icon: <Gift className="w-5 h-5" /> },
  { key: 'summary', labelEn: 'Summary', labelAr: 'الملخص', icon: <ShoppingBag className="w-5 h-5" /> },
];

const DesignYourGift = () => {
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const { addItem } = useCart();
  
  const { data: boxes, isLoading: loadingBoxes } = useGiftBoxes();
  const { data: items, isLoading: loadingItems } = useGiftItems();
  const { data: wraps, isLoading: loadingWraps } = useGiftWraps();
  const { data: ribbons, isLoading: loadingRibbons } = useRibbons();

  const [currentStep, setCurrentStep] = useState<Step>('box');
  const [selectedBox, setSelectedBox] = useState<GiftBox | null>(null);
  const [selectedItems, setSelectedItems] = useState<GiftItem[]>([]);
  const [selectedWrap, setSelectedWrap] = useState<GiftWrap | null>(null);
  const [selectedRibbon, setSelectedRibbon] = useState<Ribbon | null>(null);
  const [greetingMessage, setGreetingMessage] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [hidePrice, setHidePrice] = useState(false);

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);

  const pricing = useMemo(() => {
    const boxPrice = selectedBox?.price || 0;
    const itemsPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);
    const wrapPrice = selectedWrap?.price || 0;
    const ribbonPrice = selectedRibbon?.price || 0;
    const cardPrice = greetingMessage ? 10 : 0;
    const total = boxPrice + itemsPrice + wrapPrice + ribbonPrice + cardPrice;
    return { boxPrice, itemsPrice, wrapPrice, ribbonPrice, cardPrice, total };
  }, [selectedBox, selectedItems, selectedWrap, selectedRibbon, greetingMessage]);

  const canProceed = () => {
    switch (currentStep) {
      case 'box': return !!selectedBox;
      case 'items': return selectedItems.length > 0;
      case 'wrap': return true; // Optional
      case 'ribbon': return true; // Optional
      case 'card': return true; // Optional
      case 'summary': return true;
      default: return false;
    }
  };

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].key);
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].key);
    }
  };

  const toggleItem = (item: GiftItem) => {
    if (!selectedBox) return;
    
    const isSelected = selectedItems.some(i => i.id === item.id);
    if (isSelected) {
      setSelectedItems(prev => prev.filter(i => i.id !== item.id));
    } else {
      if (selectedItems.length >= selectedBox.max_items) {
        toast.error(
          language === 'ar' 
            ? `الحد الأقصى ${selectedBox.max_items} منتجات لهذا البوكس`
            : `Maximum ${selectedBox.max_items} items for this box`
        );
        return;
      }
      setSelectedItems(prev => [...prev, item]);
    }
  };

  const handleAddToCart = () => {
    if (!selectedBox) return;

    const customGift = {
      id: `custom-gift-${Date.now()}`,
      name: `Custom Gift Box - ${selectedBox.name}`,
      nameAr: `بوكس هدية مخصص - ${selectedBox.name_ar}`,
      price: pricing.total,
      image: selectedBox.image || '/placeholder.svg',
      category: 'Custom Gift',
      categoryAr: 'هدية مخصصة',
    };

    addItem(customGift, 1, {
      giftWrap: !!selectedWrap,
    });

    toast.success(
      language === 'ar' ? 'تمت إضافة الهدية إلى السلة!' : 'Gift added to cart!'
    );
  };

  const isLoading = loadingBoxes || loadingItems || loadingWraps || loadingRibbons;

  return (
    <StorefrontLayout>
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="container-luxury text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4"
            >
              {language === 'ar' ? 'صمّم هديتك' : 'Design Your Gift'}
            </motion.h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {language === 'ar' 
                ? 'اختر البوكس والمنتجات والتغليف لتصنع هدية فريدة ومميزة'
                : 'Choose your box, items, and wrapping to create a unique and special gift'}
            </p>
          </div>
        </section>

        {/* Progress Steps */}
        <section className="py-6 border-b bg-background sticky top-16 z-40">
          <div className="container-luxury">
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
              {STEPS.map((step, index) => {
                const isActive = step.key === currentStep;
                const isCompleted = index < currentStepIndex;
                
                return (
                  <React.Fragment key={step.key}>
                    <button
                      onClick={() => index <= currentStepIndex && setCurrentStep(step.key)}
                      disabled={index > currentStepIndex}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-full transition-all whitespace-nowrap
                        ${isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : isCompleted 
                            ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                            : 'bg-muted text-muted-foreground cursor-not-allowed'}
                      `}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : step.icon}
                      <span className="text-sm font-medium hidden sm:inline">
                        {language === 'ar' ? step.labelAr : step.labelEn}
                      </span>
                    </button>
                    {index < STEPS.length - 1 && (
                      <div className={`w-8 h-0.5 ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container-luxury">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Step Content */}
              <div className="lg:col-span-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Box Selection */}
                    {currentStep === 'box' && (
                      <div>
                        <h2 className="text-2xl font-display font-semibold mb-6">
                          {language === 'ar' ? 'اختر حجم البوكس' : 'Choose Your Box Size'}
                        </h2>
                        {loadingBoxes ? (
                          <div className="grid sm:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
                          </div>
                        ) : (
                          <div className="grid sm:grid-cols-3 gap-4">
                            {boxes?.map(box => (
                              <button
                                key={box.id}
                                onClick={() => {
                                  setSelectedBox(box);
                                  setSelectedItems([]); // Reset items when box changes
                                }}
                                className={`
                                  relative p-6 rounded-xl border-2 transition-all text-start
                                  ${selectedBox?.id === box.id 
                                    ? 'border-primary bg-primary/5 shadow-lg' 
                                    : 'border-border hover:border-primary/50 hover:shadow-md'}
                                `}
                              >
                                {selectedBox?.id === box.id && (
                                  <div className="absolute top-3 end-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                    <Check className="w-4 h-4 text-primary-foreground" />
                                  </div>
                                )}
                                <div className="w-16 h-16 bg-muted rounded-lg mb-4 flex items-center justify-center">
                                  <Package className={`
                                    ${box.size === 'small' ? 'w-8 h-8' : box.size === 'medium' ? 'w-10 h-10' : 'w-12 h-12'}
                                    text-primary
                                  `} />
                                </div>
                                <h3 className="font-semibold text-lg mb-1">
                                  {language === 'ar' ? box.name_ar : box.name}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {language === 'ar' ? box.dimensions_ar : box.dimensions}
                                </p>
                                <p className="text-sm text-muted-foreground mb-3">
                                  {language === 'ar' 
                                    ? `حتى ${box.max_items} منتجات` 
                                    : `Up to ${box.max_items} items`}
                                </p>
                                <p className="text-xl font-bold text-primary">
                                  {box.price} {language === 'ar' ? 'ر.س' : 'SAR'}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Items Selection */}
                    {currentStep === 'items' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-display font-semibold">
                            {language === 'ar' ? 'اختر المنتجات' : 'Choose Your Items'}
                          </h2>
                          <Badge variant="secondary">
                            {selectedItems.length} / {selectedBox?.max_items || 0}
                          </Badge>
                        </div>
                        {loadingItems ? (
                          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
                          </div>
                        ) : (
                          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {items?.map(item => {
                              const isSelected = selectedItems.some(i => i.id === item.id);
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => toggleItem(item)}
                                  className={`
                                    relative p-4 rounded-xl border-2 transition-all text-start
                                    ${isSelected 
                                      ? 'border-primary bg-primary/5' 
                                      : 'border-border hover:border-primary/50'}
                                  `}
                                >
                                  {isSelected && (
                                    <div className="absolute top-2 end-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                      <Check className="w-4 h-4 text-primary-foreground" />
                                    </div>
                                  )}
                                  <div className="w-12 h-12 bg-muted rounded-lg mb-3 flex items-center justify-center">
                                    <Gift className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                  <h3 className="font-medium mb-1">
                                    {language === 'ar' ? item.name_ar : item.name}
                                  </h3>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {language === 'ar' ? item.category_ar : item.category}
                                  </p>
                                  <p className="text-lg font-bold text-primary">
                                    {item.price} {language === 'ar' ? 'ر.س' : 'SAR'}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Gift Wrap Selection */}
                    {currentStep === 'wrap' && (
                      <div>
                        <h2 className="text-2xl font-display font-semibold mb-6">
                          {language === 'ar' ? 'اختر التغليف (اختياري)' : 'Choose Gift Wrap (Optional)'}
                        </h2>
                        {loadingWraps ? (
                          <div className="grid sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                          </div>
                        ) : (
                          <div className="grid sm:grid-cols-3 md:grid-cols-5 gap-4">
                            <button
                              onClick={() => setSelectedWrap(null)}
                              className={`
                                p-4 rounded-xl border-2 transition-all
                                ${!selectedWrap 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border hover:border-primary/50'}
                              `}
                            >
                              <X className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm font-medium">
                                {language === 'ar' ? 'بدون تغليف' : 'No Wrap'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {language === 'ar' ? 'مجاناً' : 'Free'}
                              </p>
                            </button>
                            {wraps?.map(wrap => (
                              <button
                                key={wrap.id}
                                onClick={() => setSelectedWrap(wrap)}
                                className={`
                                  relative p-4 rounded-xl border-2 transition-all
                                  ${selectedWrap?.id === wrap.id 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border hover:border-primary/50'}
                                `}
                              >
                                {selectedWrap?.id === wrap.id && (
                                  <div className="absolute top-2 end-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-primary-foreground" />
                                  </div>
                                )}
                                <div 
                                  className="w-12 h-12 rounded-lg mx-auto mb-2 border"
                                  style={{ backgroundColor: wrap.color || '#f0f0f0' }}
                                />
                                <p className="text-sm font-medium">
                                  {language === 'ar' ? wrap.name_ar : wrap.name}
                                </p>
                                <p className="text-sm text-primary font-bold">
                                  +{wrap.price} {language === 'ar' ? 'ر.س' : 'SAR'}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ribbon Selection */}
                    {currentStep === 'ribbon' && (
                      <div>
                        <h2 className="text-2xl font-display font-semibold mb-6">
                          {language === 'ar' ? 'اختر الشريط (اختياري)' : 'Choose Ribbon (Optional)'}
                        </h2>
                        {loadingRibbons ? (
                          <div className="grid sm:grid-cols-3 md:grid-cols-6 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                          </div>
                        ) : (
                          <div className="grid sm:grid-cols-3 md:grid-cols-6 gap-4">
                            <button
                              onClick={() => setSelectedRibbon(null)}
                              className={`
                                p-4 rounded-xl border-2 transition-all
                                ${!selectedRibbon 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border hover:border-primary/50'}
                              `}
                            >
                              <X className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-xs font-medium">
                                {language === 'ar' ? 'بدون' : 'None'}
                              </p>
                            </button>
                            {ribbons?.map(ribbon => (
                              <button
                                key={ribbon.id}
                                onClick={() => setSelectedRibbon(ribbon)}
                                className={`
                                  relative p-4 rounded-xl border-2 transition-all
                                  ${selectedRibbon?.id === ribbon.id 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border hover:border-primary/50'}
                                `}
                              >
                                {selectedRibbon?.id === ribbon.id && (
                                  <div className="absolute top-1 end-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                  </div>
                                )}
                                <div 
                                  className="w-8 h-8 rounded-full mx-auto mb-2 border"
                                  style={{ backgroundColor: ribbon.color || '#f0f0f0' }}
                                />
                                <p className="text-xs font-medium truncate">
                                  {language === 'ar' ? ribbon.name_ar : ribbon.name}
                                </p>
                                <p className="text-xs text-primary font-bold">
                                  +{ribbon.price}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Greeting Card */}
                    {currentStep === 'card' && (
                      <div className="max-w-xl">
                        <h2 className="text-2xl font-display font-semibold mb-6">
                          {language === 'ar' ? 'أضف كرت تهنئة (اختياري)' : 'Add Greeting Card (Optional)'}
                        </h2>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              {language === 'ar' ? 'اسم المستلم' : 'Recipient Name'}
                            </label>
                            <Input
                              value={recipientName}
                              onChange={(e) => setRecipientName(e.target.value)}
                              placeholder={language === 'ar' ? 'أدخل اسم المستلم' : 'Enter recipient name'}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              {language === 'ar' ? 'رسالة التهنئة' : 'Greeting Message'}
                              {greetingMessage && (
                                <span className="text-primary ms-2">+10 {language === 'ar' ? 'ر.س' : 'SAR'}</span>
                              )}
                            </label>
                            <Textarea
                              value={greetingMessage}
                              onChange={(e) => setGreetingMessage(e.target.value)}
                              placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
                              rows={4}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="hidePrice"
                              checked={hidePrice}
                              onCheckedChange={(checked) => setHidePrice(!!checked)}
                            />
                            <label htmlFor="hidePrice" className="text-sm">
                              {language === 'ar' ? 'إخفاء السعر من الفاتورة' : 'Hide price from invoice'}
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {currentStep === 'summary' && (
                      <div>
                        <h2 className="text-2xl font-display font-semibold mb-6">
                          {language === 'ar' ? 'ملخص الهدية' : 'Gift Summary'}
                        </h2>
                        <div className="space-y-4">
                          {/* Box */}
                          <div className="p-4 bg-muted/50 rounded-xl">
                            <h3 className="font-medium mb-2">{language === 'ar' ? 'البوكس' : 'Box'}</h3>
                            <div className="flex items-center justify-between">
                              <span>{language === 'ar' ? selectedBox?.name_ar : selectedBox?.name}</span>
                              <span className="font-bold">{pricing.boxPrice} {language === 'ar' ? 'ر.س' : 'SAR'}</span>
                            </div>
                          </div>

                          {/* Items */}
                          <div className="p-4 bg-muted/50 rounded-xl">
                            <h3 className="font-medium mb-2">
                              {language === 'ar' ? 'المنتجات' : 'Items'} ({selectedItems.length})
                            </h3>
                            <div className="space-y-2">
                              {selectedItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                  <span>{language === 'ar' ? item.name_ar : item.name}</span>
                                  <span>{item.price} {language === 'ar' ? 'ر.س' : 'SAR'}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Extras */}
                          {(selectedWrap || selectedRibbon || greetingMessage) && (
                            <div className="p-4 bg-muted/50 rounded-xl">
                              <h3 className="font-medium mb-2">{language === 'ar' ? 'الإضافات' : 'Extras'}</h3>
                              <div className="space-y-2 text-sm">
                                {selectedWrap && (
                                  <div className="flex items-center justify-between">
                                    <span>{language === 'ar' ? selectedWrap.name_ar : selectedWrap.name}</span>
                                    <span>{selectedWrap.price} {language === 'ar' ? 'ر.س' : 'SAR'}</span>
                                  </div>
                                )}
                                {selectedRibbon && (
                                  <div className="flex items-center justify-between">
                                    <span>{language === 'ar' ? selectedRibbon.name_ar : selectedRibbon.name}</span>
                                    <span>{selectedRibbon.price} {language === 'ar' ? 'ر.س' : 'SAR'}</span>
                                  </div>
                                )}
                                {greetingMessage && (
                                  <div className="flex items-center justify-between">
                                    <span>{language === 'ar' ? 'كرت تهنئة' : 'Greeting Card'}</span>
                                    <span>10 {language === 'ar' ? 'ر.س' : 'SAR'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {recipientName && (
                            <div className="p-4 bg-muted/50 rounded-xl">
                              <h3 className="font-medium mb-2">{language === 'ar' ? 'المستلم' : 'Recipient'}</h3>
                              <p className="text-sm">{recipientName}</p>
                              {greetingMessage && (
                                <p className="text-sm text-muted-foreground mt-2 italic">"{greetingMessage}"</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={goToPreviousStep}
                    disabled={currentStepIndex === 0}
                    className="gap-2"
                  >
                    {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    {language === 'ar' ? 'السابق' : 'Previous'}
                  </Button>

                  {currentStep === 'summary' ? (
                    <Button
                      onClick={handleAddToCart}
                      className="gap-2"
                      size="lg"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {language === 'ar' ? 'أضف للسلة' : 'Add to Cart'}
                    </Button>
                  ) : (
                    <Button
                      onClick={goToNextStep}
                      disabled={!canProceed()}
                      className="gap-2"
                    >
                      {language === 'ar' ? 'التالي' : 'Next'}
                      {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Pricing Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-40 p-6 bg-muted/30 rounded-2xl border">
                  <h3 className="font-display font-semibold text-lg mb-4">
                    {language === 'ar' ? 'ملخص السعر' : 'Price Summary'}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'البوكس' : 'Box'}</span>
                      <span>{pricing.boxPrice} {language === 'ar' ? 'ر.س' : 'SAR'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'المنتجات' : 'Items'}</span>
                      <span>{pricing.itemsPrice} {language === 'ar' ? 'ر.س' : 'SAR'}</span>
                    </div>
                    {pricing.wrapPrice > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{language === 'ar' ? 'التغليف' : 'Wrap'}</span>
                        <span>{pricing.wrapPrice} {language === 'ar' ? 'ر.س' : 'SAR'}</span>
                      </div>
                    )}
                    {pricing.ribbonPrice > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{language === 'ar' ? 'الشريط' : 'Ribbon'}</span>
                        <span>{pricing.ribbonPrice} {language === 'ar' ? 'ر.س' : 'SAR'}</span>
                      </div>
                    )}
                    {pricing.cardPrice > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{language === 'ar' ? 'كرت التهنئة' : 'Card'}</span>
                        <span>{pricing.cardPrice} {language === 'ar' ? 'ر.س' : 'SAR'}</span>
                      </div>
                    )}
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between font-bold text-lg">
                        <span>{language === 'ar' ? 'المجموع' : 'Total'}</span>
                        <span className="text-primary">{pricing.total} {language === 'ar' ? 'ر.س' : 'SAR'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Selected Items Preview */}
                  {selectedItems.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="text-sm font-medium mb-3">
                        {language === 'ar' ? 'المنتجات المختارة' : 'Selected Items'}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedItems.map(item => (
                          <Badge key={item.id} variant="secondary" className="gap-1">
                            {language === 'ar' ? item.name_ar : item.name}
                            <button onClick={() => toggleItem(item)}>
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </StorefrontLayout>
  );
};

export default DesignYourGift;

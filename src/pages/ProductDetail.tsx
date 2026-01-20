import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  Share2, 
  ShoppingBag, 
  Truck, 
  Clock, 
  Shield,
  Check,
  Minus,
  Plus,
  Star,
  FileText,
  Loader2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import ProductCard from '@/components/storefront/ProductCard';
import ProductImageGallery from '@/components/storefront/ProductImageGallery';
import ProductCustomizationOptions from '@/components/storefront/ProductCustomizationOptions';
import { useProduct } from '@/hooks/useProducts';
import { useBestsellerProducts } from '@/hooks/useStorefrontData';
import { GiftWrap, Ribbon } from '@/hooks/useGiftBuilder';
import { toast } from 'sonner';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language, direction } = useLanguage();
  const { addItem } = useCart();

  // Fetch product from database
  const { data: product, isLoading, error } = useProduct(id || '');
  const { data: relatedProducts } = useBestsellerProducts();
  
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  // Customization state
  const [customization, setCustomization] = useState({
    selectedWrap: null as GiftWrap | null,
    selectedRibbon: null as Ribbon | null,
    greetingCard: '',
    showCardInput: false,
    hideInvoice: false,
  });
  
  // Recipient state
  const [showRecipientFields, setShowRecipientFields] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  const Arrow = direction === 'rtl' ? ChevronLeft : ChevronRight;
  const BackArrow = direction === 'rtl' ? ChevronRight : ChevronLeft;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir={direction}>
        <Header />
        <main className="container-luxury section-padding">
          <div className="grid lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error or not found state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={direction}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('المنتج غير موجود', 'Product not found')}</h1>
          <Button onClick={() => navigate('/')}>
            {t('العودة للرئيسية', 'Go Home')}
          </Button>
        </div>
      </div>
    );
  }

  // Product data
  const images = product.images?.length ? product.images : [product.image || 'https://images.unsplash.com/photo-1518882605630-8eb574205f0f?w=800'];
  const filteredRelated = relatedProducts?.filter(p => p.id !== product.id).slice(0, 4) || [];

  // Price tiers/variants
  const variants = [
    { id: 'standard', name: 'Standard', nameAr: 'عادي', priceAdd: 0 },
    { id: 'premium', name: 'Premium', nameAr: 'فاخر', priceAdd: 50 },
    { id: 'deluxe', name: 'Deluxe', nameAr: 'ديلوكس', priceAdd: 100 },
  ];
  const selectedVariant = variants[selectedVariantIndex];
  
  // Calculate total price
  const basePrice = product.price + selectedVariant.priceAdd;
  const wrapPrice = customization.selectedWrap?.price || 0;
  const ribbonPrice = customization.selectedRibbon?.price || 0;
  const cardPrice = customization.greetingCard.trim() ? 10 : 0;
  const totalPrice = (basePrice + wrapPrice + ribbonPrice + cardPrice) * quantity;

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      nameAr: product.name_ar,
      price: basePrice + wrapPrice + ribbonPrice + cardPrice,
      originalPrice: product.original_price,
      image: product.image,
      category: product.category?.name || null,
      categoryAr: product.category?.name_ar || null,
    }, quantity);
    toast.success(t('تمت الإضافة إلى السلة', 'Added to cart'));
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = language === 'ar' ? product.name_ar : product.name;
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(t('تم نسخ الرابط', 'Link copied'));
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />

      <main className="container-luxury py-6 sm:py-8 md:py-12 lg:section-padding">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 md:mb-8 overflow-x-auto whitespace-nowrap">
          <button onClick={() => navigate('/')} className="hover:text-primary transition-colors flex-shrink-0">
            {t('الرئيسية', 'Home')}
          </button>
          <Arrow className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
          {product.category && (
            <>
              <button 
                onClick={() => navigate(`/collections/${product.category?.name?.toLowerCase().replace(/\s+/g, '-')}`)} 
                className="hover:text-primary transition-colors flex-shrink-0"
              >
                {language === 'ar' ? product.category.name_ar : product.category.name}
              </button>
              <Arrow className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            </>
          )}
          <span className="text-foreground truncate max-w-[150px] sm:max-w-none">
            {language === 'ar' ? product.name_ar : product.name}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-12">
          {/* Product Images with Gallery */}
          <div className="relative z-0">
            <ProductImageGallery
              images={images}
              productName={product.name}
              productNameAr={product.name_ar}
            />

            {/* Badges */}
            <div className="absolute top-4 start-4 flex flex-col gap-2 z-[5] pointer-events-none">
              {product.is_new && (
                <Badge className="bg-green-500 text-white pointer-events-auto">
                  {t('جديد', 'New')}
                </Badge>
              )}
              {product.is_bestseller && (
                <Badge className="bg-amber-500 text-white pointer-events-auto">
                  {t('الأكثر مبيعاً', 'Bestseller')}
                </Badge>
              )}
              {product.is_express && (
                <Badge className="bg-blue-500 text-white pointer-events-auto">
                  {t('توصيل سريع', 'Express')}
                </Badge>
              )}
              {product.original_price && (
                <Badge className="bg-red-500 text-white pointer-events-auto">
                  -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
                </Badge>
              )}
            </div>

            {/* Wishlist & Share */}
            <div className="absolute top-4 end-4 flex flex-col gap-2 z-[5]">
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isWishlisted
                    ? 'bg-red-500 text-white'
                    : 'bg-background/80 backdrop-blur-sm hover:bg-background'
                }`}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
              <button 
                onClick={handleShare}
                className="w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            {/* Title & Price */}
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1.5 sm:mb-2">
                {language === 'ar' ? product.category?.name_ar : product.category?.name}
              </p>
              <h1 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
                {language === 'ar' ? product.name_ar : product.name}
              </h1>
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 sm:w-4 sm:h-4 ${i < 4 ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`}
                    />
                  ))}
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  (24 {t('تقييم', 'reviews')})
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl font-bold text-primary">
                  {basePrice} {t('ر.س', 'SAR')}
                </span>
                {product.original_price && (
                  <span className="text-base sm:text-lg text-muted-foreground line-through">
                    {product.original_price + selectedVariant.priceAdd} {t('ر.س', 'SAR')}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {(product.description || product.description_ar) && (
              <p className="text-muted-foreground leading-relaxed">
                {language === 'ar' ? product.description_ar : product.description}
              </p>
            )}

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {product.in_stock ? (
                <>
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-medium">
                    {t('متوفر', 'In Stock')} 
                    {product.stock_count > 0 && ` (${product.stock_count} ${t('قطعة', 'units')})`}
                  </span>
                </>
              ) : (
                <span className="text-red-500 font-medium">
                  {t('غير متوفر', 'Out of Stock')}
                </span>
              )}
            </div>

            {/* Variants / Options */}
            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm font-semibold">
                {t('اختر الخيار', 'Choose Option')}
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {variants.map((variant, index) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantIndex(index)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                      selectedVariantIndex === index
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {language === 'ar' ? variant.nameAr : variant.name}
                    {variant.priceAdd > 0 && (
                      <span className="ms-1 text-[10px] sm:text-sm">
                        (+{variant.priceAdd} {t('ر.س', 'SAR')})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Customization Options */}
            <ProductCustomizationOptions
              state={customization}
              onWrapChange={(wrap) => setCustomization(prev => ({ ...prev, selectedWrap: wrap }))}
              onRibbonChange={(ribbon) => setCustomization(prev => ({ ...prev, selectedRibbon: ribbon }))}
              onCardChange={(card) => setCustomization(prev => ({ ...prev, greetingCard: card }))}
              onToggleCardInput={() => setCustomization(prev => ({ ...prev, showCardInput: !prev.showCardInput }))}
              onHideInvoiceChange={(hide) => setCustomization(prev => ({ ...prev, hideInvoice: hide }))}
            />

            {/* Send to Recipient */}
            <div className="space-y-3">
              <button
                onClick={() => setShowRecipientFields(!showRecipientFields)}
                className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
              >
                <FileText className="w-4 h-4" />
                {t('إرسال مباشرة للمستلم', 'Send directly to recipient')}
                {showRecipientFields ? (
                  <ChevronLeft className={`w-4 h-4 ${direction === 'rtl' ? '' : 'rotate-90'}`} />
                ) : (
                  <ChevronRight className={`w-4 h-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
                )}
              </button>
              <AnimatePresence>
                {showRecipientFields && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3"
                  >
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
                    <Textarea
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder={t('عنوان التوصيل', 'Delivery Address')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              {/* Quantity Selector */}
              <div className="flex items-center justify-center border border-border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2.5 sm:p-3 hover:bg-secondary transition-colors"
                >
                  <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <span className="px-4 sm:px-6 font-medium text-sm sm:text-base">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2.5 sm:p-3 hover:bg-secondary transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={!product.in_stock}
                className="flex-1 gap-2 text-xs sm:text-sm"
                size="lg"
                variant="luxury"
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                {t('أضف إلى السلة', 'Add to Cart')} - {totalPrice} {t('ر.س', 'SAR')}
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium">{t('توصيل مجاني', 'Free Delivery')}</p>
                <p className="text-xs text-muted-foreground">{t('فوق 500 ر.س', 'Above 500 SAR')}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium">{t('توصيل سريع', 'Express Delivery')}</p>
                <p className="text-xs text-muted-foreground">{t('خلال ساعتين', 'Within 2 hours')}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium">{t('ضمان الجودة', 'Quality Guarantee')}</p>
                <p className="text-xs text-muted-foreground">{t('100% أصلي', '100% Authentic')}</p>
              </div>
            </div>

            {/* SKU & Tags */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>SKU: {product.sku}</p>
              {product.tags && product.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{t('الوسوم:', 'Tags:')}</span>
                  {product.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {filteredRelated.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-2xl font-bold mb-8">
              {t('منتجات ذات صلة', 'Related Products')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {filteredRelated.map((relProduct, index) => (
                <ProductCard key={relProduct.id} product={relProduct} index={index} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;

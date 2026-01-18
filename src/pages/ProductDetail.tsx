import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  Share2, 
  ShoppingBag, 
  Gift, 
  MessageSquare, 
  Truck, 
  Clock, 
  Shield,
  Check,
  Minus,
  Plus,
  Star,
  Eye,
  EyeOff,
  FileText
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import ProductCard from '@/components/storefront/ProductCard';
import { products } from '@/data/mockData';
import { ProductVariant } from '@/types';
import { toast } from 'sonner';

// Mock variants for demo
const mockVariants: ProductVariant[] = [
  { id: 'v1', name: 'Standard', nameAr: 'عادي', price: 0 },
  { id: 'v2', name: 'Premium', nameAr: 'فاخر', price: 50 },
  { id: 'v3', name: 'Deluxe', nameAr: 'ديلوكس', price: 100 },
];

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language, direction } = useLanguage();
  const { addItem, isInCart } = useCart();

  const product = products.find((p) => p.id === id);
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [giftWrap, setGiftWrap] = useState(false);
  const [greetingCard, setGreetingCard] = useState('');
  const [showCardInput, setShowCardInput] = useState(false);
  const [hideInvoice, setHideInvoice] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [showRecipientFields, setShowRecipientFields] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('المنتج غير موجود', 'Product not found')}</h1>
          <Button onClick={() => navigate('/')}>
            {t('العودة للرئيسية', 'Go Home')}
          </Button>
        </div>
      </div>
    );
  }

  const images = product.images || [product.image];
  const relatedProducts = products.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 4);

  const basePrice = product.price + (selectedVariant?.price || 0);
  const giftWrapPrice = giftWrap ? 15 : 0;
  const cardPrice = greetingCard.trim() ? 10 : 0;
  const totalPrice = (basePrice + giftWrapPrice + cardPrice) * quantity;

  const handleAddToCart = () => {
    addItem(product, quantity, {
      variant: selectedVariant || undefined,
      giftWrap,
      greetingCard: greetingCard || undefined,
      hideInvoice,
      recipientName: recipientName || undefined,
      recipientPhone: recipientPhone || undefined,
      recipientAddress: recipientAddress || undefined,
    });
    toast.success(t('تمت الإضافة إلى السلة', 'Added to cart'));
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const Arrow = direction === 'rtl' ? ChevronLeft : ChevronRight;
  const BackArrow = direction === 'rtl' ? ChevronRight : ChevronLeft;

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />

      <main className="container-luxury section-padding">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <button onClick={() => navigate('/')} className="hover:text-primary transition-colors">
            {t('الرئيسية', 'Home')}
          </button>
          <Arrow className="w-4 h-4" />
          <button onClick={() => navigate('/categories')} className="hover:text-primary transition-colors">
            {language === 'ar' ? product.categoryAr : product.category}
          </button>
          <Arrow className="w-4 h-4" />
          <span className="text-foreground">
            {language === 'ar' ? product.nameAr : product.name}
          </span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-secondary">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  src={images[currentImageIndex]}
                  alt={language === 'ar' ? product.nameAr : product.name}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute start-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <BackArrow className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute end-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <Arrow className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-4 start-4 flex flex-col gap-2">
                {product.isNew && (
                  <Badge className="bg-green-500 text-white">
                    {t('جديد', 'New')}
                  </Badge>
                )}
                {product.isBestseller && (
                  <Badge className="bg-amber-500 text-white">
                    {t('الأكثر مبيعاً', 'Bestseller')}
                  </Badge>
                )}
                {product.isExpress && (
                  <Badge className="bg-blue-500 text-white">
                    {t('توصيل سريع', 'Express')}
                  </Badge>
                )}
                {product.originalPrice && (
                  <Badge className="bg-red-500 text-white">
                    -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                  </Badge>
                )}
              </div>

              {/* Wishlist & Share */}
              <div className="absolute top-4 end-4 flex flex-col gap-2">
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
                <button className="w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      currentImageIndex === index
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${language === 'ar' ? product.nameAr : product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title & Price */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {language === 'ar' ? product.categoryAr : product.category}
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
                {language === 'ar' ? product.nameAr : product.name}
              </h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < 4 ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  (24 {t('تقييم', 'reviews')})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-primary">
                  {basePrice} {t('ر.س', 'SAR')}
                </span>
                {product.originalPrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    {product.originalPrice + (selectedVariant?.price || 0)} {t('ر.س', 'SAR')}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">
              {language === 'ar' ? product.descriptionAr : product.description}
            </p>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {product.inStock ? (
                <>
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-medium">
                    {t('متوفر', 'In Stock')} ({product.stockCount} {t('قطعة', 'units')})
                  </span>
                </>
              ) : (
                <span className="text-red-500 font-medium">
                  {t('غير متوفر', 'Out of Stock')}
                </span>
              )}
            </div>

            {/* Variants */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {t('اختر الخيار', 'Choose Option')}
              </Label>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setSelectedVariant(null)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    !selectedVariant
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {t('عادي', 'Standard')}
                </button>
                {mockVariants.slice(1).map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      selectedVariant?.id === variant.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {language === 'ar' ? variant.nameAr : variant.name}
                    {variant.price > 0 && (
                      <span className="ms-1 text-sm">
                        (+{variant.price} {t('ر.س', 'SAR')})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Gift Options */}
            <div className="space-y-4 p-4 bg-secondary rounded-xl">
              <h3 className="font-semibold flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                {t('خيارات الهدية', 'Gift Options')}
              </h3>

              {/* Gift Wrap */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="giftWrap"
                    checked={giftWrap}
                    onCheckedChange={(checked) => setGiftWrap(checked as boolean)}
                  />
                  <Label htmlFor="giftWrap" className="cursor-pointer">
                    {t('تغليف هدية فاخر', 'Premium Gift Wrapping')}
                  </Label>
                </div>
                <span className="text-sm font-medium text-primary">
                  +15 {t('ر.س', 'SAR')}
                </span>
              </div>

              {/* Greeting Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowCardInput(!showCardInput)}
                    className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {t('إضافة بطاقة تهنئة', 'Add Greeting Card')}
                  </button>
                  <span className="text-sm text-muted-foreground">
                    +10 {t('ر.س', 'SAR')}
                  </span>
                </div>
                <AnimatePresence>
                  {showCardInput && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <Textarea
                        value={greetingCard}
                        onChange={(e) => setGreetingCard(e.target.value)}
                        placeholder={t('اكتب رسالتك هنا...', 'Write your message here...')}
                        className="mt-2"
                        maxLength={200}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {greetingCard.length}/200
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Hide Invoice */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="hideInvoice"
                  checked={hideInvoice}
                  onCheckedChange={(checked) => setHideInvoice(checked as boolean)}
                />
                <Label htmlFor="hideInvoice" className="cursor-pointer flex items-center gap-2">
                  {hideInvoice ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {t('إخفاء الفاتورة', 'Hide Invoice')}
                </Label>
              </div>
            </div>

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
            <div className="flex items-center gap-4">
              {/* Quantity Selector */}
              <div className="flex items-center border border-border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-secondary transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-6 font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 hover:bg-secondary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="flex-1 gap-2"
                size="lg"
                variant="luxury"
              >
                <ShoppingBag className="w-5 h-5" />
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
              <div className="flex items-center gap-2 flex-wrap">
                <span>{t('الوسوم:', 'Tags:')}</span>
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-2xl font-bold mb-8">
              {t('منتجات ذات صلة', 'Related Products')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
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

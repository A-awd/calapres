import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Heart, Truck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { optimizeUnsplashUrl, generateSrcSet } from '@/lib/imageUtils';
import { toast } from 'sonner';

interface ProductCardData {
  id: string;
  name: string;
  nameAr: string;
  slug?: string;
  price: number;
  originalPrice?: number | null;
  image?: string | null;
  category?: string | null;
  categoryAr?: string | null;
  isBestseller?: boolean;
  isNew?: boolean;
  isExpress?: boolean;
  inStock?: boolean;
}

interface ProductCardProps {
  product: ProductCardData;
  index?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0 }) => {
  const { t, language } = useLanguage();
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const isMobile = useIsMobile();

  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const liked = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      category: product.category,
      categoryAr: product.categoryAr,
    });
    toast.success(t('تمت الإضافة للسلة', 'Added to cart'));
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(product.id);
    if (!liked) {
      toast.success(t('تمت الإضافة للمفضلة', 'Added to wishlist'));
    }
  };

  const viewportConfig = isMobile ? undefined : { once: true };
  const initialState = isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };

  return (
    <motion.div
      initial={initialState}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportConfig}
      transition={{ delay: isMobile ? 0 : index * 0.1, duration: 0.5 }}
      className="group h-full flex flex-col"
    >
      <div className="relative flex flex-col h-full">
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden bg-sand flex-shrink-0 rounded-sm sm:rounded-md">
          <Link to={`/product/${product.id}`} className="block w-full h-full">
            <img
              src={optimizeUnsplashUrl(product.image, 400, 80)}
              srcSet={generateSrcSet(product.image, [280, 400, 600])}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              alt={language === 'ar' ? product.nameAr : product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              width="280"
              height="373"
            />
          </Link>

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500 pointer-events-none" />

          {/* Wishlist button - always visible */}
          <button
            onClick={handleToggleWishlist}
            className={`absolute top-2 sm:top-3 end-2 sm:end-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
              liked
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-white/90 backdrop-blur-sm text-foreground/50 hover:text-red-500 shadow-sm'
            }`}
          >
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill={liked ? 'currentColor' : 'none'} strokeWidth={1.5} />
          </button>

          {/* Badges - Top Left */}
          <div className="absolute top-2 sm:top-3 start-2 sm:start-3 flex flex-col gap-1.5 sm:gap-2">
            {product.isBestseller && (
              <span className="badge-bestseller text-[9px] sm:text-xs px-1.5 sm:px-3 py-0.5 sm:py-1">
                {t('الأكثر مبيعاً', 'BESTSELLER')}
              </span>
            )}
            {product.isNew && (
              <span className="badge-new text-[9px] sm:text-xs px-1.5 sm:px-3 py-0.5 sm:py-1">
                {t('جديد', 'NEW')}
              </span>
            )}
            {product.isExpress && (
              <span className="badge-express text-[9px] sm:text-xs px-1.5 sm:px-3 py-0.5 sm:py-1 flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {t('سريع', 'EXPRESS')}
              </span>
            )}
            {discount > 0 && (
              <span className="bg-charcoal text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-xs tracking-wider">
                -{discount}%
              </span>
            )}
          </div>

          {/* Add to Cart - desktop hover */}
          <div className="hidden sm:flex absolute bottom-0 inset-x-0 p-3 md:p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-white/95 backdrop-blur-sm text-charcoal py-2.5 md:py-3 text-[10px] md:text-xs tracking-wider uppercase hover:bg-charcoal hover:text-white transition-all flex items-center justify-center gap-1.5 md:gap-2 rounded-sm"
            >
              <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4" />
              {t('أضف للسلة', 'Add to Cart')}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="pt-3 sm:pt-4 flex flex-col flex-grow min-h-[80px] sm:min-h-[100px]">
          <p className="text-[10px] sm:text-xs tracking-wider text-muted-foreground uppercase mb-0.5 sm:mb-1">
            {language === 'ar' ? product.categoryAr : product.category}
          </p>
          <Link to={`/product/${product.id}`} className="flex-grow">
            <h3 className="font-medium text-sm sm:text-base text-foreground hover:text-muted-foreground transition-colors line-clamp-2 leading-tight min-h-[2rem] sm:min-h-[2.5rem]">
              {language === 'ar' ? product.nameAr : product.name}
            </h3>
          </Link>
          <div className="flex items-center justify-between gap-2 mt-auto pt-1.5 sm:pt-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-foreground font-medium text-sm sm:text-base">
                {product.price} {t('ر.س', 'SAR')}
              </span>
              {product.originalPrice && (
                <span className="text-muted-foreground line-through text-xs sm:text-sm">
                  {product.originalPrice} {t('ر.س', 'SAR')}
                </span>
              )}
            </div>

            {/* Mobile add to cart button - always visible */}
            <button
              onClick={handleAddToCart}
              className="sm:hidden w-8 h-8 rounded-full bg-charcoal text-white flex items-center justify-center active:scale-95 transition-transform"
              aria-label={t('أضف للسلة', 'Add to Cart')}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;

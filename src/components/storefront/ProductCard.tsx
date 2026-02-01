import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { optimizeUnsplashUrl, generateSrcSet } from '@/lib/imageUtils';

// Simplified product interface for the card (compatible with CartProduct)
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
  const isMobile = useIsMobile();

  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  // On mobile, load immediately without scroll-triggered animations
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
        {/* Image Container - Fixed aspect ratio */}
        <div className="relative aspect-[3/4] overflow-hidden bg-sand flex-shrink-0 rounded-sm sm:rounded-md">
          <Link to={`/product/${product.id}`} className="block w-full h-full">
            <img
              src={optimizeUnsplashUrl(product.image, 400, 80)}
              srcSet={generateSrcSet(product.image, [280, 400, 600])}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              alt={language === 'ar' ? product.nameAr : product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
          </Link>

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500 pointer-events-none" />

          {/* Badges - Top */}
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
              <span className="badge-express text-[9px] sm:text-xs px-1.5 sm:px-3 py-0.5 sm:py-1">
                {t('سريع', 'EXPRESS')}
              </span>
            )}
          </div>

          {/* Discount badge */}
          {discount > 0 && (
            <span className="absolute top-2 sm:top-3 end-2 sm:end-3 bg-charcoal text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-xs tracking-wider">
              -{discount}%
            </span>
          )}

          {/* Quick actions on hover - Hidden on mobile */}
          <div className="hidden sm:flex absolute bottom-0 inset-x-0 p-3 md:p-4 gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
            <button
              onClick={() => addItem({
                id: product.id,
                name: product.name,
                nameAr: product.nameAr,
                price: product.price,
                originalPrice: product.originalPrice,
                image: product.image,
                category: product.category,
                categoryAr: product.categoryAr,
              })}
              className="flex-1 bg-white/95 backdrop-blur-sm text-charcoal py-2.5 md:py-3 text-[10px] md:text-xs tracking-wider uppercase hover:bg-charcoal hover:text-white transition-all flex items-center justify-center gap-1.5 md:gap-2"
            >
              <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4" />
              {t('أضف للسلة', 'Add to Cart')}
            </button>
            <button className="w-10 h-10 md:w-12 md:h-12 bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-charcoal hover:text-white transition-all">
              <Heart className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
        </div>

        {/* Content - Fixed height for consistency */}
        <div className="pt-3 sm:pt-4 flex flex-col flex-grow min-h-[80px] sm:min-h-[100px]">
          <p className="text-[10px] sm:text-xs tracking-wider text-muted-foreground uppercase mb-0.5 sm:mb-1">
            {language === 'ar' ? product.categoryAr : product.category}
          </p>
          <Link to={`/product/${product.id}`} className="flex-grow">
            <h3 className="font-medium text-sm sm:text-base text-foreground hover:text-muted-foreground transition-colors line-clamp-2 leading-tight min-h-[2rem] sm:min-h-[2.5rem]">
              {language === 'ar' ? product.nameAr : product.name}
            </h3>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 mt-auto pt-1.5 sm:pt-2">
            <span className="text-foreground font-medium text-sm sm:text-base">
              {product.price} {t('ر.س', 'SAR')}
            </span>
            {product.originalPrice && (
              <span className="text-muted-foreground line-through text-xs sm:text-sm">
                {product.originalPrice} {t('ر.س', 'SAR')}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;

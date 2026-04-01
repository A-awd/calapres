import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, Truck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { optimizeUnsplashUrl, generateSrcSet } from '@/lib/imageUtils';
import { toast } from 'sonner';

interface ProductCardData {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number | null;
  image?: string | null;
  category?: string | null;
  categoryAr?: string | null;
  isBestseller?: boolean;
  isNew?: boolean;
  isExpress?: boolean;
}

interface ProductCardProps {
  product: ProductCardData;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { t, language } = useLanguage();
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();

  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const liked = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ id: product.id, name: product.name, nameAr: product.nameAr, price: product.price, originalPrice: product.originalPrice, image: product.image, category: product.category, categoryAr: product.categoryAr });
    toast.success(t('تمت الإضافة للسلة', 'Added to cart'));
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(product.id);
  };

  return (
    <div className="group h-full flex flex-col">
      <div className="relative flex flex-col h-full">
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-sand flex-shrink-0 rounded-md">
          <Link to={`/product/${product.id}`} className="block w-full h-full">
            <img
              src={optimizeUnsplashUrl(product.image, 400, 75)}
              srcSet={generateSrcSet(product.image, [280, 400])}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              alt={language === 'ar' ? product.nameAr : product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              width="280"
              height="373"
            />
          </Link>

          {/* Wishlist */}
          <button onClick={handleToggleWishlist} className={`absolute top-2 end-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${liked ? 'bg-red-500 text-white' : 'bg-white/80 text-foreground/40 hover:text-red-500'}`}>
            <Heart className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} strokeWidth={1.5} />
          </button>

          {/* Badges */}
          <div className="absolute top-2 start-2 flex flex-col gap-1">
            {product.isNew && <span className="bg-foreground text-background px-2 py-0.5 text-[9px] tracking-wider uppercase">{t('جديد', 'NEW')}</span>}
            {product.isBestseller && <span className="bg-gold/20 text-gold-light border border-gold/30 px-2 py-0.5 text-[9px] tracking-wider uppercase" style={{color:'hsl(38 60% 40%)'}}>{t('الأكثر مبيعاً', 'BEST')}</span>}
            {product.isExpress && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[9px] tracking-wider uppercase flex items-center gap-0.5"><Truck className="w-2.5 h-2.5" />{t('سريع', 'EXPRESS')}</span>}
            {discount > 0 && <span className="bg-charcoal text-white px-2 py-0.5 text-[9px]">-{discount}%</span>}
          </div>

          {/* Desktop Add to Cart */}
          <div className="hidden sm:flex absolute bottom-0 inset-x-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button onClick={handleAddToCart} className="flex-1 bg-white/95 text-charcoal py-2.5 text-[10px] tracking-wider uppercase hover:bg-charcoal hover:text-white transition-colors flex items-center justify-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />{t('أضف للسلة', 'Add to Cart')}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="pt-3 flex flex-col flex-grow">
          <p className="text-[10px] tracking-wider text-muted-foreground uppercase mb-0.5">{language === 'ar' ? product.categoryAr : product.category}</p>
          <Link to={`/product/${product.id}`} className="flex-grow">
            <h3 className="font-medium text-sm text-foreground hover:text-muted-foreground transition-colors line-clamp-2 leading-tight">{language === 'ar' ? product.nameAr : product.name}</h3>
          </Link>
          <div className="flex items-center justify-between mt-auto pt-1.5">
            <div className="flex items-center gap-2">
              <span className="text-foreground font-medium text-sm">{product.price} {t('ر.س', 'SAR')}</span>
              {product.originalPrice && <span className="text-muted-foreground line-through text-xs">{product.originalPrice}</span>}
            </div>
            <button onClick={handleAddToCart} className="sm:hidden w-7 h-7 rounded-full bg-charcoal text-white flex items-center justify-center">
              <ShoppingBag className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

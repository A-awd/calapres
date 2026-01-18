import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  product: Product;
  index?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0 }) => {
  const { t } = useLanguage();
  const { addItem } = useCart();

  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="group"
    >
      <div className="card-luxury rounded-2xl overflow-hidden card-hover">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden">
          <Link to={`/product/${product.id}`}>
            <img
              src={product.image}
              alt={t(product.nameAr, product.name)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </Link>

          {/* Badges */}
          <div className="absolute top-3 start-3 flex flex-col gap-2">
            {product.isBestseller && (
              <span className="badge-bestseller">
                {t('الأكثر مبيعاً', 'Bestseller')}
              </span>
            )}
            {product.isNew && (
              <span className="badge-new">
                {t('جديد', 'New')}
              </span>
            )}
            {product.isExpress && (
              <span className="badge-express">
                {t('سريع', 'Express')}
              </span>
            )}
            {discount > 0 && (
              <span className="price-discount">
                -{discount}%
              </span>
            )}
          </div>

          {/* Quick actions */}
          <div className="absolute top-3 end-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="w-10 h-10 bg-background/90 rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors shadow-soft">
              <Heart className="w-5 h-5" />
            </button>
          </div>

          {/* Add to cart overlay */}
          <div className="absolute bottom-0 start-0 end-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <Button
              onClick={() => addItem(product)}
              className="w-full gap-2"
              size="lg"
            >
              <ShoppingBag className="w-5 h-5" />
              {t('أضف للسلة', 'Add to Cart')}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-1">
            {t(product.categoryAr, product.category)}
          </p>
          <Link to={`/product/${product.id}`}>
            <h3 className="font-semibold text-foreground mb-2 hover:text-primary transition-colors line-clamp-2">
              {t(product.nameAr, product.name)}
            </h3>
          </Link>
          <div className="flex items-center gap-2">
            <span className="price-current">
              {product.price} {t('ر.س', 'SAR')}
            </span>
            {product.originalPrice && (
              <span className="price-original">
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

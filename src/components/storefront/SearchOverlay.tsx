import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Search, Loader2, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSearch, useDebouncedSearch, useSearchSuggestions } from '@/hooks/useSearch';
import { optimizeUnsplashUrl } from '@/lib/imageUtils';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const { searchTerm, setSearchTerm, debouncedTerm, clearSearch, isTyping } = useDebouncedSearch(300);
  const { data: results = [], isLoading } = useSearch(debouncedTerm, isOpen);
  const { data: suggestions = [] } = useSearchSuggestions();

  const handleClose = () => {
    clearSearch();
    onClose();
  };

  const hasQuery = debouncedTerm.trim().length >= 2;
  const showSuggestions = !hasQuery && suggestions.length > 0;
  const showResults = hasQuery && !isLoading && results.length > 0;
  const showNoResults = hasQuery && !isLoading && !isTyping && results.length === 0;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/97 backdrop-blur-xl z-50 overflow-y-auto"
      onClick={handleClose}
    >
      <div className="min-h-full flex flex-col items-center pt-[12vh] pb-8 px-4" onClick={(e) => e.stopPropagation()}>
        {/* Search Input */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="w-full max-w-xl"
        >
          <div className="relative">
            <Search className="absolute start-0 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('ابحث عن ورد، شوكولاتة، هدايا...', 'Search flowers, chocolates, gifts...')}
              className="w-full ps-8 pe-8 py-3 bg-transparent border-b-2 border-foreground/15 focus:border-gold text-lg font-display tracking-wide focus:outline-none transition-colors placeholder:text-foreground/25"
              autoFocus
            />
            {(isLoading || isTyping) && hasQuery && (
              <Loader2 className="absolute end-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gold animate-spin" />
            )}
          </div>
        </motion.div>

        {/* Suggestions (when no query) */}
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full max-w-xl mt-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-gold" />
              <span className="text-xs tracking-wider uppercase text-foreground/40">
                {t('الأكثر بحثاً', 'Trending')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setSearchTerm(language === 'ar' ? item.name_ar : item.name)}
                  className="px-4 py-2 bg-sand rounded-full text-sm text-foreground/70 hover:bg-gold/10 hover:text-foreground transition-colors"
                >
                  {language === 'ar' ? item.name_ar : item.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search Results */}
        {showResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-xl mt-6 space-y-1"
          >
            <p className="text-xs text-foreground/40 tracking-wider uppercase mb-4">
              {results.length} {t('نتيجة', 'Results')}
            </p>
            {results.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                onClick={handleClose}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-sand/60 transition-colors group"
              >
                {/* Product Image */}
                <div className="w-14 h-14 rounded-md overflow-hidden bg-sand flex-shrink-0">
                  {product.image && (
                    <img
                      src={optimizeUnsplashUrl(product.image, 80, 80)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-gold transition-colors">
                    {language === 'ar' ? product.name_ar : product.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {product.category && (language === 'ar' ? product.category.name_ar : product.category.name)}
                  </p>
                </div>

                {/* Price */}
                <div className="text-end flex-shrink-0">
                  <p className="text-sm font-medium">
                    {product.price} {t('ر.س', 'SAR')}
                  </p>
                  {product.original_price && product.original_price > product.price && (
                    <p className="text-xs text-muted-foreground line-through">
                      {product.original_price} {t('ر.س', 'SAR')}
                    </p>
                  )}
                </div>
              </Link>
            ))}

            {/* View all link */}
            <Link
              to={`/collections?search=${encodeURIComponent(debouncedTerm)}`}
              onClick={handleClose}
              className="block text-center py-3 mt-2 text-sm text-gold hover:text-gold/80 tracking-wider transition-colors"
            >
              {t('عرض جميع النتائج', 'View all results')} →
            </Link>
          </motion.div>
        )}

        {/* No Results */}
        {showNoResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-xl mt-12 text-center"
          >
            <Search className="w-10 h-10 text-foreground/15 mx-auto mb-4" />
            <p className="text-foreground/50 text-sm">
              {t('لم نجد نتائج لـ', 'No results found for')} "{debouncedTerm}"
            </p>
            <p className="text-foreground/30 text-xs mt-2">
              {t('جرب كلمات مختلفة أو تصفح مجموعاتنا', 'Try different keywords or browse our collections')}
            </p>
          </motion.div>
        )}

        {/* ESC hint */}
        <p className="text-[10px] text-foreground/20 mt-8 tracking-[0.2em] uppercase">
          {t('Esc للإغلاق', 'Esc to close')}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-5 end-5 p-2 text-foreground/30 hover:text-foreground transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" strokeWidth={1.5} />
      </button>
    </motion.div>
  );
};

export default SearchOverlay;

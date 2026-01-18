import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import ProductCard from '@/components/storefront/ProductCard';
import WhatsAppButton from '@/components/storefront/WhatsAppButton';
import { products, categories, occasions } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';

const Collections: React.FC = () => {
  const { t, language, direction } = useLanguage();
  const { categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categorySlug ? [categorySlug] : []
  );
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1500]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Filter sections open state
  const [openSections, setOpenSections] = useState({
    categories: true,
    occasions: true,
    price: true,
  });

  // Get min and max prices from products
  const priceStats = useMemo(() => {
    const prices = products.map(p => p.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, []);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.nameAr.includes(searchQuery) ||
          p.category.toLowerCase().includes(query) ||
          p.categoryAr.includes(searchQuery)
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      result = result.filter(p => {
        const category = categories.find(c => c.slug === selectedCategories.find(sc => sc === c.slug));
        return category && (p.category === category.name || p.categoryAr === category.nameAr);
      });
    }

    // Occasion filter
    if (selectedOccasions.length > 0) {
      result = result.filter(p => {
        if (!p.occasion) return false;
        const occasion = occasions.find(o => selectedOccasions.includes(o.slug));
        return occasion && (p.occasion === occasion.name || p.occasionAr === occasion.nameAr);
      });
    }

    // Price filter
    result = result.filter(
      p => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    // Sort
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        result.sort((a, b) =>
          language === 'ar'
            ? a.nameAr.localeCompare(b.nameAr, 'ar')
            : a.name.localeCompare(b.name)
        );
        break;
      case 'name-desc':
        result.sort((a, b) =>
          language === 'ar'
            ? b.nameAr.localeCompare(a.nameAr, 'ar')
            : b.name.localeCompare(a.name)
        );
        break;
      case 'newest':
      default:
        result.sort((a, b) => 
          new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        );
    }

    return result;
  }, [searchQuery, selectedCategories, selectedOccasions, priceRange, sortBy, language]);

  const handleCategoryToggle = (slug: string) => {
    setSelectedCategories(prev =>
      prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug]
    );
  };

  const handleOccasionToggle = (slug: string) => {
    setSelectedOccasions(prev =>
      prev.includes(slug) ? prev.filter(o => o !== slug) : [...prev, slug]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedOccasions([]);
    setPriceRange([priceStats.min, priceStats.max]);
    setSortBy('newest');
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCategories.length > 0 ||
    selectedOccasions.length > 0 ||
    priceRange[0] > priceStats.min ||
    priceRange[1] < priceStats.max;

  // Filter sidebar content
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t('البحث في المنتجات...', 'Search products...')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="ps-10 border-border/50 focus:border-gold"
        />
      </div>

      {/* Categories */}
      <Collapsible
        open={openSections.categories}
        onOpenChange={open => setOpenSections(prev => ({ ...prev, categories: open }))}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-b border-border/50">
          <span className="text-sm font-medium tracking-wide uppercase">
            {t('التصنيفات', 'Categories')}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${openSections.categories ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-3">
          {categories.map(category => (
            <label
              key={category.id}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                checked={selectedCategories.includes(category.slug)}
                onCheckedChange={() => handleCategoryToggle(category.slug)}
                className="border-border data-[state=checked]:bg-charcoal data-[state=checked]:border-charcoal"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {language === 'ar' ? category.nameAr : category.name}
              </span>
              <span className="text-xs text-muted-foreground/60 ms-auto">
                ({category.productCount})
              </span>
            </label>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Occasions */}
      <Collapsible
        open={openSections.occasions}
        onOpenChange={open => setOpenSections(prev => ({ ...prev, occasions: open }))}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-b border-border/50">
          <span className="text-sm font-medium tracking-wide uppercase">
            {t('المناسبات', 'Occasions')}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${openSections.occasions ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-3">
          {occasions.map(occasion => (
            <label
              key={occasion.id}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                checked={selectedOccasions.includes(occasion.slug)}
                onCheckedChange={() => handleOccasionToggle(occasion.slug)}
                className="border-border data-[state=checked]:bg-charcoal data-[state=checked]:border-charcoal"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {language === 'ar' ? occasion.nameAr : occasion.name}
              </span>
            </label>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Price Range */}
      <Collapsible
        open={openSections.price}
        onOpenChange={open => setOpenSections(prev => ({ ...prev, price: open }))}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-b border-border/50">
          <span className="text-sm font-medium tracking-wide uppercase">
            {t('نطاق السعر', 'Price Range')}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${openSections.price ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-6 px-1">
          <Slider
            value={priceRange}
            onValueChange={value => setPriceRange(value as [number, number])}
            min={priceStats.min}
            max={priceStats.max}
            step={10}
            className="mb-4"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {priceRange[0]} {t('ر.س', 'SAR')}
            </span>
            <span>
              {priceRange[1]} {t('ر.س', 'SAR')}
            </span>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          onClick={clearFilters}
          className="w-full border-charcoal text-charcoal hover:bg-charcoal hover:text-white"
        >
          {t('مسح الفلاتر', 'Clear Filters')}
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />

      {/* Hero Banner */}
      <section className="bg-sand py-16 md:py-24">
        <div className="container-luxury text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block text-xs tracking-luxury text-gold uppercase mb-4"
          >
            {t('اكتشف مجموعتنا', 'DISCOVER OUR COLLECTION')}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl font-medium text-foreground mb-4"
          >
            {categorySlug
              ? categories.find(c => c.slug === categorySlug)?.[language === 'ar' ? 'nameAr' : 'name'] ||
                t('المنتجات', 'Products')
              : t('جميع المنتجات', 'All Products')}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.2 }}
            className="divider-elegant mx-auto"
          />
        </div>
      </section>

      <main className="container-luxury py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <FilterContent />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-border/50">
              <div className="flex items-center gap-4">
                {/* Mobile Filter Button */}
                <Sheet open={showFilters} onOpenChange={setShowFilters}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="lg:hidden border-charcoal text-charcoal"
                    >
                      <SlidersHorizontal className="w-4 h-4 me-2" />
                      {t('الفلاتر', 'Filters')}
                      {hasActiveFilters && (
                        <span className="ms-2 w-5 h-5 rounded-full bg-gold text-white text-xs flex items-center justify-center">
                          {selectedCategories.length + selectedOccasions.length}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side={direction === 'rtl' ? 'right' : 'left'} className="w-80">
                    <SheetHeader>
                      <SheetTitle>{t('الفلاتر', 'Filters')}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Results count */}
                <span className="text-sm text-muted-foreground">
                  {filteredProducts.length} {t('منتج', 'Products')}
                </span>
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={value => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-48 border-border/50">
                  <SelectValue placeholder={t('ترتيب حسب', 'Sort by')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('الأحدث', 'Newest')}</SelectItem>
                  <SelectItem value="price-asc">
                    {t('السعر: من الأقل للأعلى', 'Price: Low to High')}
                  </SelectItem>
                  <SelectItem value="price-desc">
                    {t('السعر: من الأعلى للأقل', 'Price: High to Low')}
                  </SelectItem>
                  <SelectItem value="name-asc">
                    {t('الاسم: أ - ي', 'Name: A - Z')}
                  </SelectItem>
                  <SelectItem value="name-desc">
                    {t('الاسم: ي - أ', 'Name: Z - A')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters */}
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2 mb-6"
                >
                  {selectedCategories.map(slug => {
                    const category = categories.find(c => c.slug === slug);
                    return category ? (
                      <span
                        key={slug}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-sand text-sm rounded-full"
                      >
                        {language === 'ar' ? category.nameAr : category.name}
                        <button
                          onClick={() => handleCategoryToggle(slug)}
                          className="hover:text-gold transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                  {selectedOccasions.map(slug => {
                    const occasion = occasions.find(o => o.slug === slug);
                    return occasion ? (
                      <span
                        key={slug}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-sand text-sm rounded-full"
                      >
                        {language === 'ar' ? occasion.nameAr : occasion.name}
                        <button
                          onClick={() => handleOccasionToggle(slug)}
                          className="hover:text-gold transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                  {(priceRange[0] > priceStats.min || priceRange[1] < priceStats.max) && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-sand text-sm rounded-full">
                      {priceRange[0]} - {priceRange[1]} {t('ر.س', 'SAR')}
                      <button
                        onClick={() => setPriceRange([priceStats.min, priceStats.max])}
                        className="hover:text-gold transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg mb-4">
                  {t('لا توجد منتجات مطابقة للبحث', 'No products match your search')}
                </p>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="border-charcoal text-charcoal hover:bg-charcoal hover:text-white"
                >
                  {t('مسح الفلاتر', 'Clear Filters')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Collections;

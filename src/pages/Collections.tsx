import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, Search, Clock, TrendingUp, Zap, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/storefront/Header';
import Footer from '@/components/storefront/Footer';
import ProductCard from '@/components/storefront/ProductCard';
import WhatsAppButton from '@/components/storefront/WhatsAppButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
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
import {
  useAllProducts,
  useStorefrontCategories,
  useStorefrontOccasions,
} from '@/hooks/useStorefrontData';
import { Skeleton } from '@/components/ui/skeleton';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'most-ordered';
type QuickFilter = 'last-minute' | 'most-ordered' | 'express' | 'new' | null;

const Collections: React.FC = () => {
  const { t, language, direction } = useLanguage();
  const { categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get initial values from URL
  const initialFilter = searchParams.get('filter') as QuickFilter;
  const initialMinPrice = searchParams.get('minPrice');
  const initialMaxPrice = searchParams.get('maxPrice');
  const initialOccasion = searchParams.get('occasion');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categorySlug ? [categorySlug] : []
  );
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(
    initialOccasion ? [initialOccasion] : []
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([
    initialMinPrice ? parseInt(initialMinPrice) : 0,
    initialMaxPrice ? parseInt(initialMaxPrice) : 2000,
  ]);
  const [sortBy, setSortBy] = useState<SortOption>(
    initialFilter === 'most-ordered' ? 'most-ordered' : 'newest'
  );
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(initialFilter);
  const [showFilters, setShowFilters] = useState(false);

  // Filter sections open state
  const [openSections, setOpenSections] = useState({
    quick: true,
    categories: true,
    occasions: true,
    price: true,
  });

  // Fetch data from database
  const { data: products = [], isLoading: productsLoading } = useAllProducts();
  const { data: categories = [], isLoading: categoriesLoading } = useStorefrontCategories();
  const { data: occasions = [], isLoading: occasionsLoading } = useStorefrontOccasions();

  const isLoading = productsLoading || categoriesLoading || occasionsLoading;

  // Get min and max prices from products
  const priceStats = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 2000 };
    const prices = products.map(p => p.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [products]);

  // Update price range when stats are available
  useEffect(() => {
    if (!initialMinPrice && !initialMaxPrice && priceStats.max > 0) {
      setPriceRange([priceStats.min, priceStats.max]);
    }
  }, [priceStats, initialMinPrice, initialMaxPrice]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Quick filter
    if (quickFilter) {
      switch (quickFilter) {
        case 'last-minute':
          result = result.filter(p => p.isLastMinute || p.isExpress);
          break;
        case 'most-ordered':
          result = result.filter(p => (p.orderCount || 0) > 0);
          break;
        case 'express':
          result = result.filter(p => p.isExpress);
          break;
        case 'new':
          result = result.filter(p => p.isNew);
          break;
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.nameAr.includes(searchQuery) ||
          (p.category && p.category.toLowerCase().includes(query)) ||
          (p.categoryAr && p.categoryAr.includes(searchQuery))
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      result = result.filter(p => {
        const category = categories.find(c => selectedCategories.includes(c.slug));
        return category && (p.category === category.name || p.categoryAr === category.nameAr);
      });
    }

    // Occasion filter
    if (selectedOccasions.length > 0) {
      // For now, filter by category matching occasion name
      result = result.filter(p => {
        const occasion = occasions.find(o => selectedOccasions.includes(o.slug));
        return occasion;
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
      case 'most-ordered':
        result.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
        break;
      case 'newest':
      default:
        // Already sorted by created_at desc from API
        break;
    }

    return result;
  }, [searchQuery, selectedCategories, selectedOccasions, priceRange, sortBy, quickFilter, products, categories, occasions, language]);

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

  const handleQuickFilterToggle = (filter: QuickFilter) => {
    setQuickFilter(prev => prev === filter ? null : filter);
    if (filter === 'most-ordered') {
      setSortBy('most-ordered');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedOccasions([]);
    setPriceRange([priceStats.min, priceStats.max]);
    setSortBy('newest');
    setQuickFilter(null);
    setSearchParams({});
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCategories.length > 0 ||
    selectedOccasions.length > 0 ||
    priceRange[0] > priceStats.min ||
    priceRange[1] < priceStats.max ||
    quickFilter !== null;

  // Quick filter badges
  const quickFilters = [
    { id: 'last-minute' as const, icon: <Clock className="w-3.5 h-3.5" />, label: t('آخر لحظة', 'Last Minute') },
    { id: 'most-ordered' as const, icon: <TrendingUp className="w-3.5 h-3.5" />, label: t('الأكثر طلباً', 'Most Ordered') },
    { id: 'express' as const, icon: <Zap className="w-3.5 h-3.5" />, label: t('توصيل سريع', 'Express') },
    { id: 'new' as const, icon: <Sparkles className="w-3.5 h-3.5" />, label: t('جديد', 'New') },
  ];

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

      {/* Quick Filters */}
      <Collapsible
        open={openSections.quick}
        onOpenChange={open => setOpenSections(prev => ({ ...prev, quick: open }))}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-b border-border/50">
          <span className="text-sm font-medium tracking-wide uppercase">
            {t('فلاتر سريعة', 'Quick Filters')}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${openSections.quick ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            {quickFilters.map(filter => (
              <Badge
                key={filter.id}
                variant={quickFilter === filter.id ? 'default' : 'outline'}
                className={`cursor-pointer flex items-center gap-1.5 py-1.5 px-3 ${
                  quickFilter === filter.id 
                    ? 'bg-gold text-white border-gold' 
                    : 'hover:bg-gold/10 hover:border-gold'
                }`}
                onClick={() => handleQuickFilterToggle(filter.id)}
              >
                {filter.icon}
                {filter.label}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

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
        <CollapsibleContent className="pt-4 space-y-3 max-h-48 overflow-y-auto">
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
        <CollapsibleContent className="pt-4 space-y-3 max-h-48 overflow-y-auto">
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
              <span className="text-lg me-1">{occasion.icon}</span>
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

  // Get page title
  const getPageTitle = () => {
    if (quickFilter) {
      switch (quickFilter) {
        case 'last-minute': return t('هدايا آخر لحظة', 'Last Minute Gifts');
        case 'most-ordered': return t('الأكثر طلباً', 'Most Ordered');
        case 'express': return t('توصيل سريع', 'Express Delivery');
        case 'new': return t('وصل حديثاً', 'New Arrivals');
      }
    }
    if (categorySlug) {
      const category = categories.find(c => c.slug === categorySlug);
      return category ? (language === 'ar' ? category.nameAr : category.name) : t('المنتجات', 'Products');
    }
    return t('جميع المنتجات', 'All Products');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir={direction}>
        <Header />
        <section className="bg-sand py-16 md:py-24">
          <div className="container-luxury text-center">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-12 w-96 mx-auto" />
          </div>
        </section>
        <main className="container-luxury py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4]" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
            {getPageTitle()}
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
                          {selectedCategories.length + selectedOccasions.length + (quickFilter ? 1 : 0)}
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
                  <SelectItem value="most-ordered">{t('الأكثر طلباً', 'Most Ordered')}</SelectItem>
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
                  {quickFilter && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gold/20 text-gold text-sm rounded-full">
                      {quickFilters.find(f => f.id === quickFilter)?.label}
                      <button
                        onClick={() => setQuickFilter(null)}
                        className="hover:text-gold/70 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
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
                        {occasion.icon} {language === 'ar' ? occasion.nameAr : occasion.name}
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
                      transition={{ delay: index * 0.03 }}
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
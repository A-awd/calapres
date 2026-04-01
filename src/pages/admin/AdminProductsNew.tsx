import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, X, Package, SlidersHorizontal } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { useProducts, useDeleteProduct, Product } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import ProductFormDialog from '@/components/admin/ProductFormDialog';
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog';
import BulkActionsBar from '@/components/admin/BulkActionsBar';

interface Filters {
  category: string;
  status: string;
  stockStatus: string;
  priceRange: [number, number];
  flags: string[];
}

const defaultFilters: Filters = {
  category: 'all',
  status: 'all',
  stockStatus: 'all',
  priceRange: [0, 5000],
  flags: [],
};

const AdminProductsNew: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: products = [], isLoading } = useProducts(true);
  const { data: categories = [] } = useCategories();
  const deleteProduct = useDeleteProduct();

  // Calculate price range from products
  const priceRange = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 5000 };
    const prices = products.map(p => p.price);
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory = filters.category === 'all' || product.category_id === filters.category;

      // Status filter
      const matchesStatus = filters.status === 'all' ||
        (filters.status === 'active' && product.is_active) ||
        (filters.status === 'inactive' && !product.is_active);

      // Stock status filter
      const matchesStock = filters.stockStatus === 'all' ||
        (filters.stockStatus === 'in_stock' && product.in_stock && product.stock_count > 5) ||
        (filters.stockStatus === 'low_stock' && product.stock_count > 0 && product.stock_count <= 5) ||
        (filters.stockStatus === 'out_of_stock' && (!product.in_stock || product.stock_count === 0));

      // Price range filter
      const matchesPrice = product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1];

      // Flags filter
      const matchesFlags = filters.flags.length === 0 || filters.flags.every(flag => {
        if (flag === 'bestseller') return product.is_bestseller;
        if (flag === 'new') return product.is_new;
        if (flag === 'express') return product.is_express;
        return true;
      });

      return matchesSearch && matchesCategory && matchesStatus && matchesStock && matchesPrice && matchesFlags;
    });
  }, [products, searchQuery, filters]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.stockStatus !== 'all') count++;
    if (filters.priceRange[0] > priceRange.min || filters.priceRange[1] < priceRange.max) count++;
    count += filters.flags.length;
    return count;
  }, [filters, priceRange]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      await deleteProduct.mutateAsync(productToDelete);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const toggleSelectAll = () => {
    setSelectedProducts(
      selectedProducts.length === filteredProducts.length ? [] : filteredProducts.map(p => p.id)
    );
  };

  const toggleFlag = (flag: string) => {
    setFilters(prev => ({
      ...prev,
      flags: prev.flags.includes(flag)
        ? prev.flags.filter(f => f !== flag)
        : [...prev.flags, flag]
    }));
  };

  const resetFilters = () => {
    setFilters({ ...defaultFilters, priceRange: [priceRange.min, priceRange.max] });
  };

  const FilterContent = () => (
    <div className="space-y-6" dir="rtl">
      {/* Category Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">الفئة</Label>
        <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue placeholder="جميع الفئات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفئات</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name_ar}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">الحالة</Label>
        <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">مخفي</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stock Status Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">حالة المخزون</Label>
        <Select value={filters.stockStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, stockStatus: value }))}>
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="in_stock">متوفر</SelectItem>
            <SelectItem value="low_stock">مخزون منخفض</SelectItem>
            <SelectItem value="out_of_stock">نفد المخزون</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">نطاق السعر</Label>
          <span className="text-sm text-gray-500">
            {filters.priceRange[0]} - {filters.priceRange[1]} ر.س
          </span>
        </div>
        <Slider
          value={filters.priceRange}
          min={priceRange.min}
          max={priceRange.max}
          step={10}
          onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value as [number, number] }))}
          className="w-full"
        />
        <div className="flex gap-2">
          <Input
            type="number"
            value={filters.priceRange[0]}
            onChange={(e) => setFilters(prev => ({ ...prev, priceRange: [Number(e.target.value), prev.priceRange[1]] }))}
            className="rounded-xl text-center"
            placeholder="من"
          />
          <Input
            type="number"
            value={filters.priceRange[1]}
            onChange={(e) => setFilters(prev => ({ ...prev, priceRange: [prev.priceRange[0], Number(e.target.value)] }))}
            className="rounded-xl text-center"
            placeholder="إلى"
          />
        </div>
      </div>

      {/* Flags Filter */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">العلامات</Label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toggleFlag('bestseller')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filters.flags.includes('bestseller')
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            الأكثر مبيعاً
          </button>
          <button
            onClick={() => toggleFlag('new')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filters.flags.includes('new')
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            جديد
          </button>
          <button
            onClick={() => toggleFlag('express')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filters.flags.includes('express')
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            توصيل سريع
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout title="المنتجات">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 mb-6" dir="rtl">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="البحث بالاسم أو رمز المنتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 bg-gray-50 border-gray-200 rounded-xl h-11"
              />
            </div>
            
            {/* Filter Button - Mobile */}
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden gap-2 h-11 rounded-xl border-gray-200 relative">
                  <SlidersHorizontal className="w-4 h-4" />
                  تصفية
                  {activeFiltersCount > 0 && (
                    <Badge className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center bg-[hsl(var(--admin-primary))]">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="text-right">تصفية المنتجات</SheetTitle>
                </SheetHeader>
                <div className="py-6">
                  <FilterContent />
                </div>
                <SheetFooter className="flex gap-2">
                  <Button variant="outline" onClick={resetFilters} className="flex-1 rounded-xl">
                    إعادة تعيين
                  </Button>
                  <Button onClick={() => setFiltersOpen(false)} className="flex-1 rounded-xl bg-[hsl(var(--admin-primary))]">
                    تطبيق
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
          
          <Button 
            className="gap-2 h-11 rounded-xl bg-[hsl(var(--admin-primary))] hover:bg-[hsl(var(--admin-primary))]/90" 
            onClick={() => { setEditingProduct(null); setFormOpen(true); }}
          >
            <Plus className="w-4 h-4" />
            إضافة منتج
          </Button>
        </div>

        {/* Active Filters Tags */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">الفلاتر النشطة:</span>
            {filters.category !== 'all' && (
              <Badge variant="secondary" className="gap-1 rounded-full">
                {categories.find(c => c.id === filters.category)?.name_ar}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, category: 'all' }))} />
              </Badge>
            )}
            {filters.status !== 'all' && (
              <Badge variant="secondary" className="gap-1 rounded-full">
                {filters.status === 'active' ? 'نشط' : 'مخفي'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))} />
              </Badge>
            )}
            {filters.stockStatus !== 'all' && (
              <Badge variant="secondary" className="gap-1 rounded-full">
                {filters.stockStatus === 'in_stock' ? 'متوفر' : filters.stockStatus === 'low_stock' ? 'مخزون منخفض' : 'نفد'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, stockStatus: 'all' }))} />
              </Badge>
            )}
            {(filters.priceRange[0] > priceRange.min || filters.priceRange[1] < priceRange.max) && (
              <Badge variant="secondary" className="gap-1 rounded-full">
                {filters.priceRange[0]} - {filters.priceRange[1]} ر.س
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, priceRange: [priceRange.min, priceRange.max] }))} />
              </Badge>
            )}
            {filters.flags.map(flag => (
              <Badge key={flag} variant="secondary" className="gap-1 rounded-full">
                {flag === 'bestseller' ? 'الأكثر مبيعاً' : flag === 'new' ? 'جديد' : 'توصيل سريع'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => toggleFlag(flag)} />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-gray-500 hover:text-gray-700">
              مسح الكل
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Desktop Filters Sidebar */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">تصفية المنتجات</h3>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-gray-500">
                  إعادة تعيين
                </Button>
              )}
            </div>
            <FilterContent />
          </div>
        </div>

        {/* Products Grid/Table */}
        <div className="flex-1 min-w-0">
          {/* Products Count & Select All */}
          <div className="flex items-center justify-between mb-4 bg-white rounded-xl p-3 shadow-sm border border-gray-100" dir="rtl">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <p className="text-sm text-gray-600">
                {selectedProducts.length > 0 ? (
                  <>
                    <span className="font-bold text-[hsl(var(--admin-primary))]">{selectedProducts.length}</span> محدد من <span className="font-bold text-gray-900">{filteredProducts.length}</span> منتج
                  </>
                ) : (
                  <>
                    عرض <span className="font-bold text-gray-900">{filteredProducts.length}</span> من <span className="font-bold text-gray-900">{products.length}</span> منتج
                  </>
                )}
              </p>
              {selectedProducts.length > 0 && selectedProducts.length < filteredProducts.length && (
                <Button variant="link" size="sm" className="text-xs p-0 h-auto text-[hsl(var(--admin-primary))]" onClick={toggleSelectAll}>
                  تحديد الكل ({filteredProducts.length})
                </Button>
              )}
            </div>
            <Select defaultValue="newest">
              <SelectTrigger className="w-36 h-9 rounded-lg border-gray-200 text-sm">
                <SelectValue placeholder="ترتيب حسب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="oldest">الأقدم</SelectItem>
                <SelectItem value="price_high">الأعلى سعراً</SelectItem>
                <SelectItem value="price_low">الأقل سعراً</SelectItem>
                <SelectItem value="name">الاسم</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">جاري تحميل المنتجات...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لم يتم العثور على منتجات</p>
                <p className="text-sm text-gray-400 mt-1">جرب تغيير معايير البحث أو الفلاتر</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" dir="rtl">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-right">
                        <Checkbox
                          checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="p-4 text-right font-semibold text-gray-700">المنتج</th>
                      <th className="p-4 text-right font-semibold text-gray-700">رمز المنتج</th>
                      <th className="p-4 text-right font-semibold text-gray-700">الفئة</th>
                      <th className="p-4 text-right font-semibold text-gray-700">السعر</th>
                      <th className="p-4 text-right font-semibold text-gray-700">المخزون</th>
                      <th className="p-4 text-right font-semibold text-gray-700">الحالة</th>
                      <th className="p-4 text-center font-semibold text-gray-700">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product, index) => (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b border-gray-100 hover:bg-gray-50/50"
                      >
                        <td className="p-4">
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={() => {
                              setSelectedProducts(prev =>
                                prev.includes(product.id)
                                  ? prev.filter(id => id !== product.id)
                                  : [...prev, product.id]
                              );
                            }}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {product.image && (
                              <img src={product.image} alt={product.name} loading="lazy" className="w-12 h-12 object-cover rounded-xl" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{product.name_ar || product.name}</p>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {product.is_bestseller && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">الأكثر مبيعاً</span>}
                                {product.is_new && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">جديد</span>}
                                {product.is_express && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">سريع</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-sm text-gray-600">{product.sku}</td>
                        <td className="p-4 text-gray-600">{product.category?.name_ar || product.category?.name || '-'}</td>
                        <td className="p-4">
                          <div>
                            <p className="font-bold text-gray-900">{product.price} ر.س</p>
                            {product.original_price && (
                              <p className="text-sm text-gray-400 line-through">{product.original_price} ر.س</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            product.stock_count === 0 || !product.in_stock
                              ? 'bg-red-100 text-red-700'
                              : product.stock_count <= 5 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {product.stock_count}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {product.is_active ? 'نشط' : 'مخفي'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(product)}
                              className="h-9 w-9 rounded-xl hover:bg-[hsl(var(--admin-primary))]/10 hover:text-[hsl(var(--admin-primary))]"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDelete(product.id)}
                              className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {isLoading ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm border border-gray-100">
                جاري تحميل المنتجات...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لم يتم العثور على منتجات</p>
              </div>
            ) : (
              filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                  dir="rtl"
                >
                  <div className="flex gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => {
                          setSelectedProducts(prev =>
                            prev.includes(product.id)
                              ? prev.filter(id => id !== product.id)
                              : [...prev, product.id]
                          );
                        }}
                      />
                      {product.image && (
                        <img src={product.image} alt={product.name} loading="lazy" className="w-16 h-16 object-cover rounded-xl" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-medium text-gray-900 line-clamp-1">{product.name_ar || product.name}</h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg -mt-1 -me-1">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem onClick={() => handleEdit(product)} className="rounded-lg">
                              <Edit className="w-4 h-4 ml-2" /> تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 rounded-lg" onClick={() => handleDelete(product.id)}>
                              <Trash2 className="w-4 h-4 ml-2" /> حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{product.sku} • {product.category?.name_ar || '-'}</p>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{product.price} ر.س</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {product.is_active ? 'نشط' : 'مخفي'}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.stock_count === 0 
                            ? 'bg-red-100 text-red-700' 
                            : product.stock_count <= 5 
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          المخزون: {product.stock_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editingProduct} />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="حذف المنتج"
        description="هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء."
        isDeleting={deleteProduct.isPending}
      />
      <BulkActionsBar
        selectedIds={selectedProducts}
        onClearSelection={() => setSelectedProducts([])}
      />
    </AdminLayout>
  );
};

export default AdminProductsNew;
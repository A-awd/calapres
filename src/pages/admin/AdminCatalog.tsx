import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, Edit, Trash2, Image, Package, Gift, FolderOpen, Calendar } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProducts, useDeleteProduct, Product } from '@/hooks/useProducts';
import { useBundles, useDeleteBundle, Bundle } from '@/hooks/useBundles';
import { useCategories, useDeleteCategory, Category } from '@/hooks/useCategories';
import { useOccasions, useDeleteOccasion, Occasion } from '@/hooks/useOccasions';
import ProductFormDialog from '@/components/admin/ProductFormDialog';
import BundleFormDialog from '@/components/admin/BundleFormDialog';
import CategoryFormDialog from '@/components/admin/CategoryFormDialog';
import OccasionFormDialog from '@/components/admin/OccasionFormDialog';
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog';

const AdminCatalog: React.FC = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Products state
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productDeleteOpen, setProductDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  
  // Bundles state
  const [bundleFormOpen, setBundleFormOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [bundleDeleteOpen, setBundleDeleteOpen] = useState(false);
  const [bundleToDelete, setBundleToDelete] = useState<string | null>(null);
  
  // Categories state
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryDeleteOpen, setCategoryDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  
  // Occasions state
  const [occasionFormOpen, setOccasionFormOpen] = useState(false);
  const [editingOccasion, setEditingOccasion] = useState<Occasion | null>(null);
  const [occasionDeleteOpen, setOccasionDeleteOpen] = useState(false);
  const [occasionToDelete, setOccasionToDelete] = useState<string | null>(null);

  // Data hooks
  const { data: products = [], isLoading: productsLoading } = useProducts(true);
  const { data: bundles = [], isLoading: bundlesLoading } = useBundles(true);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(true);
  const { data: occasions = [], isLoading: occasionsLoading } = useOccasions(true);
  
  const deleteProduct = useDeleteProduct();
  const deleteBundle = useDeleteBundle();
  const deleteCategory = useDeleteCategory();
  const deleteOccasion = useDeleteOccasion();

  // Filtered data
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredBundles = bundles.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredOccasions = occasions.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAddNew = () => {
    switch (activeTab) {
      case 'products': setEditingProduct(null); setProductFormOpen(true); break;
      case 'bundles': setEditingBundle(null); setBundleFormOpen(true); break;
      case 'categories': setEditingCategory(null); setCategoryFormOpen(true); break;
      case 'occasions': setEditingOccasion(null); setOccasionFormOpen(true); break;
    }
  };

  const tierColors: Record<string, string> = {
    basic: 'bg-gray-100 text-gray-800',
    premium: 'bg-blue-100 text-blue-800',
    luxury: 'bg-purple-100 text-purple-800',
  };

  const tierLabels: Record<string, string> = {
    basic: 'أساسي',
    premium: 'مميز',
    luxury: 'فاخر',
  };

  const tabLabels = {
    products: { label: 'المنتجات', icon: Package, count: products.length },
    bundles: { label: 'الباقات', icon: Gift, count: bundles.length },
    categories: { label: 'الفئات', icon: FolderOpen, count: categories.length },
    occasions: { label: 'المناسبات', icon: Calendar, count: occasions.length },
  };

  const getAddButtonLabel = () => {
    switch (activeTab) {
      case 'products': return 'إضافة منتج';
      case 'bundles': return 'إضافة باقة';
      case 'categories': return 'إضافة فئة';
      case 'occasions': return 'إضافة مناسبة';
      default: return 'إضافة جديد';
    }
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'products': return 'البحث في المنتجات...';
      case 'bundles': return 'البحث في الباقات...';
      case 'categories': return 'البحث في الفئات...';
      case 'occasions': return 'البحث في المناسبات...';
      default: return 'بحث...';
    }
  };

  return (
    <AdminLayout title="الكتالوج">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between mb-4 lg:mb-6" dir="rtl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={getSearchPlaceholder()}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={handleAddNew}>
          <Plus className="w-4 h-4" />
          <span className="sm:inline">{getAddButtonLabel()}</span>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="w-full grid grid-cols-4 mb-4 lg:mb-6 h-auto">
          {Object.entries(tabLabels).map(([key, { label, icon: Icon, count }]) => (
            <TabsTrigger 
              key={key} 
              value={key} 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5">
                {count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardContent className="p-0">
              {productsLoading ? (
                <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">لم يتم العثور على منتجات</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" dir="rtl">
                    <thead className="bg-secondary/50 hidden md:table-header-group">
                      <tr>
                        <th className="p-3 lg:p-4 text-right font-medium">المنتج</th>
                        <th className="p-3 lg:p-4 text-right font-medium">رمز المنتج</th>
                        <th className="p-3 lg:p-4 text-right font-medium">السعر</th>
                        <th className="p-3 lg:p-4 text-right font-medium">المخزون</th>
                        <th className="p-3 lg:p-4 text-right font-medium">الحالة</th>
                        <th className="p-3 lg:p-4 text-right font-medium">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="border-b border-border hover:bg-secondary/30 block md:table-row mb-4 md:mb-0 p-3 md:p-0">
                          <td className="p-3 lg:p-4 block md:table-cell">
                            <div className="flex items-center gap-3">
                              {product.image && <img src={product.image} alt={product.name} className="w-10 h-10 lg:w-12 lg:h-12 object-cover rounded-lg flex-shrink-0" />}
                              <div className="min-w-0">
                                <p className="font-medium truncate">{product.name}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {product.is_bestseller && <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded">الأكثر مبيعاً</span>}
                                  {product.is_new && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">جديد</span>}
                                  {product.is_express && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">توصيل سريع</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 lg:p-4 block md:table-cell">
                            <span className="md:hidden text-muted-foreground text-xs">رمز المنتج: </span>
                            <span className="font-mono text-xs">{product.sku}</span>
                          </td>
                          <td className="p-3 lg:p-4 block md:table-cell">
                            <span className="md:hidden text-muted-foreground text-xs">السعر: </span>
                            {product.price} ر.س
                          </td>
                          <td className="p-3 lg:p-4 block md:table-cell">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${product.stock_count <= 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {product.stock_count}
                            </span>
                          </td>
                          <td className="p-3 lg:p-4 block md:table-cell">
                            <span className={`px-2 py-1 rounded text-xs ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {product.is_active ? 'نشط' : 'مخفي'}
                            </span>
                          </td>
                          <td className="p-3 lg:p-4 block md:table-cell">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => { setEditingProduct(product); setProductFormOpen(true); }}>
                                  <Edit className="w-4 h-4 ml-2" /> تعديل
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => { setProductToDelete(product.id); setProductDeleteOpen(true); }}>
                                  <Trash2 className="w-4 h-4 ml-2" /> حذف
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bundles Tab */}
        <TabsContent value="bundles">
          <Card>
            <CardContent className="p-0">
              {bundlesLoading ? (
                <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
              ) : filteredBundles.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">لم يتم العثور على باقات</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" dir="rtl">
                    <thead className="bg-secondary/50 hidden md:table-header-group">
                      <tr>
                        <th className="p-3 lg:p-4 text-right font-medium">الباقة</th>
                        <th className="p-3 lg:p-4 text-right font-medium">المناسبة</th>
                        <th className="p-3 lg:p-4 text-right font-medium">المستوى</th>
                        <th className="p-3 lg:p-4 text-right font-medium">السعر</th>
                        <th className="p-3 lg:p-4 text-right font-medium">الحالة</th>
                        <th className="p-3 lg:p-4 text-right font-medium">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBundles.map((bundle) => (
                        <tr key={bundle.id} className="border-b border-border hover:bg-secondary/30 block md:table-row mb-4 md:mb-0 p-3 md:p-0">
                          <td className="p-3 lg:p-4 block md:table-cell">
                            <div className="flex items-center gap-3">
                              {bundle.image && <img src={bundle.image} alt={bundle.name} className="w-10 h-10 lg:w-12 lg:h-12 object-cover rounded-lg flex-shrink-0" />}
                              <div>
                                <p className="font-medium">{bundle.name}</p>
                                {bundle.is_featured && <Badge variant="secondary" className="text-[10px] mt-1">مميز</Badge>}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 lg:p-4 block md:table-cell">{bundle.occasion?.name || '-'}</td>
                          <td className="p-3 lg:p-4 block md:table-cell">
                            {bundle.tier && <span className={`px-2 py-1 rounded text-xs ${tierColors[bundle.tier]}`}>{tierLabels[bundle.tier] || bundle.tier}</span>}
                          </td>
                          <td className="p-3 lg:p-4 block md:table-cell">{bundle.price} ر.س</td>
                          <td className="p-3 lg:p-4 block md:table-cell">
                            <span className={`px-2 py-1 rounded text-xs ${bundle.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {bundle.is_active ? 'نشط' : 'مخفي'}
                            </span>
                          </td>
                          <td className="p-3 lg:p-4 block md:table-cell">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => { setEditingBundle(bundle); setBundleFormOpen(true); }}>
                                  <Edit className="w-4 h-4 ml-2" /> تعديل
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => { setBundleToDelete(bundle.id); setBundleDeleteOpen(true); }}>
                                  <Trash2 className="w-4 h-4 ml-2" /> حذف
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardContent className="p-0">
              {categoriesLoading ? (
                <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
              ) : filteredCategories.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">لم يتم العثور على فئات</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4" dir="rtl">
                  {filteredCategories.map((category) => (
                    <Card key={category.id} className="overflow-hidden">
                      <div className="relative h-32 bg-secondary">
                        {category.image ? (
                          <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="secondary" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => { setEditingCategory(category); setCategoryFormOpen(true); }}>
                                <Edit className="w-4 h-4 ml-2" /> تعديل
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { setCategoryToDelete(category.id); setCategoryDeleteOpen(true); }}>
                                <Trash2 className="w-4 h-4 ml-2" /> حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-sm text-muted-foreground">{category.name_ar}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {category.is_active ? 'نشط' : 'مخفي'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Occasions Tab */}
        <TabsContent value="occasions">
          <Card>
            <CardContent className="p-0">
              {occasionsLoading ? (
                <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
              ) : filteredOccasions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">لم يتم العثور على مناسبات</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4" dir="rtl">
                  {filteredOccasions.map((occasion) => (
                    <Card key={occasion.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {occasion.icon && <span className="text-2xl">{occasion.icon}</span>}
                            <div>
                              <p className="font-medium">{occasion.name}</p>
                              <p className="text-sm text-muted-foreground">{occasion.name_ar}</p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => { setEditingOccasion(occasion); setOccasionFormOpen(true); }}>
                                <Edit className="w-4 h-4 ml-2" /> تعديل
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { setOccasionToDelete(occasion.id); setOccasionDeleteOpen(true); }}>
                                <Trash2 className="w-4 h-4 ml-2" /> حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className={`px-2 py-1 rounded text-xs ${occasion.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {occasion.is_active ? 'نشط' : 'مخفي'}
                          </span>
                          <span className="text-xs text-muted-foreground">ترتيب العرض: {occasion.display_order || 0}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ProductFormDialog open={productFormOpen} onOpenChange={setProductFormOpen} product={editingProduct} />
      <BundleFormDialog open={bundleFormOpen} onOpenChange={setBundleFormOpen} bundle={editingBundle} />
      <CategoryFormDialog open={categoryFormOpen} onOpenChange={setCategoryFormOpen} category={editingCategory} />
      <OccasionFormDialog open={occasionFormOpen} onOpenChange={setOccasionFormOpen} occasion={editingOccasion} />
      
      <DeleteConfirmDialog
        open={productDeleteOpen}
        onOpenChange={setProductDeleteOpen}
        onConfirm={async () => { if (productToDelete) { await deleteProduct.mutateAsync(productToDelete); setProductDeleteOpen(false); } }}
        title="حذف المنتج"
        description="هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء."
        isDeleting={deleteProduct.isPending}
      />
      <DeleteConfirmDialog
        open={bundleDeleteOpen}
        onOpenChange={setBundleDeleteOpen}
        onConfirm={async () => { if (bundleToDelete) { await deleteBundle.mutateAsync(bundleToDelete); setBundleDeleteOpen(false); } }}
        title="حذف الباقة"
        description="هل أنت متأكد من حذف هذه الباقة؟ لا يمكن التراجع عن هذا الإجراء."
        isDeleting={deleteBundle.isPending}
      />
      <DeleteConfirmDialog
        open={categoryDeleteOpen}
        onOpenChange={setCategoryDeleteOpen}
        onConfirm={async () => { if (categoryToDelete) { await deleteCategory.mutateAsync(categoryToDelete); setCategoryDeleteOpen(false); } }}
        title="حذف الفئة"
        description="هل أنت متأكد من حذف هذه الفئة؟ لا يمكن التراجع عن هذا الإجراء."
        isDeleting={deleteCategory.isPending}
      />
      <DeleteConfirmDialog
        open={occasionDeleteOpen}
        onOpenChange={setOccasionDeleteOpen}
        onConfirm={async () => { if (occasionToDelete) { await deleteOccasion.mutateAsync(occasionToDelete); setOccasionDeleteOpen(false); } }}
        title="حذف المناسبة"
        description="هل أنت متأكد من حذف هذه المناسبة؟ لا يمكن التراجع عن هذا الإجراء."
        isDeleting={deleteOccasion.isPending}
      />
    </AdminLayout>
  );
};

export default AdminCatalog;
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
import BulkActionsBar from '@/components/admin/BulkActionsBar';

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
      <div className="flex flex-col sm:flex-row gap-3 justify-between mb-6" dir="rtl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={getSearchPlaceholder()}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 bg-gray-50 border-gray-200 rounded-xl"
          />
        </div>
        <Button className="gap-2 w-full sm:w-auto bg-gray-900 hover:bg-gray-800 rounded-xl" onClick={handleAddNew}>
          <Plus className="w-4 h-4" />
          <span className="sm:inline">{getAddButtonLabel()}</span>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="w-full grid grid-cols-4 mb-6 h-auto bg-gray-100 p-1 rounded-xl">
          {Object.entries(tabLabels).map(([key, { label, icon: Icon, count }]) => (
            <TabsTrigger 
              key={key} 
              value={key} 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 bg-gray-200">
                {count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-0">
              {productsLoading ? (
                <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">لم يتم العثور على منتجات</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" dir="rtl">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="p-4 text-right font-medium text-gray-500">المنتج</th>
                        <th className="p-4 text-right font-medium text-gray-500 hidden md:table-cell">رمز المنتج</th>
                        <th className="p-4 text-right font-medium text-gray-500">السعر</th>
                        <th className="p-4 text-right font-medium text-gray-500 hidden md:table-cell">المخزون</th>
                        <th className="p-4 text-right font-medium text-gray-500">الحالة</th>
                        <th className="p-4 text-right font-medium text-gray-500">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {product.image && <img src={product.image} alt={product.name} className="w-10 h-10 lg:w-12 lg:h-12 object-cover rounded-lg flex-shrink-0" />}
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{product.name}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {product.is_bestseller && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">الأكثر مبيعاً</span>}
                                  {product.is_new && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">جديد</span>}
                                  {product.is_express && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">توصيل سريع</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            <span className="font-mono text-xs text-gray-500">{product.sku}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-gray-900">{product.price} ر.س</span>
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${product.stock_count <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {product.stock_count}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {product.is_active ? 'نشط' : 'مخفي'}
                            </span>
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-900"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => { setEditingProduct(product); setProductFormOpen(true); }}>
                                  <Edit className="w-4 h-4 ml-2" /> تعديل
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => { setProductToDelete(product.id); setProductDeleteOpen(true); }}>
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
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-0">
              {bundlesLoading ? (
                <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
              ) : filteredBundles.length === 0 ? (
                <div className="p-8 text-center text-gray-500">لم يتم العثور على باقات</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" dir="rtl">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="p-4 text-right font-medium text-gray-500">الباقة</th>
                        <th className="p-4 text-right font-medium text-gray-500 hidden md:table-cell">المناسبة</th>
                        <th className="p-4 text-right font-medium text-gray-500 hidden md:table-cell">المستوى</th>
                        <th className="p-4 text-right font-medium text-gray-500">السعر</th>
                        <th className="p-4 text-right font-medium text-gray-500">الحالة</th>
                        <th className="p-4 text-right font-medium text-gray-500">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredBundles.map((bundle) => (
                        <tr key={bundle.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {bundle.image && <img src={bundle.image} alt={bundle.name} className="w-10 h-10 lg:w-12 lg:h-12 object-cover rounded-lg flex-shrink-0" />}
                              <div>
                                <p className="font-medium text-gray-900">{bundle.name}</p>
                                {bundle.is_featured && <Badge className="text-[10px] mt-1 bg-amber-100 text-amber-700">مميز</Badge>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 hidden md:table-cell text-gray-500">{bundle.occasion?.name || '-'}</td>
                          <td className="p-4 hidden md:table-cell">
                            {bundle.tier && <span className={`px-2 py-1 rounded text-xs ${tierColors[bundle.tier]}`}>{tierLabels[bundle.tier] || bundle.tier}</span>}
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-gray-900">{bundle.price} ر.س</span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs ${bundle.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {bundle.is_active ? 'نشط' : 'مخفي'}
                            </span>
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-900"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => { setEditingBundle(bundle); setBundleFormOpen(true); }}>
                                  <Edit className="w-4 h-4 ml-2" /> تعديل
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => { setBundleToDelete(bundle.id); setBundleDeleteOpen(true); }}>
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
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-0">
              {categoriesLoading ? (
                <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
              ) : filteredCategories.length === 0 ? (
                <div className="p-8 text-center text-gray-500">لم يتم العثور على فئات</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4" dir="rtl">
                  {filteredCategories.map((category) => (
                    <Card key={category.id} className="overflow-hidden border border-gray-200">
                      <div className="relative h-32 bg-gray-100">
                        {category.image ? (
                          <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => { setEditingCategory(category); setCategoryFormOpen(true); }}>
                                <Edit className="w-4 h-4 ml-2" /> تعديل
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => { setCategoryToDelete(category.id); setCategoryDeleteOpen(true); }}>
                                <Trash2 className="w-4 h-4 ml-2" /> حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-900">{category.name_ar}</h3>
                        <p className="text-sm text-gray-500">{category.name}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-400">الترتيب: {category.display_order}</span>
                          <span className={`px-2 py-1 rounded text-xs ${category.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-0">
              {occasionsLoading ? (
                <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
              ) : filteredOccasions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">لم يتم العثور على مناسبات</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" dir="rtl">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="p-4 text-right font-medium text-gray-500">المناسبة</th>
                        <th className="p-4 text-right font-medium text-gray-500 hidden md:table-cell">الرابط</th>
                        <th className="p-4 text-right font-medium text-gray-500 hidden md:table-cell">الترتيب</th>
                        <th className="p-4 text-right font-medium text-gray-500">الحالة</th>
                        <th className="p-4 text-right font-medium text-gray-500">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOccasions.map((occasion) => (
                        <tr key={occasion.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {occasion.icon && <span className="text-2xl">{occasion.icon}</span>}
                              <div>
                                <p className="font-medium text-gray-900">{occasion.name_ar}</p>
                                <p className="text-sm text-gray-500">{occasion.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            <span className="font-mono text-xs text-gray-500">{occasion.slug}</span>
                          </td>
                          <td className="p-4 hidden md:table-cell text-gray-500">{occasion.display_order}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs ${occasion.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {occasion.is_active ? 'نشط' : 'مخفي'}
                            </span>
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-900"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => { setEditingOccasion(occasion); setOccasionFormOpen(true); }}>
                                  <Edit className="w-4 h-4 ml-2" /> تعديل
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => { setOccasionToDelete(occasion.id); setOccasionDeleteOpen(true); }}>
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
      </Tabs>

      {/* Dialogs */}
      <ProductFormDialog open={productFormOpen} onOpenChange={setProductFormOpen} product={editingProduct} />
      <BundleFormDialog open={bundleFormOpen} onOpenChange={setBundleFormOpen} bundle={editingBundle} />
      <CategoryFormDialog open={categoryFormOpen} onOpenChange={setCategoryFormOpen} category={editingCategory} />
      <OccasionFormDialog open={occasionFormOpen} onOpenChange={setOccasionFormOpen} occasion={editingOccasion} />

      <DeleteConfirmDialog
        open={productDeleteOpen}
        onOpenChange={setProductDeleteOpen}
        onConfirm={async () => {
          if (productToDelete) {
            await deleteProduct.mutateAsync(productToDelete);
            setProductDeleteOpen(false);
            setProductToDelete(null);
          }
        }}
        title="حذف المنتج"
        description="هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء."
        isDeleting={deleteProduct.isPending}
      />

      <DeleteConfirmDialog
        open={bundleDeleteOpen}
        onOpenChange={setBundleDeleteOpen}
        onConfirm={async () => {
          if (bundleToDelete) {
            await deleteBundle.mutateAsync(bundleToDelete);
            setBundleDeleteOpen(false);
            setBundleToDelete(null);
          }
        }}
        title="حذف الباقة"
        description="هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء."
        isDeleting={deleteBundle.isPending}
      />

      <DeleteConfirmDialog
        open={categoryDeleteOpen}
        onOpenChange={setCategoryDeleteOpen}
        onConfirm={async () => {
          if (categoryToDelete) {
            await deleteCategory.mutateAsync(categoryToDelete);
            setCategoryDeleteOpen(false);
            setCategoryToDelete(null);
          }
        }}
        title="حذف الفئة"
        description="هل أنت متأكد؟ المنتجات في هذه الفئة قد تصبح بدون تصنيف."
        isDeleting={deleteCategory.isPending}
      />

      <DeleteConfirmDialog
        open={occasionDeleteOpen}
        onOpenChange={setOccasionDeleteOpen}
        onConfirm={async () => {
          if (occasionToDelete) {
            await deleteOccasion.mutateAsync(occasionToDelete);
            setOccasionDeleteOpen(false);
            setOccasionToDelete(null);
          }
        }}
        title="حذف المناسبة"
        description="هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء."
        isDeleting={deleteOccasion.isPending}
      />
    </AdminLayout>
  );
};

export default AdminCatalog;

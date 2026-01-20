import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  Package
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { products } from '@/data/mockData';

const AdminProducts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter(p => p !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
    }
  };

  return (
    <AdminLayout title="المنتجات">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between mb-4 sm:mb-6" dir="rtl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="البحث في المنتجات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-gray-50 border-gray-200 rounded-xl h-10 sm:h-11"
            />
          </div>
          <Button variant="outline" className="gap-2 h-10 sm:h-11 rounded-xl border-gray-200">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">تصفية</span>
          </Button>
        </div>
        <Button className="gap-2 h-10 sm:h-11 rounded-xl bg-[hsl(var(--admin-primary))] hover:bg-[hsl(var(--admin-primary))]/90">
          <Plus className="w-4 h-4" />
          إضافة منتج
        </Button>
      </div>

      {/* Products - Desktop Table */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                      onCheckedChange={() => toggleSelect(product.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className="w-12 h-12 object-cover rounded-xl"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {product.isBestseller && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">الأكثر مبيعاً</span>
                          )}
                          {product.isNew && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">جديد</span>
                          )}
                          {product.isExpress && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">سريع</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-sm text-gray-600">{product.sku}</td>
                  <td className="p-4 text-gray-600">{product.category}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-bold text-gray-900">{product.price} ر.س</p>
                      {product.originalPrice && (
                        <p className="text-sm text-gray-400 line-through">
                          {product.originalPrice} ر.س
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      product.stockCount <= 5 
                        ? 'bg-red-100 text-red-700' 
                        : product.stockCount <= 10 
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {product.stockCount}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      product.inStock
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {product.inStock ? 'نشط' : 'مخفي'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-[hsl(var(--admin-primary))]/10 hover:text-[hsl(var(--admin-primary))]">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-gray-100">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products - Mobile/Tablet Cards */}
      <div className="lg:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">لا توجد منتجات</p>
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
                    onCheckedChange={() => toggleSelect(product.id)}
                  />
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-medium text-gray-900 line-clamp-1">{product.name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg -mt-1 -me-1">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem className="rounded-lg">
                          <Eye className="w-4 h-4 ml-2" /> عرض
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg">
                          <Edit className="w-4 h-4 ml-2" /> تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 rounded-lg">
                          <Trash2 className="w-4 h-4 ml-2" /> حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{product.sku} • {product.category}</p>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{product.price} ر.س</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {product.inStock ? 'نشط' : 'مخفي'}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.stockCount <= 5 
                        ? 'bg-red-100 text-red-700' 
                        : product.stockCount <= 10 
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      المخزون: {product.stockCount}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 sm:mt-6 bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100" dir="rtl">
        <p className="text-xs sm:text-sm text-gray-500">
          عرض <span className="font-medium text-gray-700">{filteredProducts.length}</span> من <span className="font-medium text-gray-700">{products.length}</span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled className="rounded-xl border-gray-200 text-xs sm:text-sm">
            السابق
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl border-gray-200 text-xs sm:text-sm hover:bg-[hsl(var(--admin-primary))] hover:text-white hover:border-[hsl(var(--admin-primary))]">
            التالي
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;
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
  Image as ImageIcon,
  Tag
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="flex flex-col md:flex-row gap-4 justify-between mb-6" dir="rtl">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="البحث في المنتجات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            تصفية
          </Button>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة منتج
        </Button>
      </div>

      {/* Products table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" dir="rtl">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="p-4 text-right">
                    <Checkbox
                      checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-right font-medium">المنتج</th>
                  <th className="p-4 text-right font-medium">رمز المنتج</th>
                  <th className="p-4 text-right font-medium">الفئة</th>
                  <th className="p-4 text-right font-medium">السعر</th>
                  <th className="p-4 text-right font-medium">المخزون</th>
                  <th className="p-4 text-right font-medium">الحالة</th>
                  <th className="p-4 text-right font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-border hover:bg-secondary/30"
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
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <div className="flex gap-1 mt-1">
                            {product.isBestseller && (
                              <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded">الأكثر مبيعاً</span>
                            )}
                            {product.isNew && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">جديد</span>
                            )}
                            {product.isExpress && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">توصيل سريع</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-sm">{product.sku}</td>
                    <td className="p-4">{product.category}</td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{product.price} ر.س</p>
                        {product.originalPrice && (
                          <p className="text-sm text-muted-foreground line-through">
                            {product.originalPrice} ر.س
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        product.stockCount <= 5 
                          ? 'bg-red-100 text-red-800' 
                          : product.stockCount <= 10 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {product.stockCount}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-sm ${
                        product.inStock
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.inStock ? 'نشط' : 'مخفي'}
                      </span>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 ml-2" />
                            عرض
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 ml-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6" dir="rtl">
        <p className="text-sm text-muted-foreground">
          عرض {filteredProducts.length} من {products.length} منتج
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>السابق</Button>
          <Button variant="outline" size="sm">التالي</Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;
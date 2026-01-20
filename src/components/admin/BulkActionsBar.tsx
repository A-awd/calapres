import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Star, Zap, Sparkles, FolderOpen, Trash2, Package, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BulkUpdateData, useBulkUpdateProducts, useBulkDeleteProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({ selectedIds, onClearSelection }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const { data: categories = [] } = useCategories();
  const bulkUpdate = useBulkUpdateProducts();
  const bulkDelete = useBulkDeleteProducts();

  const handleBulkUpdate = (data: BulkUpdateData) => {
    bulkUpdate.mutate(
      { ids: selectedIds, data },
      { onSuccess: () => onClearSelection() }
    );
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId && categoryId !== 'none') {
      handleBulkUpdate({ category_id: categoryId === 'remove' ? null : categoryId });
    }
    setSelectedCategory('');
  };

  const handleBulkDelete = () => {
    bulkDelete.mutate(selectedIds, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        onClearSelection();
      },
    });
  };

  const isLoading = bulkUpdate.isPending || bulkDelete.isPending;

  return (
    <>
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-gray-900 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-4" dir="rtl">
              {/* Selection Count */}
              <div className="flex items-center gap-2 pe-4 border-e border-gray-700">
                <div className="bg-[hsl(var(--admin-primary))] rounded-full w-8 h-8 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                <span className="font-medium whitespace-nowrap">
                  {selectedIds.length} منتج محدد
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-800"
                  onClick={onClearSelection}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Actions */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl"
                  onClick={() => handleBulkUpdate({ is_active: true })}
                  disabled={isLoading}
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">تفعيل</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl"
                  onClick={() => handleBulkUpdate({ is_active: false })}
                  disabled={isLoading}
                >
                  <EyeOff className="w-4 h-4" />
                  <span className="hidden sm:inline">إخفاء</span>
                </Button>

                <div className="w-px h-6 bg-gray-700 hidden sm:block" />

                {/* Flag Actions */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-300 hover:text-amber-400 hover:bg-gray-800 rounded-xl"
                  onClick={() => handleBulkUpdate({ is_bestseller: true })}
                  disabled={isLoading}
                >
                  <Star className="w-4 h-4" />
                  <span className="hidden md:inline">الأكثر مبيعاً</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-300 hover:text-blue-400 hover:bg-gray-800 rounded-xl"
                  onClick={() => handleBulkUpdate({ is_new: true })}
                  disabled={isLoading}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden md:inline">جديد</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-300 hover:text-green-400 hover:bg-gray-800 rounded-xl"
                  onClick={() => handleBulkUpdate({ is_express: true })}
                  disabled={isLoading}
                >
                  <Zap className="w-4 h-4" />
                  <span className="hidden md:inline">سريع</span>
                </Button>

                <div className="w-px h-6 bg-gray-700 hidden sm:block" />

                {/* Stock Actions */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-300 hover:text-emerald-400 hover:bg-gray-800 rounded-xl"
                  onClick={() => handleBulkUpdate({ in_stock: true })}
                  disabled={isLoading}
                >
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">متوفر</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-300 hover:text-red-400 hover:bg-gray-800 rounded-xl"
                  onClick={() => handleBulkUpdate({ in_stock: false })}
                  disabled={isLoading}
                >
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">نفد</span>
                </Button>

                <div className="w-px h-6 bg-gray-700" />

                {/* Category Change */}
                <Select value={selectedCategory} onValueChange={handleCategoryChange} disabled={isLoading}>
                  <SelectTrigger className="w-[130px] sm:w-[160px] bg-gray-800 border-gray-700 text-gray-300 rounded-xl h-9">
                    <FolderOpen className="w-4 h-4 ms-2" />
                    <SelectValue placeholder="تغيير الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remove">
                      <span className="text-gray-500">إزالة الفئة</span>
                    </SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="w-px h-6 bg-gray-700" />

                {/* Delete Action */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded-xl"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isLoading}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">حذف</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المنتجات المحددة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف {selectedIds.length} منتج؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
              disabled={bulkDelete.isPending}
            >
              {bulkDelete.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkActionsBar;

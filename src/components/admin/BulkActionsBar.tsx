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
  const actionButtonClass =
    'h-9 gap-2 rounded-xl border-border/60 bg-background/80 text-muted-foreground hover:bg-accent hover:text-accent-foreground';
  const destructiveButtonClass =
    'h-9 gap-2 rounded-xl border-destructive/30 bg-background text-destructive hover:bg-destructive/10 hover:text-destructive';

  return (
    <>
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <>
            <div className="h-24 sm:h-20" aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-x-3 bottom-3 z-40 sm:bottom-4"
            >
              <div
                className="mx-auto flex w-full max-w-6xl items-center gap-3 overflow-hidden rounded-2xl border border-border bg-background/95 px-3 py-3 text-foreground shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:px-4"
                dir="rtl"
              >
                <div className="flex shrink-0 items-center gap-2 pe-3 border-e border-border">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="whitespace-nowrap text-sm font-medium">
                    {selectedIds.length} منتج محدد
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={onClearSelection}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex min-w-max items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={actionButtonClass}
                      onClick={() => handleBulkUpdate({ is_active: true })}
                      disabled={isLoading}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden md:inline">تفعيل</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={actionButtonClass}
                      onClick={() => handleBulkUpdate({ is_active: false })}
                      disabled={isLoading}
                    >
                      <EyeOff className="w-4 h-4" />
                      <span className="hidden md:inline">إخفاء</span>
                    </Button>

                    <div className="h-6 w-px bg-border" />

                    <Button
                      variant="outline"
                      size="sm"
                      className={actionButtonClass}
                      onClick={() => handleBulkUpdate({ is_bestseller: true })}
                      disabled={isLoading}
                    >
                      <Star className="w-4 h-4" />
                      <span className="hidden lg:inline">الأكثر مبيعاً</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={actionButtonClass}
                      onClick={() => handleBulkUpdate({ is_new: true })}
                      disabled={isLoading}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="hidden sm:inline">جديد</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={actionButtonClass}
                      onClick={() => handleBulkUpdate({ is_express: true })}
                      disabled={isLoading}
                    >
                      <Zap className="w-4 h-4" />
                      <span className="hidden sm:inline">سريع</span>
                    </Button>

                    <div className="h-6 w-px bg-border" />

                    <Button
                      variant="outline"
                      size="sm"
                      className={actionButtonClass}
                      onClick={() => handleBulkUpdate({ in_stock: true })}
                      disabled={isLoading}
                    >
                      <Package className="w-4 h-4" />
                      <span className="hidden md:inline">متوفر</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={actionButtonClass}
                      onClick={() => handleBulkUpdate({ in_stock: false })}
                      disabled={isLoading}
                    >
                      <Package className="w-4 h-4" />
                      <span className="hidden md:inline">نفد</span>
                    </Button>

                    <div className="h-6 w-px bg-border" />

                    <Select value={selectedCategory} onValueChange={handleCategoryChange} disabled={isLoading}>
                      <SelectTrigger className="h-9 w-[136px] rounded-xl border-border/60 bg-background/80 text-muted-foreground sm:w-[152px]">
                        <FolderOpen className="ms-2 w-4 h-4" />
                        <SelectValue placeholder="تغيير الفئة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remove">إزالة الفئة</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name_ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      className={destructiveButtonClass}
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">حذف</span>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl" className="max-w-md rounded-2xl">
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
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

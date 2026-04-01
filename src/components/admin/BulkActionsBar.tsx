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
import { useBulkUpdateBundles, useBulkDeleteBundles } from '@/hooks/useBundles';
import { useBulkUpdateCategories, useBulkDeleteCategories, useCategories } from '@/hooks/useCategories';
import { useBulkUpdateOccasions, useBulkDeleteOccasions } from '@/hooks/useOccasions';

export type EntityType = 'products' | 'bundles' | 'categories' | 'occasions';

const entityLabels: Record<EntityType, { singular: string; plural: string }> = {
  products: { singular: 'منتج', plural: 'منتجات' },
  bundles: { singular: 'باقة', plural: 'باقات' },
  categories: { singular: 'فئة', plural: 'فئات' },
  occasions: { singular: 'مناسبة', plural: 'مناسبات' },
};

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  entityType: EntityType;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({ selectedIds, onClearSelection, entityType }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { data: categories = [] } = useCategories();

  // Products hooks
  const bulkUpdateProducts = useBulkUpdateProducts();
  const bulkDeleteProducts = useBulkDeleteProducts();
  // Bundles hooks
  const bulkUpdateBundles = useBulkUpdateBundles();
  const bulkDeleteBundles = useBulkDeleteBundles();
  // Categories hooks
  const bulkUpdateCategories = useBulkUpdateCategories();
  const bulkDeleteCategories = useBulkDeleteCategories();
  // Occasions hooks
  const bulkUpdateOccasions = useBulkUpdateOccasions();
  const bulkDeleteOccasions = useBulkDeleteOccasions();

  const handleStatusUpdate = (data: { is_active?: boolean }) => {
    const onSuccess = () => onClearSelection();
    switch (entityType) {
      case 'products':
        bulkUpdateProducts.mutate({ ids: selectedIds, data }, { onSuccess });
        break;
      case 'bundles':
        bulkUpdateBundles.mutate({ ids: selectedIds, data }, { onSuccess });
        break;
      case 'categories':
        bulkUpdateCategories.mutate({ ids: selectedIds, data }, { onSuccess });
        break;
      case 'occasions':
        bulkUpdateOccasions.mutate({ ids: selectedIds, data }, { onSuccess });
        break;
    }
  };

  const handleProductUpdate = (data: BulkUpdateData) => {
    bulkUpdateProducts.mutate({ ids: selectedIds, data }, { onSuccess: () => onClearSelection() });
  };

  const handleBundleUpdate = (data: { is_featured?: boolean }) => {
    bulkUpdateBundles.mutate({ ids: selectedIds, data: { ...data } }, { onSuccess: () => onClearSelection() });
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId && categoryId !== 'none') {
      handleProductUpdate({ category_id: categoryId === 'remove' ? null : categoryId });
    }
    setSelectedCategory('');
  };

  const handleBulkDelete = () => {
    const onSuccess = () => { setDeleteDialogOpen(false); onClearSelection(); };
    switch (entityType) {
      case 'products':
        bulkDeleteProducts.mutate(selectedIds, { onSuccess });
        break;
      case 'bundles':
        bulkDeleteBundles.mutate(selectedIds, { onSuccess });
        break;
      case 'categories':
        bulkDeleteCategories.mutate(selectedIds, { onSuccess });
        break;
      case 'occasions':
        bulkDeleteOccasions.mutate(selectedIds, { onSuccess });
        break;
    }
  };

  const isLoading =
    bulkUpdateProducts.isPending || bulkDeleteProducts.isPending ||
    bulkUpdateBundles.isPending || bulkDeleteBundles.isPending ||
    bulkUpdateCategories.isPending || bulkDeleteCategories.isPending ||
    bulkUpdateOccasions.isPending || bulkDeleteOccasions.isPending;

  const isDeleting =
    bulkDeleteProducts.isPending || bulkDeleteBundles.isPending ||
    bulkDeleteCategories.isPending || bulkDeleteOccasions.isPending;

  const labels = entityLabels[entityType];
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
                {/* Selection count */}
                <div className="flex shrink-0 items-center gap-2 pe-3 border-e border-border">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="whitespace-nowrap text-sm font-medium">
                    {selectedIds.length} {labels.singular} محدد
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

                {/* Actions (scrollable) */}
                <div className="flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex min-w-max items-center gap-2">
                    {/* Common: activate / deactivate — all entity types */}
                    <Button variant="outline" size="sm" className={actionButtonClass} onClick={() => handleStatusUpdate({ is_active: true })} disabled={isLoading}>
                      <Eye className="w-4 h-4" /><span className="hidden md:inline">تفعيل</span>
                    </Button>
                    <Button variant="outline" size="sm" className={actionButtonClass} onClick={() => handleStatusUpdate({ is_active: false })} disabled={isLoading}>
                      <EyeOff className="w-4 h-4" /><span className="hidden md:inline">إخفاء</span>
                    </Button>

                    {/* Product-specific actions */}
                    {entityType === 'products' && (
                      <>
                        <div className="h-6 w-px bg-border" />
                        <Button variant="outline" size="sm" className={actionButtonClass} onClick={() => handleProductUpdate({ is_bestseller: true })} disabled={isLoading}>
                          <Star className="w-4 h-4" /><span className="hidden lg:inline">الأكثر مبيعاً</span>
                        </Button>
                        <Button variant="outline" size="sm" className={actionButtonClass} onClick={() => handleProductUpdate({ is_new: true })} disabled={isLoading}>
                          <Sparkles className="w-4 h-4" /><span className="hidden sm:inline">جديد</span>
                        </Button>
                        <Button variant="outline" size="sm" className={actionButtonClass} onClick={() => handleProductUpdate({ is_express: true })} disabled={isLoading}>
                          <Zap className="w-4 h-4" /><span className="hidden sm:inline">سريع</span>
                        </Button>
                        <div className="h-6 w-px bg-border" />
                        <Button variant="outline" size="sm" className={actionButtonClass} onClick={() => handleProductUpdate({ in_stock: true })} disabled={isLoading}>
                          <Package className="w-4 h-4" /><span className="hidden md:inline">متوفر</span>
                        </Button>
                        <Button variant="outline" size="sm" className={actionButtonClass} onClick={() => handleProductUpdate({ in_stock: false })} disabled={isLoading}>
                          <Package className="w-4 h-4" /><span className="hidden md:inline">نفد</span>
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
                              <SelectItem key={cat.id} value={cat.id}>{cat.name_ar}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}

                    {/* Bundle-specific: featured toggle */}
                    {entityType === 'bundles' && (
                      <>
                        <div className="h-6 w-px bg-border" />
                        <Button variant="outline" size="sm" className={actionButtonClass} onClick={() => handleBundleUpdate({ is_featured: true })} disabled={isLoading}>
                          <Star className="w-4 h-4" /><span className="hidden sm:inline">مميز</span>
                        </Button>
                        <Button variant="outline" size="sm" className={actionButtonClass} onClick={() => handleBundleUpdate({ is_featured: false })} disabled={isLoading}>
                          <Star className="w-4 h-4" /><span className="hidden sm:inline">غير مميز</span>
                        </Button>
                      </>
                    )}

                    {/* Delete — all entity types */}
                    <div className="h-6 w-px bg-border" />
                    <Button variant="outline" size="sm" className={destructiveButtonClass} onClick={() => setDeleteDialogOpen(true)} disabled={isLoading}>
                      <Trash2 className="w-4 h-4" /><span className="hidden sm:inline">حذف</span>
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
            <AlertDialogTitle>حذف {labels.plural} المحددة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف {selectedIds.length} {labels.singular}؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkActionsBar;

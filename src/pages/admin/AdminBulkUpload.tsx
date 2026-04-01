import React, { useState, useCallback } from 'react';
import { Upload, Loader2, Trash2, Check, X, Wand2, Save, AlertCircle } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from '@/hooks/useCategories';
import { useCreateProduct } from '@/hooks/useProducts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface UploadedImage {
  file: File;
  preview: string;
  url?: string;
  uploading?: boolean;
}

interface ProductGroup {
  name: string;
  name_ar: string;
  category: string;
  description: string;
  description_ar: string;
  imageIndices: number[];
  saved?: boolean;
}

const AdminBulkUpload: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => 
      f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024
    );

    if (fileArray.length === 0) {
      toast.error('لم يتم العثور على صور صالحة (JPG, PNG, WebP - حد أقصى 5MB)');
      return;
    }

    const newImages: UploadedImage[] = fileArray.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages(prev => [...prev, ...newImages]);
    toast.success(`تم إضافة ${fileArray.length} صورة`);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
    setGroups([]);
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setGroups([]);
  };

  // Upload all images to storage
  const uploadAllImages = async () => {
    setUploading(true);
    const updatedImages = [...images];

    try {
      for (let i = 0; i < updatedImages.length; i++) {
        if (updatedImages[i].url) continue;
        
        updatedImages[i].uploading = true;
        setImages([...updatedImages]);

        const file = updatedImages[i].file;
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        const { error } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (error) {
          toast.error(`فشل رفع الصورة ${i + 1}: ${error.message}`);
          updatedImages[i].uploading = false;
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        updatedImages[i].url = urlData.publicUrl;
        updatedImages[i].uploading = false;
        setImages([...updatedImages]);
      }

      const uploadedCount = updatedImages.filter(img => img.url).length;
      toast.success(`تم رفع ${uploadedCount} صورة بنجاح`);
    } catch (error) {
      toast.error('فشل في رفع الصور');
    } finally {
      setUploading(false);
    }
  };

  // Analyze images with AI
  const analyzeImages = async () => {
    const uploadedImages = images.filter(img => img.url);
    if (uploadedImages.length === 0) {
      toast.error('يرجى رفع الصور أولاً');
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-product-images', {
        body: { imageUrls: uploadedImages.map(img => img.url) },
      });

      if (error) throw error;
      
      if (data.groups) {
        setGroups(data.groups);
        toast.success(`تم تصنيف الصور إلى ${data.groups.length} منتج`);
      } else {
        toast.error('لم يتم التعرف على أي منتجات');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(`فشل التحليل: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Save a single product group
  const saveGroup = async (groupIndex: number) => {
    const group = groups[groupIndex];
    const uploadedImages = images.filter(img => img.url);
    const groupImages = group.imageIndices
      .map(i => uploadedImages[i]?.url)
      .filter(Boolean) as string[];

    if (groupImages.length === 0) return;

    const categoryId = categories.find(c => c.slug === group.category)?.id;

    const slug = group.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const sku = `PRD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    try {
      await createProduct.mutateAsync({
        name: group.name,
        name_ar: group.name_ar,
        slug,
        sku,
        description: group.description,
        description_ar: group.description_ar,
        price: 0,
        category_id: categoryId,
        image: groupImages[0],
        images: groupImages.slice(1),
        stock_count: 0,
        in_stock: true,
        is_bestseller: false,
        is_new: true,
        is_express: false,
        is_active: false, // Draft mode
      });

      setGroups(prev => prev.map((g, i) => i === groupIndex ? { ...g, saved: true } : g));
      toast.success(`تم حفظ المنتج: ${group.name_ar}`);
    } catch (error: any) {
      toast.error(`فشل حفظ المنتج: ${error.message}`);
    }
  };

  // Save all groups
  const saveAllGroups = async () => {
    setSavingAll(true);
    const unsavedGroups = groups.map((g, i) => ({ group: g, index: i })).filter(({ group }) => !group.saved);
    
    for (const { index } of unsavedGroups) {
      await saveGroup(index);
    }
    
    setSavingAll(false);
    toast.success('تم حفظ جميع المنتجات!');
  };

  const updateGroupField = (groupIndex: number, field: keyof ProductGroup, value: string) => {
    setGroups(prev => prev.map((g, i) => i === groupIndex ? { ...g, [field]: value } : g));
  };

  const uploadedImages = images.filter(img => img.url);

  return (
    <AdminLayout title="رفع جماعي للصور">
      <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={cn(
            "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors bg-white",
            dragOver ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50"
          )}
          onClick={() => document.getElementById('bulk-upload-input')?.click()}
        >
          <input
            id="bulk-upload-input"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            اسحب الصور هنا أو اضغط للاختيار
          </h3>
          <p className="text-sm text-gray-500">
            JPG, PNG, WebP - حد أقصى 5MB لكل صورة • يمكنك رفع مئات الصور دفعة واحدة
          </p>
        </div>

        {/* Images Preview */}
        {images.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">الصور المرفوعة</h3>
                <Badge variant="secondary">{images.length} صورة</Badge>
                {uploadedImages.length > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700">{uploadedImages.length} جاهزة</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearAll} className="gap-1 rounded-xl text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                  مسح الكل
                </Button>
                {uploadedImages.length < images.length && (
                  <Button size="sm" onClick={uploadAllImages} disabled={uploading} className="gap-1 rounded-xl bg-[hsl(var(--admin-primary))]">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    رفع الصور ({images.length - uploadedImages.length})
                  </Button>
                )}
                {uploadedImages.length > 0 && groups.length === 0 && (
                  <Button size="sm" onClick={analyzeImages} disabled={analyzing} className="gap-1 rounded-xl bg-purple-600 hover:bg-purple-700">
                    {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    تصنيف بالذكاء الاصطناعي
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                  <img src={img.preview} alt={`Image ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  {img.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                  {img.url && (
                    <div className="absolute top-1 right-1">
                      <Check className="w-4 h-4 text-emerald-500 bg-white rounded-full" />
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                    className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis Results */}
        {analyzing && (
          <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-12 text-center">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">جاري تحليل الصور بالذكاء الاصطناعي...</h3>
            <p className="text-sm text-gray-500">يتم تصنيف الصور وتجميع المنتجات المتشابهة</p>
          </div>
        )}

        {groups.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">المنتجات المصنفة</h3>
                <Badge variant="secondary">{groups.length} منتج</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => { setGroups([]); }}
                  variant="outline"
                  size="sm"
                  className="gap-1 rounded-xl"
                >
                  <Wand2 className="w-4 h-4" />
                  إعادة التصنيف
                </Button>
                <Button
                  onClick={saveAllGroups}
                  disabled={savingAll || groups.every(g => g.saved)}
                  size="sm"
                  className="gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                >
                  {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ الكل كمسودة
                </Button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              المنتجات ستُحفظ كمسودة (غير نشطة) بسعر 0 ر.س. يمكنك تعديل الأسعار والتفاصيل لاحقاً من صفحة المنتجات.
            </div>

            {groups.map((group, groupIndex) => {
              const groupImages = group.imageIndices
                .map(i => uploadedImages[i])
                .filter(Boolean);

              return (
                <div
                  key={groupIndex}
                  className={cn(
                    "bg-white rounded-2xl border shadow-sm p-5",
                    group.saved ? "border-emerald-200 bg-emerald-50/30" : "border-gray-100"
                  )}
                >
                  <div className="flex flex-col lg:flex-row gap-5">
                    {/* Images */}
                    <div className="flex-shrink-0">
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {groupImages.map((img, imgIdx) => (
                          <img
                            key={imgIdx}
                            src={img.url || img.preview}
                            alt={`Product ${groupIndex + 1} - Image ${imgIdx + 1}`}
                            className="w-20 h-20 object-cover rounded-xl border border-gray-200 flex-shrink-0"
                            loading="lazy"
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{groupImages.length} صور</p>
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">الاسم (English)</label>
                        <Input
                          value={group.name}
                          onChange={(e) => updateGroupField(groupIndex, 'name', e.target.value)}
                          className="rounded-xl h-9"
                          disabled={group.saved}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">الاسم (عربي)</label>
                        <Input
                          value={group.name_ar}
                          onChange={(e) => updateGroupField(groupIndex, 'name_ar', e.target.value)}
                          className="rounded-xl h-9"
                          dir="rtl"
                          disabled={group.saved}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">الفئة</label>
                        <Select
                          value={group.category}
                          onValueChange={(v) => updateGroupField(groupIndex, 'category', v)}
                          disabled={group.saved}
                        >
                          <SelectTrigger className="rounded-xl h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.slug}>{cat.name_ar}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        {group.saved ? (
                          <Badge className="bg-emerald-100 text-emerald-700 gap-1">
                            <Check className="w-3 h-3" /> تم الحفظ
                          </Badge>
                        ) : (
                          <Button
                            onClick={() => saveGroup(groupIndex)}
                            size="sm"
                            className="gap-1 rounded-xl bg-[hsl(var(--admin-primary))]"
                            disabled={createProduct.isPending}
                          >
                            <Save className="w-4 h-4" />
                            حفظ
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBulkUpload;

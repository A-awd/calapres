import React, { useState, useCallback, useRef, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { Upload, Loader2, Trash2, Check, X, Wand2, Save, AlertCircle, Image as ImageIcon, Package } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
}

interface ProductGroup {
  name: string;
  name_ar: string;
  category: string;
  description: string;
  description_ar: string;
  price: number;
  imageIndices: number[];
  saved?: boolean;
}

type PipelineStep = 'idle' | 'uploading' | 'analyzing' | 'done';

const BATCH_SIZE = 20; // images per AI analysis batch

const AdminBulkUpload: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const abortRef = useRef(false);

  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();

  // Full automatic pipeline
  const runPipeline = useCallback(async (fileArray: File[]) => {
    abortRef.current = false;

    // Step 1: Filter valid files
    const validFiles: File[] = [];
    let rejected = 0;
    for (const f of fileArray) {
      if (!f.type.startsWith('image/')) { rejected++; continue; }
      if (f.size > 5 * 1024 * 1024) { rejected++; continue; }
      validFiles.push(f);
    }
    setRejectedCount(rejected);

    if (validFiles.length === 0) {
      toast.error('لم يتم العثور على صور صالحة (JPG, PNG, WebP - حد أقصى 5MB)');
      return;
    }

    // Create image entries
    const newImages: UploadedImage[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }));
    setImages(newImages);
    setGroups([]);

    // Step 2: Upload all to storage
    setPipelineStep('uploading');
    setUploadProgress(0);
    const updatedImages = [...newImages];

    for (let i = 0; i < updatedImages.length; i++) {
      if (abortRef.current) { setPipelineStep('idle'); return; }

      updatedImages[i].status = 'uploading';
      setImages([...updatedImages]);

      const file = updatedImages[i].file;
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      try {
        const { error } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (error) {
          updatedImages[i].status = 'failed';
        } else {
          const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
          updatedImages[i].url = urlData.publicUrl;
          updatedImages[i].status = 'uploaded';
        }
      } catch {
        updatedImages[i].status = 'failed';
      }

      setUploadProgress(Math.round(((i + 1) / updatedImages.length) * 100));
      setImages([...updatedImages]);
    }

    const uploadedImages = updatedImages.filter(img => img.status === 'uploaded');
    const failedCount = updatedImages.filter(img => img.status === 'failed').length;

    if (failedCount > 0) {
      toast.warning(`فشل رفع ${failedCount} صورة`);
    }

    if (uploadedImages.length === 0) {
      toast.error('فشل رفع جميع الصور');
      setPipelineStep('idle');
      return;
    }

    toast.success(`تم رفع ${uploadedImages.length} صورة بنجاح`);

    // Step 3: AI Analysis in batches
    setPipelineStep('analyzing');
    setAnalyzeProgress(0);

    const uploadedUrls = uploadedImages.map(img => img.url!);
    const totalBatches = Math.ceil(uploadedUrls.length / BATCH_SIZE);
    const allGroups: ProductGroup[] = [];
    let globalOffset = 0;

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      if (abortRef.current) { setPipelineStep('idle'); return; }

      const batchUrls = uploadedUrls.slice(batchIdx * BATCH_SIZE, (batchIdx + 1) * BATCH_SIZE);

      try {
        const { data, error } = await supabase.functions.invoke('analyze-product-images', {
          body: { imageUrls: batchUrls, batchIndex: batchIdx, totalBatches },
        });

        if (error) throw error;

        if (data?.groups) {
          // Adjust image indices to global offset
          const adjustedGroups = data.groups.map((g: ProductGroup) => ({
            ...g,
            imageIndices: g.imageIndices.map((idx: number) => idx + globalOffset),
          }));
          allGroups.push(...adjustedGroups);
        }
      } catch (error: any) {
        console.error(`Batch ${batchIdx + 1} analysis error:`, error);
        toast.error(`فشل تحليل الدفعة ${batchIdx + 1}: ${error.message || 'خطأ'}`);
      }

      globalOffset += batchUrls.length;
      setAnalyzeProgress(Math.round(((batchIdx + 1) / totalBatches) * 100));
    }

    setGroups(allGroups);
    setPipelineStep('done');

    if (allGroups.length > 0) {
      toast.success(`تم تصنيف الصور إلى ${allGroups.length} منتج! راجع النتائج وعدّل ما تريد ثم احفظ.`);
    } else {
      toast.error('لم يتم التعرف على أي منتجات');
    }
  }, []);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    runPipeline(fileArray);
  }, [runPipeline]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const cancelPipeline = () => {
    abortRef.current = true;
    setPipelineStep('idle');
  };

  const clearAll = () => {
    abortRef.current = true;
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setGroups([]);
    setPipelineStep('idle');
    setRejectedCount(0);
  };

  // Re-analyze with AI (manual trigger)
  const reAnalyze = async () => {
    const uploadedImages = images.filter(img => img.status === 'uploaded');
    if (uploadedImages.length === 0) return;

    setPipelineStep('analyzing');
    setAnalyzeProgress(0);
    setGroups([]);

    const uploadedUrls = uploadedImages.map(img => img.url!);
    const totalBatches = Math.ceil(uploadedUrls.length / BATCH_SIZE);
    const allGroups: ProductGroup[] = [];
    let globalOffset = 0;

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const batchUrls = uploadedUrls.slice(batchIdx * BATCH_SIZE, (batchIdx + 1) * BATCH_SIZE);
      try {
        const { data, error } = await supabase.functions.invoke('analyze-product-images', {
          body: { imageUrls: batchUrls },
        });
        if (error) throw error;
        if (data?.groups) {
          const adjustedGroups = data.groups.map((g: ProductGroup) => ({
            ...g,
            imageIndices: g.imageIndices.map((idx: number) => idx + globalOffset),
          }));
          allGroups.push(...adjustedGroups);
        }
      } catch (error: any) {
        toast.error(`فشل تحليل الدفعة ${batchIdx + 1}`);
      }
      globalOffset += batchUrls.length;
      setAnalyzeProgress(Math.round(((batchIdx + 1) / totalBatches) * 100));
    }

    setGroups(allGroups);
    setPipelineStep('done');
    if (allGroups.length > 0) {
      toast.success(`تم تصنيف الصور إلى ${allGroups.length} منتج`);
    }
  };

  // Save a single product group
  const saveGroup = async (groupIndex: number) => {
    const group = groups[groupIndex];
    const uploadedImages = images.filter(img => img.status === 'uploaded');
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
        price: group.price || 0,
        category_id: categoryId,
        image: groupImages[0],
        images: groupImages.slice(1),
        stock_count: 0,
        in_stock: true,
        is_bestseller: false,
        is_new: true,
        is_express: false,
        is_active: false,
      });

      setGroups(prev => prev.map((g, i) => i === groupIndex ? { ...g, saved: true } : g));
      toast.success(`تم حفظ المنتج: ${group.name_ar}`);
    } catch (error: any) {
      toast.error(`فشل حفظ المنتج: ${error.message}`);
    }
  };

  const saveAllGroups = async () => {
    setSavingAll(true);
    const unsaved = groups.map((g, i) => ({ group: g, index: i })).filter(({ group }) => !group.saved);
    for (const { index } of unsaved) {
      await saveGroup(index);
    }
    setSavingAll(false);
    toast.success('تم حفظ جميع المنتجات!');
  };

  const updateGroupField = (groupIndex: number, field: keyof ProductGroup, value: string) => {
    setGroups(prev => prev.map((g, i) => i === groupIndex ? { ...g, [field]: value } : g));
  };

  const uploadedImages = images.filter(img => img.status === 'uploaded');
  const isProcessing = pipelineStep === 'uploading' || pipelineStep === 'analyzing';

  return (
    <AdminLayout title="رفع جماعي للصور">
      <div className="max-w-6xl mx-auto space-y-6" dir="rtl">

        {/* Upload Area - only show when idle */}
        {pipelineStep === 'idle' && images.length === 0 && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={cn(
              "border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all bg-white",
              dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-gray-300 hover:border-primary/50"
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
            <div className="bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Upload className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              اسحب الصور هنا أو اضغط للاختيار
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              JPG, PNG, WebP - حد أقصى 5MB لكل صورة
            </p>
            <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> رفع تلقائي</span>
              <span className="flex items-center gap-1"><Wand2 className="w-3.5 h-3.5" /> تصنيف بالذكاء الاصطناعي</span>
              <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> إنشاء منتجات</span>
            </div>
          </div>
        )}

        {/* Pipeline Progress */}
        {isProcessing && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="max-w-md mx-auto text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />

              {pipelineStep === 'uploading' && (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">جاري رفع الصور...</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {uploadedImages.length} / {images.length} صورة
                  </p>
                  <Progress value={uploadProgress} className="h-2 mb-3" />
                  <p className="text-xs text-gray-400">{uploadProgress}%</p>
                </>
              )}

              {pipelineStep === 'analyzing' && (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">جاري التصنيف بالذكاء الاصطناعي...</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    يتم تحليل الصور وتجميع المنتجات المتشابهة
                  </p>
                  <Progress value={analyzeProgress} className="h-2 mb-3" />
                  <p className="text-xs text-gray-400">{analyzeProgress}%</p>
                </>
              )}

              <Button variant="outline" size="sm" onClick={cancelPipeline} className="mt-4 rounded-xl">
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {/* Rejected files notice */}
        {rejectedCount > 0 && pipelineStep !== 'idle' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            تم تجاهل {rejectedCount} ملف (حجم أكبر من 5MB أو نوع غير مدعوم)
          </div>
        )}

        {/* Results: Images grid + Groups */}
        {pipelineStep === 'done' && (
          <>
            {/* Summary bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2.5 rounded-xl">
                    <ImageIcon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">تم رفع {uploadedImages.length} صورة</h3>
                    <p className="text-sm text-gray-500">تم تصنيفها إلى {groups.length} منتج</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearAll} className="gap-1 rounded-xl text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                    مسح الكل
                  </Button>
                  <Button variant="outline" size="sm" onClick={reAnalyze} className="gap-1 rounded-xl">
                    <Wand2 className="w-4 h-4" />
                    إعادة التصنيف
                  </Button>
                  {groups.length > 0 && (
                    <Button
                      onClick={saveAllGroups}
                      disabled={savingAll || groups.every(g => g.saved)}
                      size="sm"
                      className="gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                    >
                      {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ الكل كمسودة ({groups.filter(g => !g.saved).length})
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Info banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 text-sm text-blue-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              المنتجات ستُحفظ كمسودة (غير نشطة) بسعر 0 ر.س. يمكنك تعديل الأسعار والتفاصيل لاحقاً من صفحة إدارة المنتجات.
            </div>

            {/* Product Groups */}
            {groups.map((group, groupIndex) => {
              const groupImages = group.imageIndices
                .map(i => uploadedImages[i])
                .filter(Boolean);

              return (
                <div
                  key={groupIndex}
                  className={cn(
                    "bg-white rounded-2xl border shadow-sm p-5 transition-colors",
                    group.saved ? "border-emerald-300 bg-emerald-50/30" : "border-gray-100"
                  )}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="rounded-lg">
                      منتج {groupIndex + 1}
                    </Badge>
                    <Badge variant="secondary" className="rounded-lg">
                      {groupImages.length} صور
                    </Badge>
                    {group.saved && (
                      <Badge className="bg-emerald-100 text-emerald-700 gap-1 rounded-lg">
                        <Check className="w-3 h-3" /> تم الحفظ
                      </Badge>
                    )}
                  </div>

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
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">السعر (ر.س)</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={group.price || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setGroups(prev => prev.map((g, i) => i === groupIndex ? { ...g, price: val } : g));
                          }}
                          placeholder="0.00"
                          className="rounded-xl h-9"
                          disabled={group.saved}
                        />
                      </div>
                      <div className="flex items-end col-span-full">
                        {!group.saved && (
                          <Button
                            onClick={() => saveGroup(groupIndex)}
                            size="sm"
                            className="gap-1 rounded-xl"
                            disabled={createProduct.isPending}
                          >
                            <Save className="w-4 h-4" />
                            حفظ كمسودة
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Upload more */}
            <div className="text-center py-6">
              <Button
                variant="outline"
                onClick={() => {
                  clearAll();
                }}
                className="gap-2 rounded-xl"
              >
                <Upload className="w-4 h-4" />
                رفع مجموعة صور جديدة
              </Button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBulkUpload;

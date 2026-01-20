import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  Ticket,
  Percent,
  DollarSign,
  Calendar,
  Copy,
  Check,
  Users,
  ShoppingBag
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Coupon {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number;
  max_discount: number | null;
  max_uses: number | null;
  used_count: number;
  max_uses_per_user: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  applies_to: string;
  created_at: string;
}

const AdminCoupons: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    min_order_amount: 0,
    max_discount: '',
    max_uses: '',
    max_uses_per_user: 1,
    start_date: '',
    end_date: '',
    is_active: true,
    applies_to: 'all',
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-coupons-stats'],
    queryFn: async () => {
      const { data: usages } = await supabase
        .from('coupon_usages')
        .select('discount_amount');
      
      const totalDiscount = usages?.reduce((sum, u) => sum + Number(u.discount_amount || 0), 0) || 0;
      const totalUsages = usages?.length || 0;
      const activeCoupons = coupons.filter(c => c.is_active).length;
      
      return { totalDiscount, totalUsages, activeCoupons };
    },
    enabled: coupons.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        max_discount: data.max_discount ? Number(data.max_discount) : null,
        max_uses: data.max_uses ? Number(data.max_uses) : null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
      };
      const { error } = await supabase.from('coupons').insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('تم إنشاء الكوبون بنجاح');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('كود الكوبون موجود مسبقاً');
      } else {
        toast.error('فشل في إنشاء الكوبون');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const payload = {
        ...data,
        max_discount: data.max_discount ? Number(data.max_discount) : null,
        max_uses: data.max_uses ? Number(data.max_uses) : null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
      };
      const { error } = await supabase.from('coupons').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('تم تحديث الكوبون بنجاح');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('فشل في تحديث الكوبون');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('تم حذف الكوبون');
      setIsDeleteOpen(false);
      setSelectedCoupon(null);
    },
    onError: () => {
      toast.error('فشل في حذف الكوبون');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('coupons').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      type: 'percentage',
      value: 0,
      min_order_amount: 0,
      max_discount: '',
      max_uses: '',
      max_uses_per_user: 1,
      start_date: '',
      end_date: '',
      is_active: true,
      applies_to: 'all',
    });
    setSelectedCoupon(null);
  };

  const openEditDialog = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      name_ar: coupon.name_ar,
      description: coupon.description || '',
      description_ar: coupon.description_ar || '',
      type: coupon.type,
      value: coupon.value,
      min_order_amount: coupon.min_order_amount,
      max_discount: coupon.max_discount?.toString() || '',
      max_uses: coupon.max_uses?.toString() || '',
      max_uses_per_user: coupon.max_uses_per_user,
      start_date: coupon.start_date ? coupon.start_date.split('T')[0] : '',
      end_date: coupon.end_date ? coupon.end_date.split('T')[0] : '',
      is_active: coupon.is_active,
      applies_to: coupon.applies_to,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name_ar || formData.value <= 0) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    if (selectedCoupon) {
      updateMutation.mutate({ id: selectedCoupon.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name_ar.includes(searchTerm)
  );

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.is_active) return { label: 'معطل', color: 'bg-muted text-muted-foreground' };
    if (coupon.end_date && new Date(coupon.end_date) < new Date()) {
      return { label: 'منتهي', color: 'bg-red-50 text-red-600 border-red-200' };
    }
    if (coupon.start_date && new Date(coupon.start_date) > new Date()) {
      return { label: 'مجدول', color: 'bg-blue-50 text-blue-600 border-blue-200' };
    }
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return { label: 'مستنفد', color: 'bg-amber-50 text-amber-600 border-amber-200' };
    }
    return { label: 'نشط', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  };

  return (
    <AdminLayout title="الكوبونات والعروض">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'إجمالي الكوبونات', value: coupons.length, icon: Ticket, color: 'text-gold' },
          { label: 'الكوبونات النشطة', value: stats?.activeCoupons || 0, icon: Check, color: 'text-emerald-600' },
          { label: 'مرات الاستخدام', value: stats?.totalUsages || 0, icon: Users, color: 'text-blue-600' },
          { label: 'إجمالي الخصومات', value: `${(stats?.totalDiscount || 0).toLocaleString()} ر.س`, icon: DollarSign, color: 'text-purple-600' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="card-luxury p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <Card className="card-luxury mb-6">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Ticket className="w-5 h-5 text-gold" />
            إدارة الكوبونات
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9 w-full sm:w-64"
              />
            </div>
            <Button 
              className="btn-luxury gap-2"
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              إضافة كوبون
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">لا توجد كوبونات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCoupons.map((coupon, i) => {
                const status = getCouponStatus(coupon);
                return (
                  <motion.div
                    key={coupon.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-lg bg-secondary/20 border border-border/30 hover:border-border/60 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          {coupon.type === 'percentage' ? (
                            <Percent className="w-6 h-6 text-gold" />
                          ) : (
                            <DollarSign className="w-6 h-6 text-gold" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <button
                              onClick={() => copyCode(coupon.code)}
                              className="font-mono font-bold text-foreground bg-charcoal/5 px-2 py-0.5 rounded hover:bg-charcoal/10 transition-colors flex items-center gap-1"
                            >
                              {coupon.code}
                              {copiedCode === coupon.code ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 text-muted-foreground" />
                              )}
                            </button>
                            <Badge className={`text-[10px] border ${status.color}`}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground mb-1">{coupon.name_ar}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {coupon.type === 'percentage' ? (
                                <>{coupon.value}% خصم</>
                              ) : (
                                <>{coupon.value} ر.س خصم</>
                              )}
                            </span>
                            {coupon.min_order_amount > 0 && (
                              <span>• الحد الأدنى: {coupon.min_order_amount} ر.س</span>
                            )}
                            {coupon.max_uses && (
                              <span>• {coupon.used_count}/{coupon.max_uses} استخدام</span>
                            )}
                            {coupon.end_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                حتى {format(new Date(coupon.end_date), 'd MMM', { locale: ar })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={coupon.is_active}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: coupon.id, is_active: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(coupon)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedCoupon(coupon);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selectedCoupon ? 'تعديل الكوبون' : 'إضافة كوبون جديد'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>كود الكوبون *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="مثال: SAVE20"
                  className="font-mono uppercase"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>نوع الخصم *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'percentage' | 'fixed') => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت (ر.س)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم (إنجليزي)</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Summer Sale"
                />
              </div>
              <div className="space-y-2">
                <Label>الاسم (عربي) *</Label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="تخفيضات الصيف"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>قيمة الخصم *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                  placeholder="20"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>الحد الأدنى للطلب</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>أقصى خصم</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.max_discount}
                  onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                  placeholder="اختياري"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>عدد الاستخدامات الكلي</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="غير محدود"
                />
              </div>
              <div className="space-y-2">
                <Label>لكل مستخدم</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.max_uses_per_user}
                  onChange={(e) => setFormData({ ...formData, max_uses_per_user: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>يطبق على</Label>
                <Select
                  value={formData.applies_to}
                  onValueChange={(value) => setFormData({ ...formData, applies_to: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المنتجات</SelectItem>
                    <SelectItem value="products">منتجات محددة</SelectItem>
                    <SelectItem value="bundles">باقات محددة</SelectItem>
                    <SelectItem value="categories">فئات محددة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ البداية</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ الانتهاء</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الوصف (عربي)</Label>
              <Textarea
                value={formData.description_ar}
                onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                placeholder="وصف اختياري للكوبون..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">الكوبون نشط</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                type="submit" 
                className="btn-luxury"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الكوبون</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الكوبون "{selectedCoupon?.code}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedCoupon && deleteMutation.mutate(selectedCoupon.id)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminCoupons;

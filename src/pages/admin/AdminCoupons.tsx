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
  MoreHorizontal,
  Filter
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    enabled: coupons.length >= 0,
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
    toast.success('تم نسخ الكود');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name_ar.includes(searchTerm)
  );

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.is_active) return { label: 'معطل', bg: 'bg-gray-100', text: 'text-gray-600' };
    if (coupon.end_date && new Date(coupon.end_date) < new Date()) {
      return { label: 'منتهي', bg: 'bg-red-100', text: 'text-red-600' };
    }
    if (coupon.start_date && new Date(coupon.start_date) > new Date()) {
      return { label: 'مجدول', bg: 'bg-blue-100', text: 'text-blue-600' };
    }
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return { label: 'مستنفد', bg: 'bg-amber-100', text: 'text-amber-600' };
    }
    return { label: 'نشط', bg: 'bg-emerald-100', text: 'text-emerald-600' };
  };

  return (
    <AdminLayout title="الكوبونات والعروض">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'إجمالي الكوبونات', value: coupons.length, icon: Ticket, bg: 'bg-gray-100', color: 'text-gray-900' },
          { label: 'الكوبونات النشطة', value: stats?.activeCoupons || 0, icon: Check, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'مرات الاستخدام', value: stats?.totalUsages || 0, icon: Users, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'إجمالي الخصومات', value: `${(stats?.totalDiscount || 0).toLocaleString()}`, icon: DollarSign, bg: 'bg-purple-50', color: 'text-purple-600' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Table */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-gray-600" />
            قائمة الكوبونات
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9 w-full sm:w-56 bg-gray-50 border-gray-200 rounded-xl"
              />
            </div>
            <Button 
              className="bg-gray-900 hover:bg-gray-800 text-white gap-2 rounded-xl"
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
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="text-center py-16">
              <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">لا توجد كوبونات</p>
              <p className="text-sm text-gray-400 mt-1">أضف كوبون جديد للبدء</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">الكود</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">النوع</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">القيمة</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">الاستخدام</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">الحالة</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">مفعل</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCoupons.map((coupon) => {
                    const status = getCouponStatus(coupon);
                    return (
                      <tr key={coupon.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyCode(coupon.code)}
                              className="font-mono font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5 text-sm"
                            >
                              {coupon.code}
                              {copiedCode === coupon.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{coupon.name_ar}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${coupon.type === 'percentage' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                              {coupon.type === 'percentage' ? (
                                <Percent className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                              )}
                            </div>
                            <span className="text-sm text-gray-500">
                              {coupon.type === 'percentage' ? 'نسبة' : 'مبلغ'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {coupon.value}{coupon.type === 'percentage' ? '%' : ' ر.س'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {coupon.used_count}/{coupon.max_uses || '∞'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`${status.bg} ${status.text} border-0 text-[11px] font-medium`}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Switch
                            checked={coupon.is_active}
                            onCheckedChange={(checked) => 
                              toggleActiveMutation.mutate({ id: coupon.id, is_active: checked })
                            }
                            className="data-[state=checked]:bg-gray-900"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-900">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(coupon)}>
                                <Pencil className="w-4 h-4 ml-2" />
                                تعديل
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedCoupon(coupon);
                                  setIsDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 ml-2" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coupon Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {selectedCoupon ? 'تعديل الكوبون' : 'إضافة كوبون جديد'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>كود الكوبون *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2024"
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>الاسم (عربي) *</Label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="خصم الصيف"
                />
              </div>
              <div className="space-y-2">
                <Label>الاسم (إنجليزي)</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Summer Sale"
                />
              </div>
              <div className="space-y-2">
                <Label>نوع الخصم</Label>
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
              <div className="space-y-2">
                <Label>قيمة الخصم *</Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>الحد الأدنى للطلب</Label>
                <Input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>الحد الأقصى للخصم</Label>
                <Input
                  type="number"
                  value={formData.max_discount}
                  onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                  placeholder="بدون حد"
                />
              </div>
              <div className="space-y-2">
                <Label>الحد الأقصى للاستخدام</Label>
                <Input
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="غير محدود"
                />
              </div>
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
                placeholder="وصف الكوبون..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>الكوبون مفعل</Label>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" className="bg-gray-900 hover:bg-gray-800">
                {selectedCoupon ? 'حفظ التغييرات' : 'إنشاء الكوبون'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الكوبون "{selectedCoupon?.name_ar}" نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCoupon && deleteMutation.mutate(selectedCoupon.id)}
              className="bg-red-600 hover:bg-red-700"
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

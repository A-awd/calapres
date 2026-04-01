import StorefrontLayout from '@/components/storefront/StorefrontLayout';
import Footer from '@/components/storefront/Footer';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { 
  useOccasionReminders, 
  useCreateOccasionReminder, 
  useUpdateOccasionReminder, 
  useDeleteOccasionReminder,
  OccasionReminder,
  OccasionReminderFormData
} from '@/hooks/useOccasionReminders';
import { useOccasions } from '@/hooks/useOccasions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { format, differenceInDays, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { 
  Bell, 
  Plus, 
  Calendar, 
  User, 
  Edit2, 
  Trash2, 
  Gift,
  Clock,
  Repeat,
  AlertCircle
} from 'lucide-react';

const OccasionReminders = () => {
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const { data: reminders, isLoading } = useOccasionReminders();
  const { data: occasions } = useOccasions();
  const createReminder = useCreateOccasionReminder();
  const updateReminder = useUpdateOccasionReminder();
  const deleteReminder = useDeleteOccasionReminder();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<OccasionReminder | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<OccasionReminderFormData>({
    title: '',
    title_ar: '',
    occasion_date: '',
    reminder_days_before: 3,
    occasion_type: '',
    recipient_name: '',
    notes: '',
    is_recurring: false,
    is_active: true,
  });

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const resetForm = () => {
    setFormData({
      title: '',
      title_ar: '',
      occasion_date: '',
      reminder_days_before: 3,
      occasion_type: '',
      recipient_name: '',
      notes: '',
      is_recurring: false,
      is_active: true,
    });
    setEditingReminder(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (reminder: OccasionReminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      title_ar: reminder.title_ar,
      occasion_date: reminder.occasion_date,
      reminder_days_before: reminder.reminder_days_before,
      occasion_type: reminder.occasion_type || '',
      recipient_name: reminder.recipient_name || '',
      notes: reminder.notes || '',
      is_recurring: reminder.is_recurring,
      is_active: reminder.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingReminder) {
      await updateReminder.mutateAsync({ id: editingReminder.id, ...formData });
    } else {
      await createReminder.mutateAsync(formData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteReminder.mutateAsync(deletingId);
      setIsDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const getDaysUntil = (dateStr: string) => {
    const date = parseISO(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return differenceInDays(date, today);
  };

  const getDaysUntilBadge = (dateStr: string) => {
    const days = getDaysUntil(dateStr);
    
    if (days < 0) {
      return (
        <Badge variant="secondary">
          {language === 'ar' ? 'انتهى' : 'Past'}
        </Badge>
      );
    } else if (days === 0) {
      return (
        <Badge variant="destructive">
          {language === 'ar' ? 'اليوم!' : 'Today!'}
        </Badge>
      );
    } else if (days <= 3) {
      return (
        <Badge variant="destructive">
          {language === 'ar' ? `${days} أيام` : `${days} days`}
        </Badge>
      );
    } else if (days <= 7) {
      return (
        <Badge variant="default" className="bg-amber-500">
          {language === 'ar' ? `${days} أيام` : `${days} days`}
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          {language === 'ar' ? `${days} يوم` : `${days} days`}
        </Badge>
      );
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <StorefrontLayout>
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="container-luxury text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-3 mb-4"
            >
              <Bell className="w-10 h-10 text-primary" />
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
                {language === 'ar' ? 'تذكير المناسبات' : 'Occasion Reminders'}
              </h1>
            </motion.div>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {language === 'ar' 
                ? 'لا تفوّت أي مناسبة مهمة! سنذكرك قبلها بوقت كافٍ'
                : 'Never miss an important occasion! We\'ll remind you in advance'}
            </p>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container-luxury max-w-4xl">
            {/* Add Button */}
            <div className="flex justify-end mb-6">
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'إضافة تذكير' : 'Add Reminder'}
              </Button>
            </div>

            {/* Reminders List */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : reminders && reminders.length > 0 ? (
              <div className="space-y-4">
                {reminders.map((reminder) => (
                  <motion.div
                    key={reminder.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                      p-6 rounded-xl border bg-card transition-all hover:shadow-md
                      ${!reminder.is_active ? 'opacity-60' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {language === 'ar' ? reminder.title_ar : reminder.title}
                          </h3>
                          {getDaysUntilBadge(reminder.occasion_date)}
                          {reminder.is_recurring && (
                            <Badge variant="outline" className="gap-1">
                              <Repeat className="w-3 h-3" />
                              {language === 'ar' ? 'سنوي' : 'Yearly'}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(
                                parseISO(reminder.occasion_date), 
                                'PPP', 
                                { locale: language === 'ar' ? ar : enUS }
                              )}
                            </span>
                          </div>
                          
                          {reminder.recipient_name && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{reminder.recipient_name}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {language === 'ar' 
                                ? `تذكير قبل ${reminder.reminder_days_before} أيام`
                                : `Remind ${reminder.reminder_days_before} days before`}
                            </span>
                          </div>
                        </div>

                        {reminder.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {reminder.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(reminder)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingId(reminder.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Shop CTA for upcoming reminders */}
                    {getDaysUntil(reminder.occasion_date) >= 0 && getDaysUntil(reminder.occasion_date) <= 14 && (
                      <div className="mt-4 pt-4 border-t">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-2"
                          onClick={() => navigate('/collections')}
                        >
                          <Gift className="w-4 h-4" />
                          {language === 'ar' ? 'تسوق الهدايا الآن' : 'Shop Gifts Now'}
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {language === 'ar' ? 'لا توجد تذكيرات' : 'No Reminders Yet'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {language === 'ar' 
                    ? 'أضف تذكيراً بمناسبة مهمة حتى لا تنساها'
                    : 'Add a reminder for an important occasion so you don\'t forget'}
                </p>
                <Button onClick={openCreateDialog} className="gap-2">
                  <Plus className="w-4 h-4" />
                  {language === 'ar' ? 'إضافة أول تذكير' : 'Add First Reminder'}
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingReminder 
                ? (language === 'ar' ? 'تعديل التذكير' : 'Edit Reminder')
                : (language === 'ar' ? 'إضافة تذكير جديد' : 'Add New Reminder')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Birthday"
                  required
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}</Label>
                <Input
                  value={formData.title_ar}
                  onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                  placeholder="عيد ميلاد"
                  required
                  dir="rtl"
                />
              </div>
            </div>

            <div>
              <Label>{language === 'ar' ? 'تاريخ المناسبة' : 'Occasion Date'}</Label>
              <Input
                type="date"
                value={formData.occasion_date}
                onChange={(e) => setFormData({ ...formData, occasion_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>{language === 'ar' ? 'نوع المناسبة' : 'Occasion Type'}</Label>
              <Select
                value={formData.occasion_type}
                onValueChange={(value) => setFormData({ ...formData, occasion_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر النوع' : 'Select type'} />
                </SelectTrigger>
                <SelectContent>
                  {occasions?.map((occ) => (
                    <SelectItem key={occ.id} value={occ.slug}>
                      {language === 'ar' ? occ.name_ar : occ.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{language === 'ar' ? 'اسم المستلم (اختياري)' : 'Recipient Name (Optional)'}</Label>
              <Input
                value={formData.recipient_name}
                onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                placeholder={language === 'ar' ? 'محمد' : 'John'}
              />
            </div>

            <div>
              <Label>{language === 'ar' ? 'التذكير قبل (أيام)' : 'Remind Before (days)'}</Label>
              <Select
                value={String(formData.reminder_days_before)}
                onValueChange={(value) => setFormData({ ...formData, reminder_days_before: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 7, 14, 30].map((days) => (
                    <SelectItem key={days} value={String(days)}>
                      {days} {language === 'ar' ? 'يوم' : 'days'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{language === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={language === 'ar' ? 'أفكار للهدايا...' : 'Gift ideas...'}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                />
                <Label>{language === 'ar' ? 'تكرار سنوي' : 'Repeat Yearly'}</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>{language === 'ar' ? 'مفعّل' : 'Active'}</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={createReminder.isPending || updateReminder.isPending}>
                {editingReminder 
                  ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                  : (language === 'ar' ? 'إضافة' : 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'حذف التذكير' : 'Delete Reminder'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد من حذف هذا التذكير؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this reminder? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StorefrontLayout>
  );
};

export default OccasionReminders;

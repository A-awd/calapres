import React, { useState } from 'react';
import { Plus, Gauge } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAnnouncements, Announcement, AnnouncementInsert } from '@/hooks/useAnnouncements';
import { useAnnouncementSettings } from '@/hooks/useAnnouncementSettings';
import SortableAnnouncementRow from '@/components/admin/SortableAnnouncementRow';
import AnnouncementBarPreview from '@/components/admin/AnnouncementBarPreview';
import * as LucideIcons from 'lucide-react';

const iconOptions = [
  'truck', 'gift', 'percent', 'package', 'shield-check', 'badge-check',
  'lock', 'map-pin', 'headphones', 'rotate-ccw', 'star', 'sparkles',
  'heart', 'clock', 'zap', 'award', 'check-circle', 'tag'
];

const getIconComponent = (iconName: string) => {
  const pascalCase = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  const IconComponent = (LucideIcons as any)[pascalCase];
  return IconComponent || LucideIcons.Sparkles;
};

const AdminAnnouncements: React.FC = () => {
  const {
    announcements,
    isLoading,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAnnouncements();

  const { speed, updateSpeed, isUpdating: isSpeedUpdating } = useAnnouncementSettings();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [speedDialogOpen, setSpeedDialogOpen] = useState(false);
  const [tempSpeed, setTempSpeed] = useState(speed);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  const [formData, setFormData] = useState<AnnouncementInsert>({
    text: '',
    text_ar: '',
    icon: 'sparkles',
    display_order: 0,
    is_active: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = announcements.findIndex((a) => a.id === active.id);
      const newIndex = announcements.findIndex((a) => a.id === over.id);
      
      const reordered = arrayMove(announcements, oldIndex, newIndex);
      
      // Update display_order for all affected items
      reordered.forEach((announcement, index) => {
        if (announcement.display_order !== index + 1) {
          updateAnnouncement({ id: announcement.id, display_order: index + 1 });
        }
      });
    }
  };

  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setFormData({
      text: '',
      text_ar: '',
      icon: 'sparkles',
      display_order: announcements.length + 1,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      text: announcement.text,
      text_ar: announcement.text_ar,
      icon: announcement.icon,
      display_order: announcement.display_order,
      is_active: announcement.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingAnnouncement) {
      updateAnnouncement({ id: editingAnnouncement.id, ...formData });
    } else {
      createAnnouncement(formData);
    }
    setDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    if (announcementToDelete) {
      deleteAnnouncement(announcementToDelete.id);
      setDeleteDialogOpen(false);
      setAnnouncementToDelete(null);
    }
  };

  const handleToggleActive = (announcement: Announcement) => {
    updateAnnouncement({ id: announcement.id, is_active: !announcement.is_active });
  };

  const handleOpenSpeedDialog = () => {
    setTempSpeed(speed);
    setSpeedDialogOpen(true);
  };

  const handleSaveSpeed = () => {
    updateSpeed(tempSpeed);
    setSpeedDialogOpen(false);
  };

  if (isLoading) {
    return (
      <AdminLayout title="إدارة الإعلانات">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="إدارة الإعلانات">
      <div className="space-y-6">
        {/* Live Preview */}
        <AnnouncementBarPreview announcements={announcements} speed={speed} />

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-gray-500 text-sm">
              إدارة الجمل التسويقية في الشريط العلوي
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleOpenSpeedDialog} className="gap-2">
              <Gauge className="w-4 h-4" />
              سرعة الشريط
            </Button>
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة إعلان جديد
            </Button>
          </div>
        </div>

        {/* Announcements Table with Drag & Drop */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20 text-right">الترتيب</TableHead>
                  <TableHead className="w-12 text-right">الأيقونة</TableHead>
                  <TableHead className="text-right">النص بالعربية</TableHead>
                  <TableHead className="text-right">النص بالإنجليزية</TableHead>
                  <TableHead className="w-20 text-center">الحالة</TableHead>
                  <TableHead className="w-32 text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={announcements.map((a) => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {announcements.map((announcement) => (
                    <SortableAnnouncementRow
                      key={announcement.id}
                      announcement={announcement}
                      onEdit={handleOpenEdit}
                      onDelete={(a) => {
                        setAnnouncementToDelete(a);
                        setDeleteDialogOpen(true);
                      }}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </div>

        <p className="text-xs text-gray-400 text-center">
          اسحب الصفوف لإعادة ترتيب الإعلانات
        </p>

        {/* Speed Control Dialog */}
        <Dialog open={speedDialogOpen} onOpenChange={setSpeedDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5" />
                سرعة شريط الإعلانات
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>السرعة (بالثواني)</Label>
                  <span className="text-lg font-bold text-primary">{tempSpeed}s</span>
                </div>
                <Slider
                  value={[tempSpeed]}
                  onValueChange={([value]) => setTempSpeed(value)}
                  min={20}
                  max={120}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>سريع (20ث)</span>
                  <span>بطيء (120ث)</span>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                💡 القيمة تمثل الوقت الذي يستغرقه الشريط لإكمال دورة كاملة
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSpeedDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSaveSpeed} disabled={isSpeedUpdating}>
                حفظ السرعة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? 'تعديل الإعلان' : 'إضافة إعلان جديد'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>النص بالعربية *</Label>
                <Input
                  value={formData.text_ar}
                  onChange={(e) => setFormData({ ...formData, text_ar: e.target.value })}
                  placeholder="مثال: توصيل سريع خلال 24 ساعة"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>النص بالإنجليزية *</Label>
                <Input
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="Example: Fast delivery within 24 hours"
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الأيقونة</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData({ ...formData, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((icon) => {
                        const IconComp = getIconComponent(icon);
                        return (
                          <SelectItem key={icon} value={icon}>
                            <div className="flex items-center gap-2">
                              <IconComp className="w-4 h-4" />
                              <span>{icon}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الترتيب</Label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>نشط (مرئي في الموقع)</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.text || !formData.text_ar || isCreating || isUpdating}
              >
                {editingAnnouncement ? 'حفظ التعديلات' : 'إضافة'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>تأكيد الحذف</DialogTitle>
            </DialogHeader>
            <p className="text-gray-600">
              هل أنت متأكد من حذف هذا الإعلان؟
            </p>
            {announcementToDelete && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                {announcementToDelete.text_ar}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminAnnouncements;

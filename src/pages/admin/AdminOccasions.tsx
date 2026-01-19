import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, Edit, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOccasions, useDeleteOccasion, Occasion } from '@/hooks/useOccasions';
import OccasionFormDialog from '@/components/admin/OccasionFormDialog';
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog';

const AdminOccasions: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingOccasion, setEditingOccasion] = useState<Occasion | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [occasionToDelete, setOccasionToDelete] = useState<string | null>(null);

  const { data: occasions = [], isLoading } = useOccasions(true);
  const deleteOccasion = useDeleteOccasion();

  const filteredOccasions = occasions.filter(occasion =>
    occasion.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    occasion.name_ar.includes(searchQuery)
  );

  const handleEdit = (occasion: Occasion) => {
    setEditingOccasion(occasion);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setOccasionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (occasionToDelete) {
      await deleteOccasion.mutateAsync(occasionToDelete);
      setDeleteDialogOpen(false);
      setOccasionToDelete(null);
    }
  };

  return (
    <AdminLayout title="المناسبات">
      <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="البحث في المناسبات..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-9" />
        </div>
        <Button className="gap-2" onClick={() => { setEditingOccasion(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4" /> إضافة مناسبة
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">جاري تحميل المناسبات...</div>
          ) : filteredOccasions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">لا توجد مناسبات</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="p-4 text-right font-medium">المناسبة</th>
                    <th className="p-4 text-right font-medium">الرابط</th>
                    <th className="p-4 text-right font-medium">الترتيب</th>
                    <th className="p-4 text-right font-medium">الحالة</th>
                    <th className="p-4 text-right font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOccasions.map((occasion, index) => (
                    <motion.tr key={occasion.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }} className="border-b border-border hover:bg-secondary/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {occasion.icon && <span className="text-2xl">{occasion.icon}</span>}
                          <div>
                            <p className="font-medium">{occasion.name_ar}</p>
                            <p className="text-sm text-muted-foreground">{occasion.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm">{occasion.slug}</td>
                      <td className="p-4">{occasion.display_order}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-sm ${occasion.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {occasion.is_active ? 'نشط' : 'مخفي'}
                        </span>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(occasion)}><Edit className="w-4 h-4 ml-2" /> تعديل</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(occasion.id)}><Trash2 className="w-4 h-4 ml-2" /> حذف</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <OccasionFormDialog open={formOpen} onOpenChange={setFormOpen} occasion={editingOccasion} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="حذف المناسبة" description="هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء." isDeleting={deleteOccasion.isPending} />
    </AdminLayout>
  );
};

export default AdminOccasions;
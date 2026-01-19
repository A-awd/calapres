import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Shield, 
  User, 
  UserCog,
  Mail,
  Calendar,
  Loader2,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog';

interface UserWithRoles {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  roles: string[];
}

const roleLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: 'مدير النظام', color: 'bg-red-100 text-red-800', icon: ShieldCheck },
  orders_manager: { label: 'مدير الطلبات', color: 'bg-blue-100 text-blue-800', icon: ShieldAlert },
  content_editor: { label: 'محرر المحتوى', color: 'bg-green-100 text-green-800', icon: Edit },
  customer_support: { label: 'دعم العملاء', color: 'bg-purple-100 text-purple-800', icon: User },
};

type AppRole = 'admin' | 'orders_manager' | 'content_editor' | 'customer_support';

const AdminUsers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<{ userId: string; role: AppRole } | null>(null);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('orders_manager');

  const queryClient = useQueryClient();

  // جلب المستخدمين مع أدوارهم
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // جلب جميع المستخدمين الذين لديهم أدوار
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // جلب بيانات الملفات الشخصية
      const userIds = [...new Set(rolesData.map(r => r.user_id))];
      
      if (userIds.length === 0) return [];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, created_at')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // دمج البيانات
      const usersMap = new Map<string, UserWithRoles>();
      
      for (const profile of profilesData || []) {
        usersMap.set(profile.id, {
          id: profile.id,
          email: '', // سنحتاج edge function لجلب البريد
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          created_at: profile.created_at,
          roles: []
        });
      }

      for (const roleEntry of rolesData) {
        const user = usersMap.get(roleEntry.user_id);
        if (user) {
          user.roles.push(roleEntry.role);
        }
      }

      return Array.from(usersMap.values());
    }
  });

  // إضافة دور لمستخدم موجود
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'orders_manager' | 'content_editor' | 'customer_support' }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم إضافة الدور بنجاح');
      setAddRoleDialogOpen(false);
      setSelectedUserId(null);
      setSelectedRole('');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('هذا المستخدم لديه هذا الدور بالفعل');
      } else {
        toast.error('فشل في إضافة الدور');
      }
    }
  });

  // حذف دور من مستخدم
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم حذف الدور بنجاح');
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    },
    onError: () => {
      toast.error('فشل في حذف الدور');
    }
  });

  // تصفية المستخدمين
  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(searchQuery) ||
      user.roles.some(r => roleLabels[r]?.label.includes(searchQuery))
    );
  });

  const handleAddRole = () => {
    if (selectedUserId && selectedRole) {
      addRoleMutation.mutate({ userId: selectedUserId, role: selectedRole as AppRole });
    }
  };

  const handleRemoveRole = () => {
    if (roleToDelete) {
      removeRoleMutation.mutate(roleToDelete);
    }
  };

  const openAddRoleDialog = (userId: string) => {
    setSelectedUserId(userId);
    setAddRoleDialogOpen(true);
  };

  const openRemoveRoleDialog = (userId: string, role: string) => {
    setRoleToDelete({ userId, role: role as AppRole });
    setDeleteDialogOpen(true);
  };

  return (
    <AdminLayout title="إدارة المستخدمين">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between mb-6" dir="rtl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن مستخدم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
        <Button className="gap-2" onClick={() => setAddUserDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          إضافة مستخدم جديد
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" dir="rtl">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.roles.includes('admin')).length}</p>
                <p className="text-sm text-muted-foreground">مدراء النظام</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.roles.includes('orders_manager')).length}</p>
                <p className="text-sm text-muted-foreground">مدراء الطلبات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Edit className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.roles.includes('content_editor')).length}</p>
                <p className="text-sm text-muted-foreground">محررو المحتوى</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.roles.includes('customer_support')).length}</p>
                <p className="text-sm text-muted-foreground">دعم العملاء</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            المستخدمون والصلاحيات
          </CardTitle>
          <CardDescription>
            إدارة صلاحيات المستخدمين في لوحة التحكم
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">لا يوجد مستخدمون بعد</p>
              <p className="text-sm">أضف مستخدماً جديداً للبدء</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" dir="rtl">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="p-4 text-right font-medium">المستخدم</th>
                    <th className="p-4 text-right font-medium">الصلاحيات</th>
                    <th className="p-4 text-right font-medium">تاريخ الانضمام</th>
                    <th className="p-4 text-right font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-border hover:bg-secondary/30"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.first_name && user.last_name 
                                ? `${user.first_name} ${user.last_name}`
                                : 'مستخدم'
                              }
                            </p>
                            {user.phone && (
                              <p className="text-sm text-muted-foreground" dir="ltr">{user.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {user.roles.map((role) => {
                            const roleInfo = roleLabels[role];
                            if (!roleInfo) return null;
                            const Icon = roleInfo.icon;
                            return (
                              <Badge 
                                key={role} 
                                variant="secondary" 
                                className={`${roleInfo.color} gap-1`}
                              >
                                <Icon className="w-3 h-3" />
                                {roleInfo.label}
                              </Badge>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(user.created_at).toLocaleDateString('ar-SA')}
                        </div>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => openAddRoleDialog(user.id)}>
                              <Plus className="w-4 h-4 ml-2" />
                              إضافة صلاحية
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.roles.map((role) => (
                              <DropdownMenuItem 
                                key={role}
                                className="text-destructive"
                                onClick={() => openRemoveRoleDialog(user.id, role)}
                              >
                                <Trash2 className="w-4 h-4 ml-2" />
                                حذف: {roleLabels[role]?.label}
                              </DropdownMenuItem>
                            ))}
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

      {/* Add Role Dialog */}
      <Dialog open={addRoleDialogOpen} onOpenChange={setAddRoleDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة صلاحية جديدة</DialogTitle>
            <DialogDescription>
              اختر الصلاحية التي تريد إضافتها لهذا المستخدم
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الصلاحية</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر صلاحية..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <value.icon className="w-4 h-4" />
                        {value.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddRoleDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleAddRole} 
              disabled={!selectedRole || addRoleMutation.isPending}
            >
              {addRoleMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              إضافة الصلاحية
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
            <DialogDescription>
              لإضافة مستخدم كأدمن، يجب أن يكون مسجلاً في النظام أولاً. أدخل معرف المستخدم (UUID) من قاعدة البيانات.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>معرف المستخدم (UUID)</Label>
              <Input
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                يمكنك الحصول على معرف المستخدم من جدول profiles في قاعدة البيانات
              </p>
            </div>
            <div className="space-y-2">
              <Label>الصلاحية</Label>
              <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <value.icon className="w-4 h-4" />
                        {value.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => {
                if (newUserEmail && newUserRole) {
                  addRoleMutation.mutate(
                    { userId: newUserEmail, role: newUserRole },
                    {
                      onSuccess: () => {
                        setAddUserDialogOpen(false);
                        setNewUserEmail('');
                        setNewUserRole('orders_manager');
                      }
                    }
                  );
                }
              }}
              disabled={!newUserEmail || addRoleMutation.isPending}
            >
              {addRoleMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              إضافة المستخدم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleRemoveRole}
        title="حذف الصلاحية"
        description="هل أنت متأكد من حذف هذه الصلاحية من المستخدم؟ سيفقد المستخدم إمكانية الوصول إلى الميزات المرتبطة بهذه الصلاحية."
        isDeleting={removeRoleMutation.isPending}
      />
    </AdminLayout>
  );
};

export default AdminUsers;
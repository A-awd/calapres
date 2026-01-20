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
  admin: { label: 'مدير النظام', color: 'bg-red-100 text-red-700', icon: ShieldCheck },
  orders_manager: { label: 'مدير الطلبات', color: 'bg-blue-100 text-blue-700', icon: ShieldAlert },
  content_editor: { label: 'محرر المحتوى', color: 'bg-green-100 text-green-700', icon: Edit },
  customer_support: { label: 'دعم العملاء', color: 'bg-purple-100 text-purple-700', icon: User },
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

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const userIds = [...new Set(rolesData.map(r => r.user_id))];
      
      if (userIds.length === 0) return [];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, created_at')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const usersMap = new Map<string, UserWithRoles>();
      
      for (const profile of profilesData || []) {
        usersMap.set(profile.id, {
          id: profile.id,
          email: '',
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

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم إضافة الصلاحية بنجاح');
      setAddRoleDialogOpen(false);
      setSelectedUserId(null);
      setSelectedRole('');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('هذا المستخدم لديه هذه الصلاحية بالفعل');
      } else {
        toast.error('فشل في إضافة الصلاحية');
      }
    }
  });

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
      toast.success('تم حذف الصلاحية بنجاح');
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    },
    onError: () => {
      toast.error('فشل في حذف الصلاحية');
    }
  });

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
      addRoleMutation.mutate({ userId: selectedUserId, role: selectedRole });
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
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="البحث عن مستخدم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 bg-gray-50 border-gray-200 rounded-xl"
          />
        </div>
        <Button className="gap-2 bg-gray-900 hover:bg-gray-800 rounded-xl" onClick={() => setAddUserDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          إضافة مستخدم جديد
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" dir="rtl">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.roles.includes('admin')).length}</p>
                <p className="text-sm text-gray-500">مدراء النظام</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.roles.includes('orders_manager')).length}</p>
                <p className="text-sm text-gray-500">مدراء الطلبات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <Edit className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.roles.includes('content_editor')).length}</p>
                <p className="text-sm text-gray-500">محررو المحتوى</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.roles.includes('customer_support')).length}</p>
                <p className="text-sm text-gray-500">دعم العملاء</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <UserCog className="w-5 h-5" />
            المستخدمون والصلاحيات
          </CardTitle>
          <CardDescription className="text-gray-500">
            إدارة صلاحيات المستخدمين في لوحة التحكم
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center p-12">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-900">لا يوجد مستخدمون بعد</p>
              <p className="text-sm text-gray-500">أضف مستخدماً جديداً للبدء</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" dir="rtl">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 text-right font-medium text-gray-500">المستخدم</th>
                    <th className="p-4 text-right font-medium text-gray-500">الصلاحيات</th>
                    <th className="p-4 text-right font-medium text-gray-500 hidden md:table-cell">تاريخ الانضمام</th>
                    <th className="p-4 text-right font-medium text-gray-500">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.first_name && user.last_name 
                                ? `${user.first_name} ${user.last_name}`
                                : 'مستخدم'
                              }
                            </p>
                            {user.phone && (
                              <p className="text-sm text-gray-500" dir="ltr">{user.phone}</p>
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
                                className={`${roleInfo.color} gap-1 border-0`}
                              >
                                <Icon className="w-3 h-3" />
                                {roleInfo.label}
                              </Badge>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {new Date(user.created_at).toLocaleDateString('ar-SA')}
                        </div>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-900">
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
                                className="text-red-600"
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
            <DialogTitle className="text-gray-900">إضافة صلاحية جديدة</DialogTitle>
            <DialogDescription className="text-gray-500">
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
              className="bg-gray-900 hover:bg-gray-800"
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
            <DialogTitle className="text-gray-900">إضافة مستخدم جديد</DialogTitle>
            <DialogDescription className="text-gray-500">
              أدخل بريد المستخدم الموجود لإضافته كمدير
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="admin@example.com"
              />
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
                toast.info('يجب على المستخدم التسجيل أولاً ثم يمكنك إضافته من القائمة');
                setAddUserDialogOpen(false);
              }}
              className="bg-gray-900 hover:bg-gray-800"
            >
              إضافة المستخدم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleRemoveRole}
        title="حذف الصلاحية"
        description="هل أنت متأكد من حذف هذه الصلاحية من المستخدم؟"
        isDeleting={removeRoleMutation.isPending}
      />
    </AdminLayout>
  );
};

export default AdminUsers;

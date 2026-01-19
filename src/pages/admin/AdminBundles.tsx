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
import { useBundles, useDeleteBundle, Bundle } from '@/hooks/useBundles';
import BundleFormDialog from '@/components/admin/BundleFormDialog';
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog';

const AdminBundles: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bundleToDelete, setBundleToDelete] = useState<string | null>(null);

  const { data: bundles = [], isLoading } = useBundles(true);
  const deleteBundle = useDeleteBundle();

  const filteredBundles = bundles.filter(bundle =>
    bundle.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (bundle: Bundle) => {
    setEditingBundle(bundle);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setBundleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (bundleToDelete) {
      await deleteBundle.mutateAsync(bundleToDelete);
      setDeleteDialogOpen(false);
      setBundleToDelete(null);
    }
  };

  const tierColors = {
    basic: 'bg-gray-100 text-gray-800',
    premium: 'bg-blue-100 text-blue-800',
    luxury: 'bg-purple-100 text-purple-800',
  };

  return (
    <AdminLayout title="Bundles">
      <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search bundles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Button className="gap-2" onClick={() => { setEditingBundle(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4" /> Add Bundle
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading bundles...</div>
          ) : filteredBundles.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No bundles found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="p-4 text-left font-medium">Bundle</th>
                    <th className="p-4 text-left font-medium">Occasion</th>
                    <th className="p-4 text-left font-medium">Tier</th>
                    <th className="p-4 text-left font-medium">Price</th>
                    <th className="p-4 text-left font-medium">Status</th>
                    <th className="p-4 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBundles.map((bundle, index) => (
                    <motion.tr key={bundle.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }} className="border-b border-border hover:bg-secondary/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {bundle.image && <img src={bundle.image} alt={bundle.name} className="w-12 h-12 object-cover rounded-lg" />}
                          <div>
                            <p className="font-medium">{bundle.name}</p>
                            {bundle.is_featured && <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded">Featured</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{bundle.occasion?.name || '-'}</td>
                      <td className="p-4">
                        {bundle.tier && (
                          <span className={`px-2 py-1 rounded text-sm capitalize ${tierColors[bundle.tier]}`}>{bundle.tier}</span>
                        )}
                      </td>
                      <td className="p-4">{bundle.price} SAR</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-sm ${bundle.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {bundle.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(bundle)}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(bundle.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
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

      <BundleFormDialog open={formOpen} onOpenChange={setFormOpen} bundle={editingBundle} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Delete Bundle" description="Are you sure? This cannot be undone." isDeleting={deleteBundle.isPending} />
    </AdminLayout>
  );
};

export default AdminBundles;

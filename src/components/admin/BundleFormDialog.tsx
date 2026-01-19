import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bundle, BundleFormData, useCreateBundle, useUpdateBundle } from '@/hooks/useBundles';
import { useOccasions } from '@/hooks/useOccasions';
import { useProducts } from '@/hooks/useProducts';

const bundleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  occasion_id: z.string().optional(),
  tier: z.enum(['basic', 'premium', 'luxury']).optional(),
  price: z.coerce.number().min(0, 'Price must be positive'),
  original_price: z.coerce.number().optional(),
  image: z.string().optional(),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  display_order: z.coerce.number().default(0),
});

interface BundleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle?: Bundle | null;
}

interface BundleItemState {
  product_id: string;
  quantity: number;
}

const BundleFormDialog: React.FC<BundleFormDialogProps> = ({
  open,
  onOpenChange,
  bundle,
}) => {
  const { data: occasions } = useOccasions(true);
  const { data: products } = useProducts(true);
  const createBundle = useCreateBundle();
  const updateBundle = useUpdateBundle();
  const isEditing = !!bundle;

  const [bundleItems, setBundleItems] = useState<BundleItemState[]>([]);

  const form = useForm<Omit<BundleFormData, 'items'>>({
    resolver: zodResolver(bundleSchema),
    defaultValues: {
      name: '',
      name_ar: '',
      slug: '',
      description: '',
      description_ar: '',
      occasion_id: undefined,
      tier: undefined,
      price: 0,
      original_price: undefined,
      image: '',
      is_featured: false,
      is_active: true,
      display_order: 0,
    },
  });

  useEffect(() => {
    if (bundle) {
      form.reset({
        name: bundle.name,
        name_ar: bundle.name_ar,
        slug: bundle.slug,
        description: bundle.description || '',
        description_ar: bundle.description_ar || '',
        occasion_id: bundle.occasion_id || undefined,
        tier: bundle.tier || undefined,
        price: bundle.price,
        original_price: bundle.original_price || undefined,
        image: bundle.image || '',
        is_featured: bundle.is_featured,
        is_active: bundle.is_active,
        display_order: bundle.display_order,
      });
      setBundleItems(
        bundle.items?.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })) || []
      );
    } else {
      form.reset({
        name: '',
        name_ar: '',
        slug: '',
        description: '',
        description_ar: '',
        occasion_id: undefined,
        tier: undefined,
        price: 0,
        original_price: undefined,
        image: '',
        is_featured: false,
        is_active: true,
        display_order: 0,
      });
      setBundleItems([]);
    }
  }, [bundle, form]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const addItem = () => {
    setBundleItems([...bundleItems, { product_id: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setBundleItems(bundleItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BundleItemState, value: string | number) => {
    const updated = [...bundleItems];
    updated[index] = { ...updated[index], [field]: value };
    setBundleItems(updated);
  };

  const onSubmit = async (data: Omit<BundleFormData, 'items'>) => {
    try {
      const validItems = bundleItems.filter((item) => item.product_id);
      const formData: BundleFormData = {
        ...data,
        items: validItems,
      };

      if (isEditing && bundle) {
        await updateBundle.mutateAsync({ id: bundle.id, ...formData });
      } else {
        await createBundle.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Bundle' : 'Add New Bundle'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (English)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!isEditing) {
                            form.setValue('slug', generateSlug(e.target.value));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (Arabic)</FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (English)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Arabic)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="occasion_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occasion</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select occasion" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {occasions?.map((occasion) => (
                          <SelectItem key={occasion.id} value={occasion.id}>
                            {occasion.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tier</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="luxury">Luxury</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (SAR)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="original_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bundle Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Bundle Items</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
              {bundleItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={item.product_id}
                    onValueChange={(value) => updateItem(index, 'product_id', value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-20"
                    placeholder="Qty"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-6">
              <FormField
                control={form.control}
                name="is_featured"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Featured</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBundle.isPending || updateBundle.isPending}
              >
                {createBundle.isPending || updateBundle.isPending
                  ? 'Saving...'
                  : isEditing
                  ? 'Update Bundle'
                  : 'Create Bundle'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BundleFormDialog;

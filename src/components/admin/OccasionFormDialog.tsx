import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Occasion, OccasionFormData, useCreateOccasion, useUpdateOccasion } from '@/hooks/useOccasions';

const occasionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  icon: z.string().optional(),
  display_order: z.coerce.number().default(0),
  is_active: z.boolean().default(true),
});

interface OccasionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occasion?: Occasion | null;
}

const OccasionFormDialog: React.FC<OccasionFormDialogProps> = ({
  open,
  onOpenChange,
  occasion,
}) => {
  const createOccasion = useCreateOccasion();
  const updateOccasion = useUpdateOccasion();
  const isEditing = !!occasion;

  const form = useForm<OccasionFormData>({
    resolver: zodResolver(occasionSchema),
    defaultValues: {
      name: '',
      name_ar: '',
      slug: '',
      description: '',
      description_ar: '',
      icon: '',
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (occasion) {
      form.reset({
        name: occasion.name,
        name_ar: occasion.name_ar,
        slug: occasion.slug,
        description: occasion.description || '',
        description_ar: occasion.description_ar || '',
        icon: occasion.icon || '',
        display_order: occasion.display_order,
        is_active: occasion.is_active,
      });
    } else {
      form.reset({
        name: '',
        name_ar: '',
        slug: '',
        description: '',
        description_ar: '',
        icon: '',
        display_order: 0,
        is_active: true,
      });
    }
  }, [occasion, form]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const onSubmit = async (data: OccasionFormData) => {
    try {
      if (isEditing && occasion) {
        await updateOccasion.mutateAsync({ id: occasion.id, ...data });
      } else {
        await createOccasion.mutateAsync(data);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Occasion' : 'Add New Occasion'}
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
                      <Textarea {...field} rows={2} />
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
                      <Textarea {...field} rows={2} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon (emoji or URL)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="🎁 or URL" />
                    </FormControl>
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
                disabled={createOccasion.isPending || updateOccasion.isPending}
              >
                {createOccasion.isPending || updateOccasion.isPending
                  ? 'Saving...'
                  : isEditing
                  ? 'Update Occasion'
                  : 'Create Occasion'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default OccasionFormDialog;

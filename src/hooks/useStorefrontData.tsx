import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StorefrontProduct {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  image: string | null;
  category: string | null;
  categoryAr: string | null;
  isBestseller: boolean;
  isNew: boolean;
  isExpress: boolean;
  inStock: boolean;
}

export interface StorefrontCategory {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image: string | null;
  productCount: number;
}

export interface StorefrontOccasion {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  icon: string | null;
  image: string;
}

export interface StorefrontBundle {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string | null;
  descriptionAr: string | null;
  price: number;
  originalPrice: number | null;
  tier: string | null;
  image: string | null;
  tags: string[];
  occasionName: string | null;
  productCount: number;
}

// Fetch bestseller products
export const useBestsellerProducts = () => {
  return useQuery({
    queryKey: ['storefront-bestsellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, name_ar, slug, price, original_price, image,
          is_bestseller, is_new, is_express, in_stock,
          categories:category_id (name, name_ar)
        `)
        .eq('is_active', true)
        .eq('is_bestseller', true)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        slug: p.slug,
        price: p.price,
        originalPrice: p.original_price,
        image: p.image || 'https://images.unsplash.com/photo-1518882605630-8eb574205f0f?w=600',
        category: p.categories?.name || null,
        categoryAr: p.categories?.name_ar || null,
        isBestseller: p.is_bestseller,
        isNew: p.is_new,
        isExpress: p.is_express,
        inStock: p.in_stock,
      })) as StorefrontProduct[];
    },
  });
};

// Fetch categories with product counts
export const useStorefrontCategories = () => {
  return useQuery({
    queryKey: ['storefront-categories'],
    queryFn: async () => {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name, name_ar, slug, image')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(6);

      if (error) throw error;

      // Get product counts
      const { data: products } = await supabase
        .from('products')
        .select('category_id')
        .eq('is_active', true);

      const counts: Record<string, number> = {};
      (products || []).forEach((p: any) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        }
      });

      const categoryImages: Record<string, string> = {
        flowers: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800',
        chocolates: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800',
        perfumes: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800',
        gifts: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=800',
        cakes: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800',
        plants: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800',
      };

      return (categories || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        nameAr: c.name_ar,
        slug: c.slug,
        image: c.image || categoryImages[c.slug] || 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=800',
        productCount: counts[c.id] || 0,
      })) as StorefrontCategory[];
    },
  });
};

// Fetch occasions
export const useStorefrontOccasions = () => {
  return useQuery({
    queryKey: ['storefront-occasions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('occasions')
        .select('id, name, name_ar, slug, icon')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(6);

      if (error) throw error;

      const occasionImages: Record<string, string> = {
        birthday: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=600',
        wedding: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600',
        anniversary: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600',
        ramadan: 'https://images.unsplash.com/photo-1591825729269-caeb344f6df2?w=600',
        eid: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=600',
        'teachers-day': 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600',
        'mothers-day': 'https://images.unsplash.com/photo-1462275646964-a0e3571f4f5e?w=600',
        graduation: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600',
      };

      return (data || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        nameAr: o.name_ar,
        slug: o.slug,
        icon: o.icon,
        image: occasionImages[o.slug] || 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600',
      })) as StorefrontOccasion[];
    },
  });
};

// Fetch featured bundles
export const useStorefrontBundles = () => {
  return useQuery({
    queryKey: ['storefront-bundles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bundles')
        .select(`
          id, name, name_ar, slug, description, description_ar,
          price, original_price, tier, image, tags,
          occasions:occasion_id (name)
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('display_order', { ascending: true })
        .limit(4);

      if (error) throw error;

      // Get bundle item counts
      const bundleIds = (data || []).map((b: any) => b.id);
      const { data: items } = await supabase
        .from('bundle_items')
        .select('bundle_id')
        .in('bundle_id', bundleIds);

      const counts: Record<string, number> = {};
      (items || []).forEach((i: any) => {
        counts[i.bundle_id] = (counts[i.bundle_id] || 0) + 1;
      });

      return (data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        nameAr: b.name_ar,
        slug: b.slug,
        description: b.description,
        descriptionAr: b.description_ar,
        price: b.price,
        originalPrice: b.original_price,
        tier: b.tier,
        image: b.image || 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600',
        tags: b.tags || [],
        occasionName: b.occasions?.name || null,
        productCount: counts[b.id] || 0,
      })) as StorefrontBundle[];
    },
  });
};

// Fetch express products
export const useExpressProducts = () => {
  return useQuery({
    queryKey: ['storefront-express'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, name_ar, slug, price, original_price, image,
          is_bestseller, is_new, is_express, in_stock,
          categories:category_id (name, name_ar)
        `)
        .eq('is_active', true)
        .eq('is_express', true)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        slug: p.slug,
        price: p.price,
        originalPrice: p.original_price,
        image: p.image || 'https://images.unsplash.com/photo-1518882605630-8eb574205f0f?w=600',
        category: p.categories?.name || null,
        categoryAr: p.categories?.name_ar || null,
        isBestseller: p.is_bestseller,
        isNew: p.is_new,
        isExpress: p.is_express,
        inStock: p.in_stock,
      })) as StorefrontProduct[];
    },
  });
};

// Fetch products by occasion
export const useOccasionProducts = (occasionId: string) => {
  return useQuery({
    queryKey: ['occasion-products', occasionId],
    queryFn: async () => {
      const { data: productOccasions, error: poError } = await supabase
        .from('product_occasions')
        .select('product_id')
        .eq('occasion_id', occasionId);

      if (poError) throw poError;

      const productIds = (productOccasions || []).map((po: any) => po.product_id);
      
      if (productIds.length === 0) {
        // Fallback: get all active products
        const { data, error } = await supabase
          .from('products')
          .select(`
            id, name, name_ar, slug, price, original_price, image,
            is_bestseller, is_new, is_express, in_stock,
            categories:category_id (name, name_ar)
          `)
          .eq('is_active', true)
          .limit(8);

        if (error) throw error;

        return (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          nameAr: p.name_ar,
          slug: p.slug,
          price: p.price,
          originalPrice: p.original_price,
          image: p.image || 'https://images.unsplash.com/photo-1518882605630-8eb574205f0f?w=600',
          category: p.categories?.name || null,
          categoryAr: p.categories?.name_ar || null,
          isBestseller: p.is_bestseller,
          isNew: p.is_new,
          isExpress: p.is_express,
          inStock: p.in_stock,
        })) as StorefrontProduct[];
      }

      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, name_ar, slug, price, original_price, image,
          is_bestseller, is_new, is_express, in_stock,
          categories:category_id (name, name_ar)
        `)
        .eq('is_active', true)
        .in('id', productIds);

      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        slug: p.slug,
        price: p.price,
        originalPrice: p.original_price,
        image: p.image || 'https://images.unsplash.com/photo-1518882605630-8eb574205f0f?w=600',
        category: p.categories?.name || null,
        categoryAr: p.categories?.name_ar || null,
        isBestseller: p.is_bestseller,
        isNew: p.is_new,
        isExpress: p.is_express,
        inStock: p.in_stock,
      })) as StorefrontProduct[];
    },
    enabled: !!occasionId,
  });
};

// Fetch bundles by occasion
export const useOccasionBundles = (occasionId: string) => {
  return useQuery({
    queryKey: ['occasion-bundles', occasionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bundles')
        .select(`
          id, name, name_ar, slug, description, description_ar,
          price, original_price, tier, image, tags,
          occasions:occasion_id (name)
        `)
        .eq('is_active', true)
        .eq('occasion_id', occasionId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Get bundle item counts
      const bundleIds = (data || []).map((b: any) => b.id);
      const { data: items } = await supabase
        .from('bundle_items')
        .select('bundle_id')
        .in('bundle_id', bundleIds.length > 0 ? bundleIds : ['none']);

      const counts: Record<string, number> = {};
      (items || []).forEach((i: any) => {
        counts[i.bundle_id] = (counts[i.bundle_id] || 0) + 1;
      });

      return (data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        nameAr: b.name_ar,
        slug: b.slug,
        description: b.description,
        descriptionAr: b.description_ar,
        price: b.price,
        originalPrice: b.original_price,
        tier: b.tier,
        image: b.image || 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600',
        tags: b.tags || [],
        occasionName: b.occasions?.name || null,
        productCount: counts[b.id] || 0,
      })) as StorefrontBundle[];
    },
    enabled: !!occasionId,
  });
};

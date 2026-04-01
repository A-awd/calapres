import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
}

export interface ReviewFormData {
  product_id: string;
  rating: number;
  title: string;
  comment: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: { [key: number]: number };
}

// For now, use mock data since the reviews table may not exist yet in Supabase
// When you create the table, just remove the mock and uncomment the Supabase queries

const MOCK_REVIEWS: Review[] = [
  {
    id: '1',
    product_id: 'any',
    user_id: 'u1',
    user_name: 'سارة أحمد',
    rating: 5,
    title: 'رائع جداً',
    comment: 'الورد كان طازج وجميل والتوصيل سريع. أنصح بالتجربة',
    is_verified_purchase: true,
    is_approved: true,
    created_at: '2025-06-15T10:00:00Z',
  },
  {
    id: '2',
    product_id: 'any',
    user_id: 'u2',
    user_name: 'محمد العتيبي',
    rating: 4,
    title: 'جودة ممتازة',
    comment: 'التغليف فاخر والمنتج مطابق للصورة. التوصيل كان في الوقت المحدد',
    is_verified_purchase: true,
    is_approved: true,
    created_at: '2025-06-10T14:30:00Z',
  },
  {
    id: '3',
    product_id: 'any',
    user_id: 'u3',
    user_name: 'نورة الشمري',
    rating: 5,
    title: 'هدية مثالية',
    comment: 'طلبتها كهدية لأمي وانبسطت كثير. شكراً كالابريز',
    is_verified_purchase: true,
    is_approved: true,
    created_at: '2025-06-01T09:00:00Z',
  },
  {
    id: '4',
    product_id: 'any',
    user_id: 'u4',
    user_name: 'فهد القحطاني',
    rating: 3,
    title: 'جيد لكن يحتاج تحسين',
    comment: 'المنتج جيد بس التغليف كان ممكن يكون أفضل',
    is_verified_purchase: false,
    is_approved: true,
    created_at: '2025-05-20T16:00:00Z',
  },
];

export const useReviews = (productId: string) => {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      // TODO: Replace with Supabase query when reviews table is created
      // const { data, error } = await supabase
      //   .from('reviews')
      //   .select('*')
      //   .eq('product_id', productId)
      //   .eq('is_approved', true)
      //   .order('created_at', { ascending: false });
      // if (error) throw error;
      // return data as Review[];

      return MOCK_REVIEWS;
    },
    enabled: !!productId,
  });
};

export const useReviewStats = (productId: string) => {
  const { data: reviews = [] } = useReviews(productId);

  const stats: ReviewStats = {
    averageRating: reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0,
    totalReviews: reviews.length,
    distribution: {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    },
  };

  return stats;
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (review: ReviewFormData) => {
      // TODO: Replace with Supabase insert
      // const { data, error } = await supabase
      //   .from('reviews')
      //   .insert(review)
      //   .select()
      //   .single();
      // if (error) throw error;
      // return data;

      return { id: Date.now().toString(), ...review };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.product_id] });
      toast.success('تم إرسال تقييمك بنجاح! سيتم مراجعته قريباً');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إرسال التقييم');
    },
  });
};

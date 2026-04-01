import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, CheckCircle, ChevronDown, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReviews, useReviewStats, useCreateReview } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';

interface ReviewsSectionProps {
  productId: string;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ productId }) => {
  const { t, language } = useLanguage();
  const { data: reviews = [], isLoading } = useReviews(productId);
  const stats = useReviewStats(productId);
  const { user } = useAuth();
  const createReview = useCreateReview();

  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, title: '', comment: '' });

  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

  const handleSubmit = () => {
    if (!newReview.comment.trim()) return;
    createReview.mutate({
      product_id: productId,
      rating: newReview.rating,
      title: newReview.title,
      comment: newReview.comment,
    });
    setNewReview({ rating: 5, title: '', comment: '' });
    setShowForm(false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return t('اليوم', 'Today');
    if (days === 1) return t('أمس', 'Yesterday');
    if (days < 30) return `${t('منذ', '')} ${days} ${t('يوم', `days ago`)}`;
    const months = Math.floor(days / 30);
    return `${t('منذ', '')} ${months} ${t('شهر', `months ago`)}`;
  };

  if (isLoading) return null;

  return (
    <section className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-border/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-medium mb-1">
            {t('تقييمات العملاء', 'Customer Reviews')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {stats.totalReviews} {t('تقييم', 'reviews')}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-charcoal text-white text-sm tracking-wider hover:bg-charcoal/90 transition-colors rounded-sm"
        >
          {t('اكتب تقييم', 'Write a Review')}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6 sm:gap-8 mb-8 p-5 sm:p-6 bg-sand/40 rounded-lg">
        {/* Average */}
        <div className="text-center sm:text-start">
          <div className="text-4xl sm:text-5xl font-display font-medium text-foreground mb-1">
            {stats.averageRating.toFixed(1)}
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                className={`w-4 h-4 ${star <= Math.round(stats.averageRating) ? 'text-amber-400 fill-amber-400' : 'text-border'}`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('من', 'from')} {stats.totalReviews} {t('تقييم', 'reviews')}
          </p>
        </div>

        {/* Distribution Bars */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map(star => {
            const count = stats.distribution[star] || 0;
            const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-3">{star}</span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <div className="flex-1 h-2 bg-border/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.1 * (5 - star) }}
                    className="h-full bg-amber-400 rounded-full"
                  />
                </div>
                <span className="text-xs text-muted-foreground w-6 text-end">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Write Review Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="p-5 sm:p-6 border border-border/50 rounded-lg space-y-4">
              <h3 className="font-medium text-sm">{t('أضف تقييمك', 'Add Your Review')}</h3>

              {/* Star Rating */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                    className="p-0.5"
                  >
                    <Star className={`w-6 h-6 transition-colors ${
                      star <= newReview.rating ? 'text-amber-400 fill-amber-400' : 'text-border hover:text-amber-200'
                    }`} />
                  </button>
                ))}
              </div>

              {/* Title */}
              <input
                value={newReview.title}
                onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t('عنوان التقييم (اختياري)', 'Review title (optional)')}
                className="w-full px-4 py-2.5 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-gold transition-colors"
              />

              {/* Comment */}
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                placeholder={t('شاركنا تجربتك...', 'Share your experience...')}
                rows={3}
                className="w-full px-4 py-2.5 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-gold transition-colors resize-none"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!newReview.comment.trim() || createReview.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-gold text-charcoal text-sm font-medium rounded-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {t('إرسال', 'Submit')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews List */}
      <div className="space-y-0">
        {displayedReviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="py-5 border-b border-border/30 last:border-b-0"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* User & Rating */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-xs font-medium text-gold">
                    {review.user_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{review.user_name}</span>
                      {review.is_verified_purchase && (
                        <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          {t('مشتري موثق', 'Verified')}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(review.created_at)}</span>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-border'}`}
                    />
                  ))}
                </div>

                {/* Content */}
                {review.title && (
                  <p className="text-sm font-medium mb-1">{review.title}</p>
                )}
                <p className="text-sm text-foreground/80 leading-relaxed">{review.comment}</p>
              </div>

              {/* Helpful */}
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-2">
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{t('مفيد', 'Helpful')}</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Show More */}
      {reviews.length > 3 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="flex items-center gap-1 mx-auto mt-6 text-sm text-gold hover:text-gold/80 transition-colors"
        >
          {t('عرض جميع التقييمات', 'Show all reviews')}
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </section>
  );
};

export default ReviewsSection;

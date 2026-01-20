import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, X, Check, Loader2, Percent, BadgeDollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppliedCoupon } from '@/hooks/useCoupon';

interface CouponInputProps {
  onApply: (code: string) => Promise<boolean>;
  onRemove: () => void;
  appliedCoupon: AppliedCoupon | null;
  discountAmount: number;
  isValidating: boolean;
  error: string | null;
}

const CouponInput: React.FC<CouponInputProps> = ({
  onApply,
  onRemove,
  appliedCoupon,
  discountAmount,
  isValidating,
  error,
}) => {
  const { t, language } = useLanguage();
  const [code, setCode] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) return;
    const success = await onApply(code);
    if (success) {
      setCode('');
      setIsExpanded(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  if (appliedCoupon) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-50 border border-green-200 rounded-lg p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              {appliedCoupon.type === 'percentage' ? (
                <Percent className="w-5 h-5 text-green-600" />
              ) : (
                <BadgeDollarSign className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-green-800">
                  {appliedCoupon.code}
                </span>
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-sm text-green-600">
                {language === 'ar' ? appliedCoupon.nameAr : appliedCoupon.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-green-700">
              -{discountAmount.toFixed(0)} {t('ر.س', 'SAR')}
            </span>
            <button
              onClick={onRemove}
              className="p-1.5 hover:bg-green-100 rounded-full transition-colors"
              aria-label={t('إزالة الكوبون', 'Remove coupon')}
            >
              <X className="w-4 h-4 text-green-600" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Tag className="w-4 h-4" />
          {t('هل لديك كوبون خصم؟', 'Have a coupon code?')}
        </button>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  placeholder={t('أدخل رمز الكوبون', 'Enter coupon code')}
                  className={`ps-10 uppercase ${error ? 'border-red-500' : ''}`}
                  disabled={isValidating}
                />
              </div>
              <Button
                onClick={handleApply}
                disabled={isValidating || !code.trim()}
                variant="outline"
                className="shrink-0"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t('تطبيق', 'Apply')
                )}
              </Button>
              <Button
                onClick={() => {
                  setIsExpanded(false);
                  setCode('');
                }}
                variant="ghost"
                size="icon"
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-500 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                {error}
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default CouponInput;

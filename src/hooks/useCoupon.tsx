import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export interface AppliedCoupon {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxDiscount: number | null;
  minOrderAmount: number | null;
}

interface CouponValidationResult {
  valid: boolean;
  coupon?: AppliedCoupon;
  error?: string;
  errorAr?: string;
}

export const useCoupon = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateCoupon = useCallback(async (
    code: string, 
    orderTotal: number
  ): Promise<CouponValidationResult> => {
    if (!code.trim()) {
      return { 
        valid: false, 
        error: 'Please enter a coupon code',
        errorAr: 'الرجاء إدخال رمز الكوبون'
      };
    }

    setIsValidating(true);
    setError(null);

    try {
      // Fetch coupon from database
      const { data: coupon, error: fetchError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (fetchError || !coupon) {
        const result = { 
          valid: false, 
          error: 'Invalid coupon code',
          errorAr: 'رمز الكوبون غير صالح'
        };
        setError(t(result.errorAr, result.error));
        return result;
      }

      // Check validity dates
      const now = new Date();
      if (coupon.start_date && new Date(coupon.start_date) > now) {
        const result = { 
          valid: false, 
          error: 'This coupon is not yet active',
          errorAr: 'هذا الكوبون غير نشط بعد'
        };
        setError(t(result.errorAr, result.error));
        return result;
      }

      if (coupon.end_date && new Date(coupon.end_date) < now) {
        const result = { 
          valid: false, 
          error: 'This coupon has expired',
          errorAr: 'انتهت صلاحية هذا الكوبون'
        };
        setError(t(result.errorAr, result.error));
        return result;
      }

      // Check usage limits
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        const result = { 
          valid: false, 
          error: 'This coupon has reached its usage limit',
          errorAr: 'وصل هذا الكوبون إلى الحد الأقصى للاستخدام'
        };
        setError(t(result.errorAr, result.error));
        return result;
      }

      // Check minimum order amount
      if (coupon.min_order_amount && orderTotal < coupon.min_order_amount) {
        const result = { 
          valid: false, 
          error: `Minimum order amount is ${coupon.min_order_amount} SAR`,
          errorAr: `الحد الأدنى للطلب ${coupon.min_order_amount} ر.س`
        };
        setError(t(result.errorAr, result.error));
        return result;
      }

      // Coupon is valid
      const appliedCouponData: AppliedCoupon = {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        nameAr: coupon.name_ar,
        type: coupon.type as 'percentage' | 'fixed',
        value: coupon.value,
        maxDiscount: coupon.max_discount,
        minOrderAmount: coupon.min_order_amount,
      };

      setAppliedCoupon(appliedCouponData);
      setError(null);

      // Show success toast
      toast({
        title: language === 'ar' ? '✨ تم تطبيق الكوبون!' : '✨ Coupon Applied!',
        description: language === 'ar' 
          ? `تم تطبيق كوبون "${appliedCouponData.nameAr}" بنجاح` 
          : `Coupon "${appliedCouponData.name}" applied successfully`,
      });

      return { valid: true, coupon: appliedCouponData };
    } catch (err) {
      const result = { 
        valid: false, 
        error: 'Failed to validate coupon',
        errorAr: 'فشل في التحقق من الكوبون'
      };
      setError(t(result.errorAr, result.error));
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [t, language, toast]);

  const calculateDiscount = useCallback((orderTotal: number): number => {
    if (!appliedCoupon) return 0;

    let discount = 0;

    if (appliedCoupon.type === 'percentage') {
      discount = (orderTotal * appliedCoupon.value) / 100;
      // Apply max discount cap if exists
      if (appliedCoupon.maxDiscount && discount > appliedCoupon.maxDiscount) {
        discount = appliedCoupon.maxDiscount;
      }
    } else {
      // Fixed amount discount
      discount = appliedCoupon.value;
    }

    // Don't exceed order total
    return Math.min(discount, orderTotal);
  }, [appliedCoupon]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setError(null);
  }, []);

  return {
    appliedCoupon,
    isValidating,
    error,
    validateCoupon,
    calculateDiscount,
    removeCoupon,
  };
};

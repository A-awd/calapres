import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, MessageSquare, Eye, EyeOff, Ribbon as RibbonIcon, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useGiftWraps, useRibbons, GiftWrap, Ribbon } from '@/hooks/useGiftBuilder';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomizationState {
  selectedWrap: GiftWrap | null;
  selectedRibbon: Ribbon | null;
  greetingCard: string;
  showCardInput: boolean;
  hideInvoice: boolean;
}

interface ProductCustomizationOptionsProps {
  state: CustomizationState;
  onWrapChange: (wrap: GiftWrap | null) => void;
  onRibbonChange: (ribbon: Ribbon | null) => void;
  onCardChange: (card: string) => void;
  onToggleCardInput: () => void;
  onHideInvoiceChange: (hide: boolean) => void;
}

const ProductCustomizationOptions: React.FC<ProductCustomizationOptionsProps> = ({
  state,
  onWrapChange,
  onRibbonChange,
  onCardChange,
  onToggleCardInput,
  onHideInvoiceChange,
}) => {
  const { t, language } = useLanguage();
  const { data: giftWraps, isLoading: wrapsLoading } = useGiftWraps();
  const { data: ribbons, isLoading: ribbonsLoading } = useRibbons();

  const CARD_PRICE = 10;

  return (
    <div className="space-y-6 p-5 bg-secondary/50 rounded-xl border border-border/50">
      <h3 className="font-semibold flex items-center gap-2 text-lg">
        <Gift className="w-5 h-5 text-primary" />
        {t('خيارات التخصيص', 'Customization Options')}
      </h3>

      {/* Gift Wrapping Options */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Package className="w-4 h-4" />
          {t('تغليف الهدية', 'Gift Wrapping')}
        </div>
        
        {wrapsLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="w-20 h-24 flex-shrink-0 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {/* No wrap option */}
            <button
              onClick={() => onWrapChange(null)}
              className={`flex-shrink-0 w-20 flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                !state.selectedWrap
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-1">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-center">{t('بدون', 'None')}</span>
              <span className="text-xs text-muted-foreground">{t('مجاني', 'Free')}</span>
            </button>
            
            {giftWraps?.map((wrap) => (
              <button
                key={wrap.id}
                onClick={() => onWrapChange(wrap)}
                className={`flex-shrink-0 w-20 flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                  state.selectedWrap?.id === wrap.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {wrap.image ? (
                  <img
                    src={wrap.image}
                    alt={language === 'ar' ? wrap.name_ar : wrap.name}
                    className="w-12 h-12 rounded-full object-cover mb-1"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full mb-1"
                    style={{ backgroundColor: wrap.color || '#e5e5e5' }}
                  />
                )}
                <span className="text-xs text-center line-clamp-1">
                  {language === 'ar' ? wrap.name_ar : wrap.name}
                </span>
                <span className="text-xs text-primary font-medium">
                  +{wrap.price} {t('ر.س', 'SAR')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ribbon Options */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <RibbonIcon className="w-4 h-4" />
          {t('الشريط', 'Ribbon')}
        </div>
        
        {ribbonsLoading ? (
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="w-16 h-10 rounded-full" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {/* No ribbon option */}
            <button
              onClick={() => onRibbonChange(null)}
              className={`px-4 py-2 rounded-full border-2 text-sm transition-all ${
                !state.selectedRibbon
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {t('بدون', 'None')}
            </button>
            
            {ribbons?.map((ribbon) => (
              <button
                key={ribbon.id}
                onClick={() => onRibbonChange(ribbon)}
                className={`px-4 py-2 rounded-full border-2 text-sm transition-all flex items-center gap-2 ${
                  state.selectedRibbon?.id === ribbon.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {ribbon.color && (
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ribbon.color }}
                  />
                )}
                <span>{language === 'ar' ? ribbon.name_ar : ribbon.name}</span>
                {ribbon.price > 0 && (
                  <span className="text-xs text-primary">+{ribbon.price}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Greeting Card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleCardInput}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            {t('إضافة بطاقة تهنئة', 'Add Greeting Card')}
          </button>
          <span className="text-sm text-muted-foreground">
            +{CARD_PRICE} {t('ر.س', 'SAR')}
          </span>
        </div>
        
        <AnimatePresence>
          {state.showCardInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Textarea
                value={state.greetingCard}
                onChange={(e) => onCardChange(e.target.value)}
                placeholder={t('اكتب رسالتك هنا...', 'Write your message here...')}
                className="mt-2"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1 text-end">
                {state.greetingCard.length}/200
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hide Invoice */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Checkbox
          id="hideInvoice"
          checked={state.hideInvoice}
          onCheckedChange={(checked) => onHideInvoiceChange(checked as boolean)}
        />
        <Label htmlFor="hideInvoice" className="cursor-pointer flex items-center gap-2">
          {state.hideInvoice ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {t('إخفاء الفاتورة من الهدية', 'Hide invoice from gift')}
        </Label>
      </div>
    </div>
  );
};

export default ProductCustomizationOptions;

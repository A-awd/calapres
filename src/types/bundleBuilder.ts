export interface GiftBox {
  id: string;
  name: string;
  nameAr: string;
  size: 'small' | 'medium' | 'large';
  price: number;
  image: string;
  maxItems: number;
  dimensions: string;
  dimensionsAr: string;
}

export interface GiftItem {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  categoryAr: string;
  price: number;
  image: string;
}

export interface GiftWrap {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  image: string;
  color: string;
}

export interface Ribbon {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  color: string;
}

export interface BundleBuilderState {
  selectedBox: GiftBox | null;
  selectedItems: GiftItem[];
  selectedWrap: GiftWrap | null;
  selectedRibbon: Ribbon | null;
  greetingCard: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  hideInvoice: boolean;
}

export interface BundleBuilderPricing {
  boxPrice: number;
  itemsPrice: number;
  wrapPrice: number;
  ribbonPrice: number;
  cardPrice: number;
  total: number;
}

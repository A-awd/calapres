export interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  categoryAr: string;
  occasion?: string;
  occasionAr?: string;
  description: string;
  descriptionAr: string;
  inStock: boolean;
  stockCount: number;
  sku: string;
  tags: string[];
  isBestseller?: boolean;
  isNew?: boolean;
  isExpress?: boolean;
  variants?: ProductVariant[];
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: ProductVariant;
  giftWrap?: boolean;
  greetingCard?: string;
  hideInvoice?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
}

export interface Category {
  id: string;
  name: string;
  nameAr: string;
  image: string;
  slug: string;
  productCount: number;
}

export interface Occasion {
  id: string;
  name: string;
  nameAr: string;
  image: string;
  slug: string;
  color: string;
}

export interface Bundle {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number;
  image: string;
  products: Product[];
  description: string;
  descriptionAr: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  items: CartItem[];
  status: OrderStatus;
  total: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  shippingAddress: Address;
  billingAddress: Address;
  notes?: string;
  internalNotes?: string;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export interface OrderTimelineEvent {
  id: string;
  status: string;
  message: string;
  createdAt: string;
  createdBy?: string;
}

export interface Address {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder?: number;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  nameAr: string;
  text: string;
  textAr: string;
  rating: number;
  image?: string;
}

export type UserRole = 'admin' | 'orders_manager' | 'content_editor' | 'customer_support';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

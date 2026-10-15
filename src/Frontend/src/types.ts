export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
}

export interface Evaluation {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  availableStock: number;
  imageUrl: string;
  rating?: number;
  reviewCount?: number;
}

export interface ProductDetail extends Product {
  evaluations: Evaluation[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Voucher {
  id: string;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
}

export interface ApplyVoucherResult {
  code: string;
  subTotal: number;
  discountAmount: number;
  finalTotal: number;
  message: string;
}

export interface CheckoutResult {
  orderId: string;
  orderCode: number;
  subTotal?: number;
  discountAmount?: number;
  totalAmount: number;
  checkoutUrl?: string;
  qrCode?: string;
  accountNumber?: string;
  accountName?: string;
  bin?: number | string;
  paymentDescription?: string;
  expiresAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  address?: string;
  role: string;
  sessionId: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string; // Order, Payment, Promotion, System
  isRead: boolean;
  createdAt: string;
}

export interface OrderItemHistory {
  id: string;
  productId: string;
  productName: string;
  productImageUrl?: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderStatusHistory {
  status: number;
  note: string;
  timestamp: string;
}

export interface OrderHistory {
  id: string;
  orderCode: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  subTotal: number;
  discountAmount: number;
  voucherCode?: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  checkoutUrl?: string;
  items: OrderItemHistory[];
  statusHistories: OrderStatusHistory[];
}

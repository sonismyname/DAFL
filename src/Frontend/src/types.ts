export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  availableStock: number;
  imageUrl: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CheckoutResult {
  orderId: string;
  orderCode: number;
  totalAmount: number;
  checkoutUrl?: string;
  expiresAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface UserSession {
  sessionId: string;
  email: string;
  fullName: string;
}

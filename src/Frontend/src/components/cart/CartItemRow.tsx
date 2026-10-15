import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { CartItem } from '../../types';
import { formatPrice } from '../../utils/formatters';

export interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, delta: number) => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item, onUpdateQuantity }) => {
  return (
    <div className="cart-item" data-testid={`cart-item-${item.product.id}`}>
      <img
        src={item.product.imageUrl}
        alt={item.product.name}
        style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', marginRight: 12 }}
      />
      <div className="cart-item-info">
        <div className="cart-item-name" data-testid={`cart-item-name-${item.product.id}`}>
          {item.product.name}
        </div>
        <div className="cart-item-price" data-testid={`cart-item-price-${item.product.id}`}>
          {formatPrice(item.product.price)}
        </div>
      </div>
      <div className="cart-item-actions">
        <button
          className="qty-btn"
          onClick={() => onUpdateQuantity(item.product.id, -1)}
          data-testid={`cart-item-minus-${item.product.id}`}
          title="Giảm số lượng"
        >
          <Minus size={14} />
        </button>
        <span
          style={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}
          data-testid={`cart-item-qty-${item.product.id}`}
        >
          {item.quantity}
        </span>
        <button
          className="qty-btn"
          onClick={() => onUpdateQuantity(item.product.id, 1)}
          data-testid={`cart-item-plus-${item.product.id}`}
          title="Tăng số lượng"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};

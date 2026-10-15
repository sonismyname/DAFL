import React from 'react';
import { Star, Plus } from 'lucide-react';
import { Product } from '../../types';
import { formatPrice } from '../../utils/formatters';

export interface ProductCardProps {
  product: Product;
  onOpenDetail: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpenDetail,
  onAddToCart,
}) => {
  const isOutOfStock = product.availableStock <= 0;
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  return (
    <div
      className="product-card"
      onClick={() => onOpenDetail(product)}
      data-testid={`product-card-${product.id}`}
    >
      <div className="product-image-wrap">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="product-image"
          loading="lazy"
          decoding="async"
        />
        <span className="product-category-badge">{product.categoryName}</span>
        {discountPercent !== null && (
          <span className="product-discount-badge">-{discountPercent}%</span>
        )}
      </div>
      <div className="product-content">
        <h3 className="product-name" data-testid={`product-name-${product.id}`}>
          {product.name}
        </h3>
        <p className="product-desc">{product.description}</p>

        <div className="product-meta">
          <span className="product-rating">
            <Star size={13} fill="#f59e0b" color="#f59e0b" />
            {product.rating ? product.rating.toFixed(1) : '5.0'}
          </span>
          <span>•</span>
          <span>{product.reviewCount || 0} đánh giá</span>
        </div>

        <div className="product-footer">
          <div>
            <div className="product-price" data-testid={`product-price-${product.id}`}>
              {formatPrice(product.price)}
            </div>
            {product.originalPrice && (
              <div className="product-original-price">
                {formatPrice(product.originalPrice)}
              </div>
            )}
            <div className="product-stock" data-testid={`product-stock-${product.id}`}>
              {isOutOfStock ? 'Hết hàng' : `Còn ${product.availableStock} sản phẩm`}
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            disabled={isOutOfStock}
            data-testid={`add-to-cart-btn-${product.id}`}
            title={isOutOfStock ? 'Sản phẩm tạm hết hàng' : 'Thêm vào giỏ hàng'}
          >
            <Plus size={15} /> Thêm
          </button>
        </div>
      </div>
    </div>
  );
};

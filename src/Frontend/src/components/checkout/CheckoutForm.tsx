import React from 'react';
import { formatPrice } from '../../utils/formatters';

export interface CheckoutFormProps {
  customerName: string;
  setCustomerName: (val: string) => void;
  customerEmail: string;
  setCustomerEmail: (val: string) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  shippingAddress: string;
  setShippingAddress: (val: string) => void;
  finalTotal: number;
  isCheckingOut: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({
  customerName,
  setCustomerName,
  customerEmail,
  setCustomerEmail,
  customerPhone,
  setCustomerPhone,
  shippingAddress,
  setShippingAddress,
  finalTotal,
  isCheckingOut,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} data-testid="checkout-form">
      <div className="form-group">
        <label className="form-label" htmlFor="checkout-name">Họ tên người nhận</label>
        <input
          id="checkout-name"
          className="form-input"
          data-testid="checkout-name-input"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="checkout-email">Email nhận hóa đơn & thông tin giao hàng</label>
        <input
          id="checkout-email"
          className="form-input"
          type="email"
          data-testid="checkout-email-input"
          value={customerEmail}
          onChange={e => setCustomerEmail(e.target.value)}
          required
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label" htmlFor="checkout-phone">Số điện thoại</label>
          <input
            id="checkout-phone"
            className="form-input"
            data-testid="checkout-phone-input"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="checkout-address">Địa chỉ giao hàng</label>
          <input
            id="checkout-address"
            className="form-input"
            data-testid="checkout-address-input"
            value={shippingAddress}
            onChange={e => setShippingAddress(e.target.value)}
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', padding: '14px', marginTop: 10 }}
        disabled={isCheckingOut}
        data-testid="checkout-submit-btn"
      >
        {isCheckingOut ? 'Đang tạo cổng thanh toán PayOS...' : `Thanh toán trực tiếp PayOS (${formatPrice(finalTotal)})`}
      </button>
    </form>
  );
};

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckoutForm } from '../components/checkout/CheckoutForm';

describe('Checkout & Order Module - CheckoutForm Component', () => {
  const defaultProps = {
    customerName: 'Nguyễn Văn Demo',
    setCustomerName: vi.fn(),
    customerEmail: 'demo@dafl.vn',
    setCustomerEmail: vi.fn(),
    customerPhone: '0987654321',
    setCustomerPhone: vi.fn(),
    shippingAddress: 'Số 1 Đại Cồ Việt, Hà Nội',
    setShippingAddress: vi.fn(),
    finalTotal: 450000,
    isCheckingOut: false,
    onSubmit: vi.fn((e) => e.preventDefault()),
  };

  // ==========================================
  // Positive Path Test Cases (70%)
  // ==========================================
  it('TC_ORDER_01: Should render all checkout customer form inputs with initial values', () => {
    render(<CheckoutForm {...defaultProps} />);

    expect(screen.getByTestId('checkout-form')).toBeInTheDocument();
    expect(screen.getByTestId('checkout-name-input')).toHaveValue('Nguyễn Văn Demo');
    expect(screen.getByTestId('checkout-email-input')).toHaveValue('demo@dafl.vn');
    expect(screen.getByTestId('checkout-phone-input')).toHaveValue('0987654321');
    expect(screen.getByTestId('checkout-address-input')).toHaveValue('Số 1 Đại Cồ Việt, Hà Nội');
    expect(screen.getByTestId('checkout-submit-btn')).toBeInTheDocument();
  });

  it('TC_ORDER_02: Should update input values when user types', () => {
    const setCustomerName = vi.fn();
    const setCustomerPhone = vi.fn();

    render(
      <CheckoutForm
        {...defaultProps}
        setCustomerName={setCustomerName}
        setCustomerPhone={setCustomerPhone}
      />
    );

    const nameInput = screen.getByTestId('checkout-name-input');
    fireEvent.change(nameInput, { target: { value: 'Trần Thị B' } });
    expect(setCustomerName).toHaveBeenCalledWith('Trần Thị B');

    const phoneInput = screen.getByTestId('checkout-phone-input');
    fireEvent.change(phoneInput, { target: { value: '0912345678' } });
    expect(setCustomerPhone).toHaveBeenCalledWith('0912345678');
  });

  it('TC_ORDER_03: Should trigger onSubmit when clicking checkout submit button', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<CheckoutForm {...defaultProps} onSubmit={onSubmit} />);

    const submitBtn = screen.getByTestId('checkout-submit-btn');
    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  // ==========================================
  // Negative Path Test Cases (30%)
  // ==========================================
  it('TC_ORDER_04: Should disable submit button and display loading indicator while isCheckingOut is true', () => {
    render(<CheckoutForm {...defaultProps} isCheckingOut={true} />);

    const submitBtn = screen.getByTestId('checkout-submit-btn');
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent('Đang tạo cổng thanh toán PayOS...');
  });

  it('TC_ORDER_05: Should enforce required attributes on all form inputs', () => {
    render(<CheckoutForm {...defaultProps} />);

    expect(screen.getByTestId('checkout-name-input')).toBeRequired();
    expect(screen.getByTestId('checkout-email-input')).toBeRequired();
    expect(screen.getByTestId('checkout-phone-input')).toBeRequired();
    expect(screen.getByTestId('checkout-address-input')).toBeRequired();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthModal } from '../components/auth/AuthModal';

describe('Authentication Module - AuthModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    authTab: 'login' as const,
    setAuthTab: vi.fn(),
    authError: null,
    authLoading: false,
    loginEmail: '',
    setLoginEmail: vi.fn(),
    loginPassword: '',
    setLoginPassword: vi.fn(),
    registerName: '',
    setRegisterName: vi.fn(),
    registerEmail: '',
    setRegisterEmail: vi.fn(),
    registerPassword: '',
    setRegisterPassword: vi.fn(),
    registerConfirmPassword: '',
    setRegisterConfirmPassword: vi.fn(),
    registerPhone: '',
    setRegisterPhone: vi.fn(),
    registerAddress: '',
    setRegisterAddress: vi.fn(),
    onLogin: vi.fn((e) => e.preventDefault()),
    onRegister: vi.fn((e) => e.preventDefault()),
    onFillDemoAccount: vi.fn(),
  };

  // ==========================================
  // Positive Path Test Cases (70%)
  // ==========================================
  it('TC_AUTH_01: Should render login form elements by default', () => {
    render(<AuthModal {...defaultProps} />);

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    expect(screen.getByTestId('auth-tab-login')).toHaveClass('active');
    expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-submit-btn')).toHaveTextContent('Đăng nhập');
  });

  it('TC_AUTH_02: Should allow switching to register tab', () => {
    const setAuthTab = vi.fn();
    render(<AuthModal {...defaultProps} setAuthTab={setAuthTab} />);

    const registerTabBtn = screen.getByTestId('auth-tab-register');
    fireEvent.click(registerTabBtn);
    expect(setAuthTab).toHaveBeenCalledWith('register');
  });

  it('TC_AUTH_03: Should render registration form fields when authTab is register', () => {
    render(<AuthModal {...defaultProps} authTab="register" />);

    expect(screen.getByTestId('register-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('register-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('register-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('register-confirm-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('register-phone-input')).toBeInTheDocument();
    expect(screen.getByTestId('register-address-input')).toBeInTheDocument();
    expect(screen.getByTestId('register-submit-btn')).toHaveTextContent('Đăng ký ngay');
  });

  it('TC_AUTH_04: Should call onLogin when submitting valid credentials', () => {
    const onLogin = vi.fn((e) => e.preventDefault());
    render(
      <AuthModal
        {...defaultProps}
        loginEmail="demo@dafl.vn"
        loginPassword="Password123!"
        onLogin={onLogin}
      />
    );

    const submitBtn = screen.getByTestId('login-submit-btn');
    fireEvent.click(submitBtn);
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('TC_AUTH_05: Should trigger demo account quick-fill', () => {
    const onFillDemoAccount = vi.fn();
    render(<AuthModal {...defaultProps} onFillDemoAccount={onFillDemoAccount} />);

    const demoBtn = screen.getByTestId('demo-account-btn');
    fireEvent.click(demoBtn);
    expect(onFillDemoAccount).toHaveBeenCalledTimes(1);
  });

  it('TC_AUTH_06: Should call onClose when clicking close button', () => {
    const onClose = vi.fn();
    render(<AuthModal {...defaultProps} onClose={onClose} />);

    const closeBtn = screen.getByTestId('auth-close-btn');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ==========================================
  // Negative Path Test Cases (30%)
  // ==========================================
  it('TC_AUTH_07: Should display error message alert when authError is present', () => {
    const errorMessage = 'Email hoặc mật khẩu không chính xác!';
    render(<AuthModal {...defaultProps} authError={errorMessage} />);

    const errorBox = screen.getByTestId('auth-error-msg');
    expect(errorBox).toBeInTheDocument();
    expect(errorBox).toHaveTextContent(errorMessage);
  });

  it('TC_AUTH_08: Should disable submit button and show loading text when authLoading is true', () => {
    render(<AuthModal {...defaultProps} authLoading={true} />);

    const submitBtn = screen.getByTestId('login-submit-btn');
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent('Đang xử lý...');
  });

  it('TC_AUTH_09: Should not render anything when isOpen is false', () => {
    const { container } = render(<AuthModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });
});

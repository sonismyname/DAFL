import React from 'react';
import { X, ArrowLeft } from 'lucide-react';

export interface AuthModalProps {
  isOpen?: boolean;
  onClose: () => void;
  authTab: 'login' | 'register';
  setAuthTab: (tab: 'login' | 'register') => void;
  authError: string | null;
  authLoading: boolean;
  loginEmail: string;
  setLoginEmail: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  registerName: string;
  setRegisterName: (val: string) => void;
  registerEmail: string;
  setRegisterEmail: (val: string) => void;
  registerPassword: string;
  setRegisterPassword: (val: string) => void;
  registerConfirmPassword?: string;
  setRegisterConfirmPassword?: (val: string) => void;
  registerPhone: string;
  setRegisterPhone: (val: string) => void;
  registerAddress: string;
  setRegisterAddress: (val: string) => void;
  onLogin: (e: React.FormEvent) => void;
  onRegister: (e: React.FormEvent) => void;
  onFillDemoAccount?: () => void;
  isModal?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen = true,
  onClose,
  authTab,
  setAuthTab,
  authError,
  authLoading,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  registerName,
  setRegisterName,
  registerEmail,
  setRegisterEmail,
  registerPassword,
  setRegisterPassword,
  registerConfirmPassword = '',
  setRegisterConfirmPassword,
  registerPhone,
  setRegisterPhone,
  registerAddress,
  setRegisterAddress,
  onLogin,
  onRegister,
  onFillDemoAccount,
  isModal = false,
}) => {
  if (isOpen === false) return null;

  const content = (
    <div className={`auth-card ${isModal ? 'modal-content' : 'auth-page-card'}`} onClick={e => e.stopPropagation()} data-testid="auth-modal">
      <div className={isModal ? 'modal-header' : 'auth-card-header'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!isModal && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={onClose}
              data-testid="auth-close-btn"
              title="Quay lại trang chủ"
            >
              <ArrowLeft size={16} /> Trang chủ
            </button>
          )}
          <h2 className="modal-title" style={{ margin: 0 }} data-testid="auth-modal-title">
            {authTab === 'login' ? 'Đăng nhập tài khoản' : 'Đăng ký thành viên mới'}
          </h2>
        </div>
        {isModal && (
          <button className="close-btn" onClick={onClose} data-testid="auth-close-btn" title="Đóng">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="modal-tabs">
          <button
            className={`tab-btn ${authTab === 'login' ? 'active' : ''}`}
            onClick={() => setAuthTab('login')}
            data-testid="auth-tab-login"
          >
            Đăng nhập
          </button>
          <button
            className={`tab-btn ${authTab === 'register' ? 'active' : ''}`}
            onClick={() => setAuthTab('register')}
            data-testid="auth-tab-register"
          >
            Đăng ký
          </button>
        </div>

        {authError && (
          <div
            data-testid="auth-error-msg"
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid #f43f5e',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: '0.85rem'
            }}
          >
            {authError}
          </div>
        )}

        {authTab === 'login' ? (
          <form onSubmit={onLogin} data-testid="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email đăng nhập</label>
              <input
                id="login-email"
                className="form-input"
                type="email"
                data-testid="login-email-input"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Mật khẩu</label>
              <input
                id="login-password"
                className="form-input"
                type="password"
                data-testid="login-password-input"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: 10 }}
              disabled={authLoading}
              data-testid="login-submit-btn"
            >
              {authLoading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>

            {onFillDemoAccount && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                  onClick={onFillDemoAccount}
                  data-testid="demo-account-btn"
                >
                  ⚡ Dùng tài khoản Demo (demo@dafl.vn)
                </button>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={onRegister} data-testid="register-form">
            <div className="form-group">
              <label className="form-label" htmlFor="register-name">Họ và tên</label>
              <input
                id="register-name"
                className="form-input"
                data-testid="register-name-input"
                value={registerName}
                onChange={e => setRegisterName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="register-email">Email</label>
              <input
                id="register-email"
                className="form-input"
                type="email"
                data-testid="register-email-input"
                value={registerEmail}
                onChange={e => setRegisterEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="register-password">Mật khẩu</label>
              <input
                id="register-password"
                className="form-input"
                type="password"
                data-testid="register-password-input"
                value={registerPassword}
                onChange={e => setRegisterPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự, gồm chữ hoa & ký tự đặc biệt"
                required
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 6, fontSize: '0.75rem' }}>
                <span style={{ color: registerPassword.length >= 8 ? '#10b981' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: registerPassword.length >= 8 ? 600 : 400 }}>
                  {registerPassword.length >= 8 ? '✓' : '•'} Tối thiểu 8 ký tự
                </span>
                <span style={{ color: /[A-Z]/.test(registerPassword) ? '#10b981' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: /[A-Z]/.test(registerPassword) ? 600 : 400 }}>
                  {/[A-Z]/.test(registerPassword) ? '✓' : '•'} Ít nhất 1 chữ hoa (A-Z)
                </span>
                <span style={{ color: /[^a-zA-Z0-9]/.test(registerPassword) ? '#10b981' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: /[^a-zA-Z0-9]/.test(registerPassword) ? 600 : 400 }}>
                  {/[^a-zA-Z0-9]/.test(registerPassword) ? '✓' : '•'} Ít nhất 1 ký tự đặc biệt (!@#$...)
                </span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="register-confirm-password">Nhập lại mật khẩu</label>
              <input
                id="register-confirm-password"
                className="form-input"
                type="password"
                data-testid="register-confirm-password-input"
                value={registerConfirmPassword}
                onChange={e => setRegisterConfirmPassword && setRegisterConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu để xác nhận"
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="register-phone">Số điện thoại</label>
                <input
                  id="register-phone"
                  className="form-input"
                  data-testid="register-phone-input"
                  value={registerPhone}
                  onChange={e => setRegisterPhone(e.target.value)}
                  placeholder="0987654321"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="register-address">Địa chỉ</label>
                <input
                  id="register-address"
                  className="form-input"
                  data-testid="register-address-input"
                  value={registerAddress}
                  onChange={e => setRegisterAddress(e.target.value)}
                  placeholder="Hà Nội, VN"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: 10 }}
              disabled={authLoading}
              data-testid="register-submit-btn"
            >
              {authLoading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
            </button>
          </form>
        )}
      </div>
    );

  if (isModal) {
    return (
      <div className="modal-overlay" onClick={onClose} data-testid="auth-modal-overlay">
        {content}
      </div>
    );
  }

  return (
    <div className="auth-page-wrapper" data-testid="auth-page">
      {content}
    </div>
  );
};


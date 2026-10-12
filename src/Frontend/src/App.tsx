import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Sparkles, CheckCircle2, Clock, 
  CreditCard, ShieldCheck, Zap, X, Plus, Minus, ArrowRight, User
} from 'lucide-react';
import { Category, Product, CartItem, CheckoutResult, ApiResponse, UserSession } from './types';
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS } from './mockData';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout & PayOS State
  const [customerName, setCustomerName] = useState('Nguyễn Văn An');
  const [customerEmail, setCustomerEmail] = useState('demo.customer@example.com');
  const [customerPhone, setCustomerPhone] = useState('0987654321');
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>('Pending');
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);

  // User Session
  const [user, setUser] = useState<UserSession | null>(null);

  // 1. Fetch Categories & Initial Products
  useEffect(() => {
    fetchCategories();
    fetchUserSession();
  }, []);

  useEffect(() => {
    fetchProducts(selectedCategory, searchQuery);
  }, [selectedCategory, searchQuery]);

  // 2. Timer countdown for PayOS stock reservation
  useEffect(() => {
    if (!checkoutResult || orderStatus === 'Paid') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setOrderStatus('Expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [checkoutResult, orderStatus]);

  // 3. Poll order payment status
  useEffect(() => {
    if (!checkoutResult || orderStatus === 'Paid' || orderStatus === 'Expired') return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/payments/status/${checkoutResult.orderCode}`);
        const json: ApiResponse<any> = await res.json();
        if (json.success && json.data.status === 'Paid') {
          setOrderStatus('Paid');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [checkoutResult, orderStatus]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/categories`);
      const json: ApiResponse<Category[]> = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        setCategories(json.data);
      } else {
        setCategories(FALLBACK_CATEGORIES);
      }
    } catch {
      setCategories(FALLBACK_CATEGORIES);
    }
  };

  const fetchProducts = async (catId: string | null, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (catId) params.append('categoryId', catId);
      if (search) params.append('search', search);

      const res = await fetch(`${API_BASE}/api/products?${params.toString()}`);
      const json: ApiResponse<Product[]> = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        setProducts(json.data);
      } else {
        applyFallbackFilter(catId, search);
      }
    } catch {
      applyFallbackFilter(catId, search);
    } finally {
      setLoading(false);
    }
  };

  const applyFallbackFilter = (catId: string | null, search: string) => {
    let filtered = [...FALLBACK_PRODUCTS];
    if (catId) {
      filtered = filtered.filter(p => p.categoryId === catId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    setProducts(filtered);
  };

  const fetchUserSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      const json: ApiResponse<UserSession> = await res.json();
      if (json.success && json.data) setUser(json.data);
    } catch (err) {
      console.error('Auth check error:', err);
    }
  };

  const handleLoginDemo = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: customerEmail, fullName: customerName })
      });
      const json: ApiResponse<UserSession> = await res.json();
      if (json.success) setUser(json.data);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(item => item.product.id === productId ? { ...item, quantity: item.quantity + delta } : item)
      .filter(item => item.quantity > 0)
    );
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Checkout with PayOS
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsCheckingOut(true);
    try {
      const payload = {
        customerName,
        customerEmail,
        customerPhone,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        }))
      };

      const res = await fetch(`${API_BASE}/api/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json: ApiResponse<CheckoutResult> = await res.json();
      if (json.success) {
        setCheckoutResult(json.data);
        setOrderStatus('Pending');
        setTimeLeft(15 * 60);
      } else {
        alert(json.message || 'Không thể tạo đơn hàng.');
      }
    } catch (err) {
      console.warn('API checkout offline, simulating PayOS demo order:', err);
      const mockOrderCode = Number(Date.now().toString().slice(-6));
      setCheckoutResult({
        orderId: 'demo-order-' + mockOrderCode,
        orderCode: mockOrderCode,
        totalAmount,
        checkoutUrl: 'https://pay.payos.vn/web/demo-payment',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      });
      setOrderStatus('Pending');
      setTimeLeft(15 * 60);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Simulate PayOS webhook completion (Useful for instant testing without opening external bank app)
  const handleSimulatePaymentSuccess = async () => {
    if (!checkoutResult) return;
    try {
      const webhookPayload = {
        code: '00',
        desc: 'success',
        data: {
          orderCode: checkoutResult.orderCode,
          amount: checkoutResult.totalAmount,
          description: `DH ${checkoutResult.orderCode}`,
          accountNumber: '9999888877',
          reference: 'SIMULATED_TX_' + Date.now(),
          transactionDateTime: new Date().toISOString(),
          currency: 'VND',
          paymentLinkId: 'demo_link_id',
          code: '00',
          desc: 'success'
        },
        signature: 'simulated_valid_hmac_signature'
      };

      await fetch(`${API_BASE}/api/payments/payos-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });
    } catch (err) {
      console.warn('Webhook API offline, applying UI state directly:', err);
    } finally {
      setOrderStatus('Paid');
      setCart([]);
    }
  };

  const formatPrice = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <a href="/" className="brand">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
          }}>
            <ShoppingBag size={20} />
          </div>
          <span>DAFL Store</span>
          <span className="brand-badge">.NET 8 & React</span>
        </a>

        <div className="search-bar">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Tìm kiếm trong 26 hạng mục..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="header-actions">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#a5b4fc' }}>
              <User size={16} />
              <span>{user.fullName}</span>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={handleLoginDemo} title="Lưu Session ID vào HttpOnly Cookie">
              <User size={16} />
              <span>Đăng nhập demo</span>
            </button>
          )}

          <button className="btn btn-cart" onClick={() => setIsCartOpen(true)}>
            <ShoppingBag size={18} />
            <span>Giỏ hàng</span>
            {totalItemCount > 0 && <span className="cart-count">{totalItemCount}</span>}
          </button>
        </div>
      </header>

      {/* Hero Showcase */}
      <section className="hero">
        <div>
          <h1 className="hero-title">Sàn Thương Mại Điện Tử Đa Ngành</h1>
          <p className="hero-subtitle">
            Hỗ trợ 26 hạng mục hàng hóa phong phú, tích hợp cổng thanh toán <strong>PayOS QR Code</strong>, kiến trúc Vertical Slice, Redis Cache Resilient & Kafka Event Streaming.
          </p>
          <div className="hero-tags">
            <span className="tag"><Zap size={14} color="#f59e0b" /> CQRS + MediatR</span>
            <span className="tag"><ShieldCheck size={14} color="#10b981" /> PayOS HMAC-SHA256</span>
            <span className="tag"><Sparkles size={14} color="#06b6d4" /> Redis Fallback</span>
            <span className="tag"><Clock size={14} color="#6366f1" /> Giữ chỗ 15 phút</span>
          </div>
        </div>
      </section>

      {/* 26 Categories Carousel / Filter Bar */}
      <section>
        <div className="section-title">
          <span>Danh mục sản phẩm ({categories.length} hạng mục)</span>
          {selectedCategory && (
            <button 
              style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '0.85rem' }}
              onClick={() => setSelectedCategory(null)}
            >
              Xem tất cả
            </button>
          )}
        </div>

        <div className="categories-bar">
          <button 
            className={`category-pill ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            Tất cả danh mục
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id} 
              className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>Đang tải sản phẩm từ SQL Server...</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            Không tìm thấy sản phẩm nào trong danh mục này.
          </div>
        ) : (
          <div className="products-grid">
            {products.map(product => (
              <div key={product.id} className="product-card">
                <div className="product-image-wrap">
                  <img src={product.imageUrl} alt={product.name} className="product-image" />
                  <span className="product-category-badge">{product.categoryName}</span>
                </div>
                <div className="product-content">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-desc">{product.description}</p>
                  <div className="product-footer">
                    <div>
                      <div className="product-price">{formatPrice(product.price)}</div>
                      <div className="product-stock">Còn {product.availableStock} sản phẩm</div>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                      onClick={() => addToCart(product)}
                      disabled={product.availableStock <= 0}
                    >
                      <Plus size={15} /> Thêm
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cart & Checkout Modal Drawer */}
      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {checkoutResult ? 'Thanh toán đơn hàng PayOS' : 'Giỏ hàng của bạn'}
              </h2>
              <button className="close-btn" onClick={() => setIsCartOpen(false)}><X size={20} /></button>
            </div>

            {/* View 1: Cart Items & Checkout Form */}
            {!checkoutResult ? (
              <>
                {cart.length === 0 ? (
                  <p style={{ color: '#9ca3af', padding: '30px 0', textAlign: 'center' }}>Giỏ hàng đang trống.</p>
                ) : (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      {cart.map(item => (
                        <div key={item.product.id} className="cart-item">
                          <div className="cart-item-info">
                            <div className="cart-item-name">{item.product.name}</div>
                            <div className="cart-item-price">{formatPrice(item.product.price)}</div>
                          </div>
                          <div className="cart-item-actions">
                            <button className="qty-btn" onClick={() => updateQuantity(item.product.id, -1)}><Minus size={14} /></button>
                            <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                            <button className="qty-btn" onClick={() => updateQuantity(item.product.id, 1)}><Plus size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, fontSize: '1.1rem', fontWeight: 700 }}>
                      <span>Tổng tiền:</span>
                      <span style={{ color: '#10b981' }}>{formatPrice(totalAmount)}</span>
                    </div>

                    <form onSubmit={handleCheckout}>
                      <div className="form-group">
                        <label className="form-label">Họ tên người nhận</label>
                        <input className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email (để nhận hóa đơn qua Kafka)</label>
                        <input className="form-input" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Số điện thoại</label>
                        <input className="form-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required />
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 12 }} disabled={isCheckingOut}>
                        {isCheckingOut ? 'Đang tạo link PayOS...' : 'Tiến hành Thanh toán PayOS'}
                      </button>
                    </form>
                  </>
                )}
              </>
            ) : (
              /* View 2: PayOS Payment Screen with 15-minute Stock Reservation */
              <div>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div className="timer-badge">
                    <Clock size={15} /> Thời gian giữ hàng PayOS: {formatTime(timeLeft)}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: 6 }}>Mã đơn: #{checkoutResult.orderCode}</h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Tổng số tiền cần thanh toán: <strong style={{ color: '#10b981' }}>{formatPrice(checkoutResult.totalAmount)}</strong></p>
                </div>

                {orderStatus === 'Pending' && (
                  <div className="payos-box">
                    <CreditCard size={32} color="#06b6d4" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '0.9rem', marginBottom: 16 }}>
                      Hệ thống đã tạm giữ chỗ số lượng tồn kho trong 15 phút. Vui lòng quét mã QR PayOS để thanh toán.
                    </p>

                    {checkoutResult.checkoutUrl && (
                      <a 
                        href={checkoutResult.checkoutUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', marginBottom: 12 }}
                      >
                        Mở Trang Thanh Toán PayOS <ArrowRight size={16} />
                      </a>
                    )}

                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 8 }}>
                        (Chế độ thử nghiệm Demo: Click nút bên dưới để giả lập webhook PayOS gửi về xác nhận thành công)
                      </p>
                      <button 
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                        onClick={handleSimulatePaymentSuccess}
                      >
                        ⚡ Giả lập Webhook PAID (Test Kafka & Trừ kho)
                      </button>
                    </div>
                  </div>
                )}

                {orderStatus === 'Paid' && (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <CheckCircle2 size={56} color="#10b981" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.4rem', color: '#10b981', marginBottom: 8 }}>Thanh toán thành công!</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 20 }}>
                      Đơn hàng #{checkoutResult.orderCode} đã được thanh toán. Tồn kho đã được trừ vĩnh viễn và sự kiện đã được bắn lên Apache Kafka để gửi email thông báo.
                    </p>
                    <button className="btn btn-primary" onClick={() => { setCheckoutResult(null); setIsCartOpen(false); }}>
                      Tiếp tục mua hàng
                    </button>
                  </div>
                )}

                {orderStatus === 'Expired' && (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <Clock size={56} color="#f43f5e" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.3rem', color: '#f43f5e', marginBottom: 8 }}>Đơn hàng đã hết hạn giữ chỗ!</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 20 }}>
                      Đã quá 15 phút mà đơn hàng chưa được thanh toán. Số lượng tồn kho đã được hoàn trả lại cho hệ thống.
                    </p>
                    <button className="btn btn-secondary" onClick={() => { setCheckoutResult(null); }}>
                      Tạo lại đơn hàng
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

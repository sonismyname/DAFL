import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag, Search, Sparkles, CheckCircle2, Clock,
  CreditCard, ShieldCheck, Zap, X, Plus, Minus, ArrowRight,
  User as UserIcon, Bell, Star, Tag, LogOut, Check, RefreshCw, Send, Package,
  Sun, Moon, Smartphone, FileText, Truck, Layers,
  MapPin, ExternalLink, Calendar, RotateCcw, Receipt, ArrowLeft, Copy, CheckCheck, AlertCircle, ChevronDown
} from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import {
  Category, Product, ProductDetail, CartItem, Voucher,
  CheckoutResult, ApiResponse, User, NotificationItem, OrderHistory, Evaluation
} from './types';
import {
  FALLBACK_CATEGORIES, FALLBACK_PRODUCTS, FALLBACK_VOUCHERS, FALLBACK_NOTIFICATIONS
} from './mockData';
import { getProductDetailExtra } from './productDetailHelper';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function App() {
  // Navigation Routes: 'home' | 'orders' | 'profile'
  const [currentRoute, setCurrentRoute] = useState<'home' | 'orders' | 'profile'>(() => {
    const hash = window.location.hash;
    if (hash === '#/orders' || hash === '#orders') return 'orders';
    if (hash === '#/profile' || hash === '#profile') return 'profile';
    return 'home';
  });

  const navigateTo = (route: 'home' | 'orders' | 'profile') => {
    setCurrentRoute(route);
    if (route === 'home') {
      window.location.hash = '';
    } else {
      window.location.hash = `#/${route}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (route === 'orders') {
      fetchOrderHistory();
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/orders' || hash === '#orders') {
        setCurrentRoute('orders');
        fetchOrderHistory();
      } else if (hash === '#/profile' || hash === '#profile') {
        setCurrentRoute('profile');
      } else {
        setCurrentRoute('home');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Navigation & Catalogs
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Lazy Loading / Infinite Scroll on Products
  const [visibleCount, setVisibleCount] = useState(16);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // Product Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [productDetailLoading, setProductDetailLoading] = useState(false);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [modalTab, setModalTab] = useState<'description' | 'reviews'>('description');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Voucher State
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discountAmount: number } | null>(null);
  const [voucherMessage, setVoucherMessage] = useState<string | null>(null);

  // Checkout State
  const [customerName, setCustomerName] = useState('Nguyễn Văn Demo');
  const [customerEmail, setCustomerEmail] = useState('demo@dafl.vn');
  const [customerPhone, setCustomerPhone] = useState('0987654321');
  const [shippingAddress, setShippingAddress] = useState('Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội');
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>('Pending');
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);

  // Dedicated Embedded PayOS Modal for paying any pending order from order history
  const [embeddedPaymentModal, setEmbeddedPaymentModal] = useState<{
    orderCode: number;
    checkoutUrl: string;
    totalAmount: number;
  } | null>(null);

  // Orders Filter State
  const [orderFilter, setOrderFilter] = useState<'all' | 'Pending' | 'Paid' | 'Shipping' | 'Completed' | 'Cancelled'>('all');

  // Profile & Address Configuration State
  const [profileFullName, setProfileFullName] = useState('Nguyễn Văn Demo');
  const [profilePhone, setProfilePhone] = useState('0987654321');
  const [profileEmail, setProfileEmail] = useState('demo@dafl.vn');
  const [profileAddress, setProfileAddress] = useState('Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội');
  const [profileNotes, setProfileNotes] = useState('Giao hàng vào giờ hành chính, gọi điện trước khi tới.');
  const [savingProfile, setSavingProfile] = useState(false);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('demo@dafl.vn');
  const [loginPassword, setLoginPassword] = useState('Password123!');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerAddress, setRegisterAddress] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // User Account Dropdown Toggle State
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    if (isAccountDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAccountDropdownOpen]);

  // Theme State: 'light' or 'dark' (Defaulting to light, persisted in localStorage)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('dafl_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dafl_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Profile & Order History Drawer
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);

  // Notifications State & SignalR
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [toastAlert, setToastAlert] = useState<{ title: string; message: string; type: string } | null>(null);
  const signalRConnection = useRef<signalR.HubConnection | null>(null);

  // Sync profile form when user session updates
  useEffect(() => {
    if (user) {
      setProfileFullName(user.fullName || customerName);
      if (user.phoneNumber) setProfilePhone(user.phoneNumber);
      if (user.address) setProfileAddress(user.address);
      if (user.email) setProfileEmail(user.email);
    }
  }, [user]);

  // 1. Initial Load: Categories, Products, Vouchers, User Session, Notifications, Orders
  useEffect(() => {
    fetchCategories();
    fetchVouchers();
    fetchUserSession();
    fetchNotifications();
    fetchOrderHistory();
  }, []);

  // Debounce search query with 350ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchProducts(selectedCategory, debouncedSearch);
  }, [selectedCategory, debouncedSearch]);

  // Scroll-based lazy loading with IntersectionObserver
  useEffect(() => {
    if (visibleCount >= products.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount(prev => Math.min(prev + 16, products.length));
            setIsLoadingMore(false);
          }, 300);
        }
      },
      { rootMargin: '150px', threshold: 0.1 }
    );

    const el = loadMoreSentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
      observer.disconnect();
    };
  }, [visibleCount, products.length, isLoadingMore]);

  const handleLoadMore = () => {
    if (visibleCount >= products.length || isLoadingMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + 16, products.length));
      setIsLoadingMore(false);
    }, 250);
  };

  // 2. Setup SignalR Real-time WebSocket connection
  useEffect(() => {
    const hubUrl = `${API_BASE || 'http://localhost:5000'}/hubs/notifications`;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('ReceiveNotification', (notif: any) => {
      const newNotif: NotificationItem = {
        id: notif.id || 'notif-' + Date.now(),
        title: notif.title || 'Thông báo mới',
        message: notif.message || '',
        type: notif.type || 'System',
        isRead: false,
        createdAt: notif.createdAt || new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);
      showToast(newNotif.title, newNotif.message, newNotif.type);
    });

    connection.on('ReceiveOrderStatusUpdate', (code: number, status: string, message: string) => {
      if (checkoutResult && checkoutResult.orderCode === code) {
        setOrderStatus(status);
        if (status === 'Paid') setCart([]);
      }
      if (embeddedPaymentModal && embeddedPaymentModal.orderCode === code && status === 'Paid') {
        setEmbeddedPaymentModal(null);
      }
      showToast(`Đơn hàng #${code} cập nhật`, message, 'Order');
      fetchOrderHistory();
    });

    connection.start()
      .then(() => {
        console.log('[SignalR] Connected successfully to NotificationHub');
        signalRConnection.current = connection;
      })
      .catch(err => {
        console.warn('[SignalR] NotificationHub not reachable, continuing in local mode:', err);
      });

    return () => {
      connection.stop();
    };
  }, [checkoutResult, embeddedPaymentModal]);

  // 3. Timer countdown for PayOS stock reservation
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

  // 4. Poll order payment status
  useEffect(() => {
    if (!checkoutResult || orderStatus === 'Paid' || orderStatus === 'Expired') return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/payments/status/${checkoutResult.orderCode}`);
        const json: ApiResponse<any> = await res.json();
        if (json.success && json.data.status === 'Paid') {
          setOrderStatus('Paid');
          setCart([]);
          fetchOrderHistory();
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [checkoutResult, orderStatus]);

  const showToast = (title: string, message: string, type: string) => {
    setToastAlert({ title, message, type });
    setTimeout(() => {
      setToastAlert(null);
    }, 5000);
  };

  // ------------------------------------------
  // Data Fetching Helpers
  // ------------------------------------------
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

  const fetchVouchers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/vouchers`);
      const json: ApiResponse<Voucher[]> = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        setVouchers(json.data);
      } else {
        setVouchers(FALLBACK_VOUCHERS);
      }
    } catch {
      setVouchers(FALLBACK_VOUCHERS);
    }
  };

  const fetchProducts = async (catId: string | null, search: string) => {
    setLoading(true);
    setVisibleCount(16);
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
    if (catId) filtered = filtered.filter(p => p.categoryId === catId);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    setProducts(filtered);
    setVisibleCount(16);
  };

  const fetchUserSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      const json: ApiResponse<User> = await res.json();
      if (json.success && json.data) {
        setUser(json.data);
        setCustomerName(json.data.fullName);
        setCustomerEmail(json.data.email);
        if (json.data.phoneNumber) setCustomerPhone(json.data.phoneNumber);
        if (json.data.address) setShippingAddress(json.data.address);
      }
    } catch (err) {
      console.warn('Auth check offline:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`);
      const json: ApiResponse<NotificationItem[]> = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        setNotifications(json.data);
      } else {
        setNotifications(FALLBACK_NOTIFICATIONS);
      }
    } catch {
      setNotifications(FALLBACK_NOTIFICATIONS);
    }
  };

  // ------------------------------------------
  // Product Detail & Review Operations
  // ------------------------------------------
  const openProductDetail = async (product: Product) => {
    setDetailQuantity(1);
    setProductDetailLoading(true);
    setModalTab('description');
    setReviewAuthor(user?.fullName || '');
    try {
      const res = await fetch(`${API_BASE}/api/products/${product.id}`);
      const json: ApiResponse<ProductDetail> = await res.json();
      if (json.success && json.data) {
        setSelectedProduct(json.data);
      } else {
        setSelectedProduct({
          ...product,
          evaluations: [
            {
              id: 'eval-1',
              productId: product.id,
              userName: 'Trần Hoàng Nam',
              rating: 5,
              comment: 'Sản phẩm hoàn thiện rất cao cấp, dùng thực tế ưng ý hơn hình ảnh chụp!',
              createdAt: new Date(Date.now() - 86400000).toISOString()
            }
          ]
        });
      }
    } catch {
      setSelectedProduct({
        ...product,
        evaluations: [
          {
            id: 'eval-1',
            productId: product.id,
            userName: 'Khách hàng DAFL',
            rating: 5,
            comment: 'Sản phẩm chất lượng cao, đóng gói cẩn thận và giao nhanh.',
            createdAt: new Date().toISOString()
          }
        ]
      });
    } finally {
      setProductDetailLoading(false);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !reviewComment.trim()) return;

    setSubmittingReview(true);
    const author = reviewAuthor.trim() || user?.fullName || 'Khách hàng DAFL';

    try {
      const res = await fetch(`${API_BASE}/api/products/${selectedProduct.id}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          userId: user?.id,
          userName: author,
          rating: reviewRating,
          comment: reviewComment.trim()
        })
      });

      const json: ApiResponse<Evaluation> = await res.json();
      const newReview: Evaluation = json.success && json.data ? json.data : {
        id: 'eval-' + Date.now(),
        productId: selectedProduct.id,
        userName: author,
        rating: reviewRating,
        comment: reviewComment.trim(),
        createdAt: new Date().toISOString()
      };

      setSelectedProduct(prev => prev ? ({
        ...prev,
        evaluations: [newReview, ...prev.evaluations],
        reviewCount: (prev.reviewCount || 0) + 1
      }) : null);

      setReviewComment('');
      showToast('Đánh giá sản phẩm', 'Cảm ơn bạn đã gửi đánh giá cho sản phẩm!', 'System');
    } catch (err) {
      console.warn('API review offline, updating locally:', err);
      const mockEval: Evaluation = {
        id: 'eval-' + Date.now(),
        productId: selectedProduct.id,
        userName: author,
        rating: reviewRating,
        comment: reviewComment.trim(),
        createdAt: new Date().toISOString()
      };
      setSelectedProduct(prev => prev ? ({
        ...prev,
        evaluations: [mockEval, ...prev.evaluations],
        reviewCount: (prev.reviewCount || 0) + 1
      }) : null);
      setReviewComment('');
    } finally {
      setSubmittingReview(false);
    }
  };

  // ------------------------------------------
  // Cart & Voucher Operations
  // ------------------------------------------
  const addToCart = (product: Product, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(item => item.product.id === productId ? { ...item, quantity: item.quantity + delta } : item)
      .filter(item => item.quantity > 0)
    );
  };

  const rawSubTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = appliedVoucher ? appliedVoucher.discountAmount : 0;
  const finalTotal = Math.max(0, rawSubTotal - discountAmount);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleApplyVoucher = async (codeToApply?: string) => {
    const code = (codeToApply || voucherCodeInput).trim().toUpperCase();
    if (!code) return;

    try {
      const res = await fetch(`${API_BASE}/api/vouchers/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cartAmount: rawSubTotal })
      });
      const json = await res.json();

      if (json.success && json.data) {
        setAppliedVoucher({
          code: json.data.code,
          discountAmount: json.data.discountAmount
        });
        setVoucherMessage(json.data.message);
      } else {
        // Fallback local voucher calculation
        applyLocalVoucher(code);
      }
    } catch {
      applyLocalVoucher(code);
    }
  };

  const applyLocalVoucher = (code: string) => {
    const v = (vouchers.length ? vouchers : FALLBACK_VOUCHERS).find(x => x.code === code);
    if (!v) {
      setVoucherMessage('Mã giảm giá không hợp lệ.');
      return;
    }
    if (rawSubTotal < v.minOrderAmount) {
      setVoucherMessage(`Đơn hàng tối thiểu cần đạt ${formatPrice(v.minOrderAmount)} để áp dụng mã này.`);
      return;
    }
    let disc = 0;
    if (v.code === 'FORDEV') {
      disc = Math.max(0, rawSubTotal - 2000);
    } else if (v.discountType === 'Percentage') {
      disc = rawSubTotal * (v.discountValue / 100);
      if (v.maxDiscountAmount && disc > v.maxDiscountAmount) disc = v.maxDiscountAmount;
    } else {
      disc = v.discountValue;
    }
    setAppliedVoucher({ code: v.code, discountAmount: disc });
    setVoucherMessage(v.code === 'FORDEV'
      ? 'Áp dụng thành công mã FORDEV! Đơn hàng chỉ còn 2.000đ để test PayOS.'
      : `Áp dụng thành công mã ${v.code}! Giảm ${formatPrice(disc)}.`);
  };

  // ------------------------------------------
  // Checkout & PayOS
  // ------------------------------------------
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsCheckingOut(true);
    try {
      const payload = {
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        voucherCode: appliedVoucher?.code,
        userId: user?.id,
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
      if (json.success && json.data) {
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
        subTotal: rawSubTotal,
        discountAmount,
        totalAmount: finalTotal,
        checkoutUrl: 'https://pay.payos.vn/web/demo-payment',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      });
      setOrderStatus('Pending');
      setTimeLeft(15 * 60);
    } finally {
      setIsCheckingOut(false);
    }
  };

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
      showToast('Thanh toán thành công', `Đơn hàng #${checkoutResult.orderCode} đã xác nhận thanh toán qua PayOS!`, 'Payment');
    }
  };

  // ------------------------------------------
  // Auth Operations: Login, Register, Logout
  // ------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const json: ApiResponse<User> = await res.json();
      if (json.success && json.data) {
        setUser(json.data);
        setCustomerName(json.data.fullName);
        setCustomerEmail(json.data.email);
        setIsAuthModalOpen(false);
        showToast('Đăng nhập thành công', `Xin chào mừng trở lại, ${json.data.fullName}!`, 'System');
      } else {
        setAuthError(json.message || 'Email hoặc mật khẩu không chính xác.');
      }
    } catch {
      // Offline fallback demo user
      const demoUser: User = {
        id: '11111111-1111-1111-1111-111111111111',
        email: loginEmail,
        fullName: loginEmail.includes('demo') ? 'Nguyễn Văn Demo' : 'Người Dùng DAFL',
        phoneNumber: '0987654321',
        address: 'Hà Nội, Việt Nam',
        role: 'Customer',
        sessionId: 'demo-session-' + Date.now()
      };
      setUser(demoUser);
      setCustomerName(demoUser.fullName);
      setCustomerEmail(demoUser.email);
      setIsAuthModalOpen(false);
      showToast('Đăng nhập demo', `Xin chào, ${demoUser.fullName}!`, 'System');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: registerName,
          email: registerEmail,
          password: registerPassword,
          phoneNumber: registerPhone,
          address: registerAddress
        })
      });
      const json: ApiResponse<User> = await res.json();
      if (json.success && json.data) {
        setUser(json.data);
        setCustomerName(json.data.fullName);
        setCustomerEmail(json.data.email);
        setIsAuthModalOpen(false);
        showToast('Đăng ký thành công', `Chào mừng ${json.data.fullName} đến với DAFL Store!`, 'Promotion');
      } else {
        setAuthError(json.message || 'Không thể đăng ký tài khoản.');
      }
    } catch {
      const newUser: User = {
        id: 'user-' + Date.now(),
        email: registerEmail,
        fullName: registerName,
        phoneNumber: registerPhone,
        address: registerAddress,
        role: 'Customer',
        sessionId: 'session-' + Date.now()
      };
      setUser(newUser);
      setCustomerName(newUser.fullName);
      setCustomerEmail(newUser.email);
      setIsAuthModalOpen(false);
      showToast('Đăng ký thành công', `Chào mừng ${newUser.fullName} đến với DAFL!`, 'Promotion');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.warn('Logout API offline:', err);
    } finally {
      setUser(null);
      setIsProfileOpen(false);
      showToast('Đã đăng xuất', 'Hẹn gặp lại bạn!', 'System');
    }
  };

  const fetchOrderHistory = async () => {
    setOrderHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.id) params.append('userId', user.id);
      const email = user?.email || customerEmail;
      if (!user?.id && email) params.append('email', email);

      let res = await fetch(`${API_BASE}/api/orders/history?${params.toString()}`);
      let json: ApiResponse<OrderHistory[]> = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        setOrderHistory(json.data);
      } else {
        // Fallback: fetch without filters to show store demo orders
        res = await fetch(`${API_BASE}/api/orders/history`);
        json = await res.json();
        if (json.success && json.data) {
          setOrderHistory(json.data);
        }
      }
    } catch {
      setOrderHistory([]);
    } finally {
      setOrderHistoryLoading(false);
    }
  };

  const openOrderHistory = async () => {
    navigateTo('orders');
    await fetchOrderHistory();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: profileFullName,
          phoneNumber: profilePhone,
          address: profileAddress
        })
      });
      const json: ApiResponse<User> = await res.json();
      if (json.success && json.data) {
        setUser(json.data);
        setCustomerName(json.data.fullName);
        if (json.data.phoneNumber) setCustomerPhone(json.data.phoneNumber);
        if (json.data.address) setShippingAddress(json.data.address);
        showToast('Cập nhật thành công', 'Địa chỉ giao hàng đã được cập nhật thành công!', 'System');
      } else {
        setCustomerName(profileFullName);
        setCustomerPhone(profilePhone);
        setShippingAddress(profileAddress);
        setUser(prev => prev ? ({ ...prev, fullName: profileFullName, phoneNumber: profilePhone, address: profileAddress }) : null);
        showToast('Cập nhật thành công', 'Địa chỉ giao hàng đã được lưu.', 'System');
      }
      localStorage.setItem('dafl_saved_address', JSON.stringify({
        fullName: profileFullName,
        phone: profilePhone,
        address: profileAddress,
        notes: profileNotes
      }));
    } catch {
      setCustomerName(profileFullName);
      setCustomerPhone(profilePhone);
      setShippingAddress(profileAddress);
      setUser(prev => prev ? ({ ...prev, fullName: profileFullName, phoneNumber: profilePhone, address: profileAddress }) : null);
      showToast('Cập nhật thành công', 'Địa chỉ giao hàng đã được lưu.', 'System');
    } finally {
      setSavingProfile(false);
    }
  };

  const applyAddressPreset = (name: string, phone: string, address: string, note: string) => {
    setProfileFullName(name);
    setProfilePhone(phone);
    setProfileAddress(address);
    setProfileNotes(note);
    setCustomerName(name);
    setCustomerPhone(phone);
    setShippingAddress(address);
    showToast('Chọn địa chỉ', `Đã chọn: ${address.split(',')[0]}`, 'System');
  };

  const handleReorder = (order: OrderHistory) => {
    const newItems: CartItem[] = [];
    order.items.forEach(it => {
      const existingProd = products.find(p => p.id === it.productId) || {
        id: it.productId,
        name: it.productName,
        slug: it.productName.toLowerCase().replace(/\s+/g, '-'),
        categoryId: 'cat-1',
        categoryName: 'Sản phẩm',
        description: `Sản phẩm từ đơn hàng #${order.orderCode}`,
        price: it.unitPrice,
        availableStock: 99,
        imageUrl: it.productImageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'
      };
      newItems.push({ product: existingProd, quantity: it.quantity });
    });

    setCart(newItems);
    setIsCartOpen(true);
    showToast('Đã thêm vào giỏ', `Đã thêm ${newItems.length} món từ đơn #${order.orderCode} vào giỏ hàng!`, 'Promotion');
  };

  const handleSimulatePaymentForOrder = async (orderCode: number, totalAmount: number) => {
    try {
      const webhookPayload = {
        code: '00',
        desc: 'success',
        data: {
          orderCode,
          amount: totalAmount,
          description: `DH ${orderCode}`,
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
      console.warn('Webhook test offline:', err);
    } finally {
      if (checkoutResult && checkoutResult.orderCode === orderCode) {
        setOrderStatus('Paid');
        setCart([]);
      }
      if (embeddedPaymentModal && embeddedPaymentModal.orderCode === orderCode) {
        setEmbeddedPaymentModal(null);
      }
      fetchOrderHistory();
      showToast('Thanh toán thành công', `Đơn hàng #${orderCode} đã xác nhận thanh toán qua PayOS!`, 'Payment');
    }
  };

  // ------------------------------------------
  // Notifications Handlers
  // ------------------------------------------
  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, { method: 'PUT' });
    } catch (err) {
      console.warn('Mark read offline:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, { method: 'PUT' });
    } catch (err) {
      console.warn('Mark all read offline:', err);
    }
  };

  const handleSendTestSignalR = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Ưu đãi chớp nhoáng: Giảm giá 50%',
          message: 'Flash Sale giảm giá 50% cho tất cả thiết bị Smart Home trong 1 giờ tới!',
          type: 'Promotion'
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        // Will also be received via SignalR listener
      } else {
        showToast('Ưu đãi chớp nhoáng', 'Flash Sale giảm 50% đang diễn ra!', 'Promotion');
      }
    } catch {
      const fallbackNotif: NotificationItem = {
        id: 'demo-' + Date.now(),
        title: 'Khuyến mãi thành viên mới',
        message: 'Bạn có voucher giảm 20.000đ khi thanh toán đơn hàng hôm nay!',
        type: 'Promotion',
        isRead: false,
        createdAt: new Date().toISOString()
      };
      setNotifications(prev => [fallbackNotif, ...prev]);
      showToast(fallbackNotif.title, fallbackNotif.message, fallbackNotif.type);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const formatPrice = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      {/* Live Toast Notification Alert */}
      {toastAlert && (
        <div className="toast-container">
          <div className="toast-alert">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Sparkles size={16} color="#ff5722" />
              <strong style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{toastAlert.title}</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{toastAlert.message}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('home'); }} className="brand">
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #e02e24, #ff5722)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
          }}>
            <ShoppingBag size={22} />
          </div>
          <span>DAFL Store</span>
          <span className="brand-badge">Deal Giá Sốc</span>
        </a>

        {/* Search Bar with Debounce & Clear button */}
        <div className="search-bar">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Tìm kiếm sản phẩm trong 26 ngành hàng..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (currentRoute !== 'home') setCurrentRoute('home');
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', padding: 2 }}
              title="Xóa tìm kiếm"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Header Actions */}
        <div className="header-actions">
          {/* Theme Switch Toggle Button */}
          <button
            type="button"
            className="btn-theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            aria-label="Chuyển đổi giao diện Sáng / Tối"
          >
            <div className="theme-toggle-switch">
              <div className="theme-toggle-knob">
                {theme === 'dark' ? <Moon size={10} color="#1f2937" /> : <Sun size={10} color="#e02e24" />}
              </div>
            </div>
            <span>{theme === 'dark' ? 'Theme Tối' : 'Theme Sáng'}</span>
          </button>

          {/* Notification Bell */}
          <button
            className="btn-icon"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            title="Thông báo đơn hàng & khuyến mãi"
          >
            <Bell size={19} />
            {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
          </button>

          {/* User Account Button with Dropdown Toggle Menu below */}
          <div className="account-dropdown-wrapper" ref={accountDropdownRef}>
            <button
              type="button"
              className={`btn btn-secondary btn-account-toggle ${isAccountDropdownOpen ? 'active' : ''}`}
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              title="Menu tài khoản & điều hướng các trang"
            >
              <div className="account-avatar-mini">
                {(user?.fullName || profileFullName || 'D').charAt(0).toUpperCase()}
              </div>
              <span className="account-toggle-name">{user ? user.fullName : profileFullName || 'Tài khoản'}</span>
              <ChevronDown size={14} className={`dropdown-chevron ${isAccountDropdownOpen ? 'open' : ''}`} />
            </button>

            {/* Dropdown Menu directly under the account button */}
            {isAccountDropdownOpen && (
              <div className="account-dropdown-menu">
                {/* User Summary Header */}
                <div className="dropdown-user-header">
                  <div className="dropdown-user-avatar">
                    {(user?.fullName || profileFullName || 'D').charAt(0).toUpperCase()}
                  </div>
                  <div className="dropdown-user-info">
                    <div className="dropdown-user-name">
                      {user ? user.fullName : profileFullName}
                    </div>
                    <div className="dropdown-user-role">
                      <span className="brand-badge" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {user?.role || 'Khách hàng VIP'}
                      </span>
                    </div>
                    <div className="dropdown-user-email">
                      {user ? user.email : profileEmail}
                    </div>
                  </div>
                </div>

                <div className="dropdown-divider" />

                {/* Navigation Links to Pages */}
                <div className="dropdown-nav-group">
                  <div className="dropdown-group-title">Điều hướng các trang</div>
                  <button
                    type="button"
                    className={`dropdown-nav-item ${currentRoute === 'home' ? 'active' : ''}`}
                    onClick={() => {
                      navigateTo('home');
                      setIsAccountDropdownOpen(false);
                    }}
                  >
                    <ShoppingBag size={16} className="dropdown-item-icon" />
                    <span className="dropdown-item-label">Trang chủ mua sắm</span>
                    {currentRoute === 'home' && <span className="dropdown-active-dot" />}
                  </button>

                  <button
                    type="button"
                    className={`dropdown-nav-item ${currentRoute === 'orders' ? 'active' : ''}`}
                    onClick={() => {
                      navigateTo('orders');
                      setIsAccountDropdownOpen(false);
                    }}
                  >
                    <Package size={16} className="dropdown-item-icon" />
                    <span className="dropdown-item-label">Quản lý đơn mua & Lịch sử</span>
                    {orderHistory.length > 0 && (
                      <span className="dropdown-item-badge">
                        {orderHistory.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`dropdown-nav-item ${currentRoute === 'profile' ? 'active' : ''}`}
                    onClick={() => {
                      navigateTo('profile');
                      setIsAccountDropdownOpen(false);
                    }}
                  >
                    <MapPin size={16} className="dropdown-item-icon" />
                    <span className="dropdown-item-label">Cấu hình địa chỉ nhận hàng</span>
                    {currentRoute === 'profile' && <span className="dropdown-active-dot" />}
                  </button>
                </div>

                <div className="dropdown-divider" />

                {/* Quick Utilities */}
                <div className="dropdown-nav-group">
                  <div className="dropdown-group-title">Tiện ích mua sắm</div>
                  <button
                    type="button"
                    className="dropdown-nav-item"
                    onClick={() => {
                      setIsNotifOpen(true);
                      setIsAccountDropdownOpen(false);
                    }}
                  >
                    <Bell size={16} className="dropdown-item-icon" />
                    <span className="dropdown-item-label">Hộp thư thông báo</span>
                    {unreadCount > 0 && (
                      <span className="dropdown-item-badge" style={{ background: '#e02e24' }}>
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className="dropdown-nav-item"
                    onClick={() => {
                      setIsCartOpen(true);
                      setIsAccountDropdownOpen(false);
                    }}
                  >
                    <Tag size={16} className="dropdown-item-icon" />
                    <span className="dropdown-item-label">Giỏ hàng & Khuyến mãi</span>
                    {totalItemCount > 0 && (
                      <span className="dropdown-item-badge">
                        {totalItemCount}
                      </span>
                    )}
                  </button>
                </div>

                <div className="dropdown-divider" />

                {/* Footer Action */}
                <div className="dropdown-footer">
                  {user ? (
                    <button
                      type="button"
                      className="dropdown-logout-btn"
                      onClick={() => {
                        handleLogout();
                        setIsAccountDropdownOpen(false);
                      }}
                    >
                      <LogOut size={15} />
                      <span>Đăng xuất tài khoản</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '8px 14px', fontSize: '0.85rem' }}
                      onClick={() => {
                        setAuthTab('login');
                        setIsAuthModalOpen(true);
                        setIsAccountDropdownOpen(false);
                      }}
                    >
                      <UserIcon size={15} />
                      <span>Đăng nhập / Đăng ký</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cart Button */}
          <button className="btn btn-cart" onClick={() => setIsCartOpen(true)}>
            <ShoppingBag size={18} />
            <span>Giỏ hàng</span>
            {totalItemCount > 0 && <span className="badge-count" style={{ position: 'static', marginLeft: 4 }}>{totalItemCount}</span>}
          </button>
        </div>
      </header>

      {/* Home Route View */}
      {currentRoute === 'home' && (
        <>
          {/* Hero Showcase (Commercial E-Commerce Promotion) */}
          <section className="hero">
            <div className="hero-layout">
              <div className="hero-main">
                <div className="hero-top-badge">
                  <Sparkles size={14} color="#e02e24" />
                  <span>Săn Deal Giá Sốc • Mua Sắm Tiết Kiệm</span>
                </div>
                <h1 className="hero-title">
                  Sàn Thương Mại Điện Tử DAFL • Webhook Auto-Build Verified 🚀
                </h1>
                <p className="hero-subtitle">
                  <strong>Càng Mua Càng Rẻ</strong> — Mua sắm thông minh, ngập tràn deal sốc mỗi ngày! Khám phá 26 ngành hàng đa dạng từ Thời trang, Điện thoại, Gia dụng đến Hàng tiêu dùng với mức giá ưu đãi nhất thị trường và bảo đảm quyền lợi người mua 100%.
                </p>
                <div className="hero-tags">
                  <span className="tag"><Zap size={14} color="#e02e24" /> Flash Sale Giảm Đến 50%</span>
                  <span className="tag"><ShieldCheck size={14} color="#10b981" /> Đảm Bảo Chính Hãng 100%</span>
                  <span className="tag"><Tag size={14} color="#e02e24" /> Voucher Giảm 20K & 10%</span>
                  <span className="tag"><Clock size={14} color="#f59e0b" /> Đổi Trả Miễn Phí 7 Ngày</span>
                  <span className="tag"><ShoppingBag size={14} color="#ff5722" /> Giao Hàng Toàn Quốc 24/7</span>
                </div>
                <div className="hero-actions">
                  <button
                    className="hero-pdd-cta"
                    onClick={() => {
                      const el = document.getElementById('products-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <ShoppingBag size={18} />
                    <span>Săn Deal Hot Ngay</span>
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{
                      borderRadius: 9999,
                      padding: '12px 20px',
                      color: theme === 'light' ? '#ffffff' : 'var(--text-main)',
                      borderColor: theme === 'light' ? 'rgba(255,255,255,0.45)' : 'var(--border-subtle)',
                      background: theme === 'light' ? 'rgba(255,255,255,0.22)' : 'var(--btn-secondary-bg)'
                    }}
                    onClick={() => setSelectedCategory(null)}
                  >
                    <span>Xem 26 Ngành Hàng</span>
                  </button>
                </div>
              </div>

              {/* Promotion Card Showcase */}
              <div className="hero-showcase-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8, fontSize: '0.85rem', fontWeight: 800 }}>
                  <Tag size={16} />
                  <span>Ưu Đãi Đặc Quyền Hôm Nay</span>
                </div>
                <div className="phone-screen-inner">
                  <div style={{ background: '#e02e24', color: '#fff', padding: '6px 10px', borderRadius: 6, fontWeight: 800, fontSize: '0.8rem', marginBottom: 8 }}>
                    🎉 TẶNG VOUCHER 20K ĐƠN ĐẦU
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#4b5563', lineHeight: 1.4, marginBottom: 8 }}>
                    Nhập mã <strong>DAFL20</strong> khi thanh toán để được giảm ngay 20.000đ cho đơn hàng của bạn!
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#e02e24', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                      Freeship 0Đ
                    </span>
                    <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#e02e24', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                      Deal Đồng Giá 9K
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 26 Categories Carousel / Filter Bar */}
          <section>
            <div className="section-title">
              <span>Danh mục ngành hàng ({categories.length} hạng mục)</span>
              {selectedCategory && (
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
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
                  <span style={{ marginRight: 6 }}>{cat.iconUrl || '📦'}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </section>

          {/* Products Grid */}
          <section id="products-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {selectedCategory ? (categories.find(c => c.id === selectedCategory)?.name || 'Danh mục sản phẩm') : 'Tất cả sản phẩm'}
              </h2>
              {products.length > 0 && (
                <div className="product-count-badge">
                  <Package size={14} color="var(--primary)" />
                  <span>Hiển thị {Math.min(visibleCount, products.length)} / {products.length} sản phẩm</span>
                </div>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                <RefreshCw size={24} className="spin" style={{ display: 'inline-block', marginBottom: 8 }} />
                <div>Đang tải danh sách sản phẩm...</div>
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                Không tìm thấy sản phẩm nào phù hợp với tìm kiếm.
              </div>
            ) : (
              <>
                <div className="products-grid">
                  {products.slice(0, visibleCount).map(product => (
                    <div
                      key={product.id}
                      className="product-card"
                      onClick={() => openProductDetail(product)}
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
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="product-discount-badge">
                            -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="product-content">
                        <h3 className="product-name">{product.name}</h3>
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
                            <div className="product-price">{formatPrice(product.price)}</div>
                            {product.originalPrice && (
                              <div className="product-original-price">{formatPrice(product.originalPrice)}</div>
                            )}
                            <div className="product-stock">Còn {product.availableStock} sản phẩm</div>
                          </div>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                            disabled={product.availableStock <= 0}
                          >
                            <Plus size={15} /> Thêm
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Scroll Sentinel for Infinite Scroll Lazy Loading */}
                <div ref={loadMoreSentinelRef} style={{ height: 24 }} />

                {/* Lazy Load Spinner */}
                {isLoadingMore && (
                  <div className="lazy-load-indicator">
                    <RefreshCw size={20} className="spin" />
                    <span>Đang tải thêm sản phẩm khi cuộn...</span>
                  </div>
                )}

                {/* Manual Load More Button as Fallback */}
                {!isLoadingMore && visibleCount < products.length && (
                  <div style={{ textAlign: 'center', margin: '16px 0 28px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={handleLoadMore}
                      style={{ padding: '10px 24px', borderRadius: 999, fontSize: '0.875rem' }}
                    >
                      Tải thêm {Math.min(16, products.length - visibleCount)} sản phẩm tiếp theo
                    </button>
                  </div>
                )}

                {/* End of list state */}
                {visibleCount >= products.length && products.length > 0 && (
                  <div className="lazy-load-end">
                    <CheckCircle2 size={18} color="#10b981" />
                    <span>Bạn đã xem toàn bộ {products.length} sản phẩm</span>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}

      {/* ============================================================== */}
      {/* ROUTE VIEW: ORDERS & ORDER HISTORY (#/orders) */}
      {/* ============================================================== */}
      {currentRoute === 'orders' && (
        <section className="orders-page">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => navigateTo('home')}
                >
                  <ArrowLeft size={16} /> Tiếp tục mua sắm
                </button>
                <h1 className="page-title" style={{ margin: 0 }}>
                  <Package size={26} color="var(--primary)" /> Quản lý Đơn Mua & Lịch Sử Đơn Hàng
                </h1>
              </div>
              <p className="page-subtitle" style={{ marginTop: 6 }}>
                Theo dõi tiến độ đơn hàng, thanh toán trực tiếp qua PayOS trên web và kiểm tra trạng thái thời gian thực.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={fetchOrderHistory}
                disabled={orderHistoryLoading}
                style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={15} className={orderHistoryLoading ? 'spin' : ''} />
                Làm mới danh sách
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigateTo('profile')}
                style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <MapPin size={15} color="#e02e24" /> Cấu hình địa chỉ nhận hàng
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="order-filter-tabs">
            {[
              { key: 'all', label: `Tất cả (${orderHistory.length})` },
              { key: 'Pending', label: `Chờ thanh toán (${orderHistory.filter(o => o.status === 'Pending').length})` },
              { key: 'Paid', label: `Đã thanh toán (${orderHistory.filter(o => o.status === 'Paid').length})` },
              { key: 'Shipping', label: `Đang giao hàng (${orderHistory.filter(o => o.status === 'Shipping').length})` },
              { key: 'Completed', label: `Hoàn tất (${orderHistory.filter(o => o.status === 'Completed').length})` },
              { key: 'Cancelled', label: `Đã hủy (${orderHistory.filter(o => o.status === 'Cancelled').length})` }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                className={`order-filter-btn ${orderFilter === tab.key ? 'active' : ''}`}
                onClick={() => setOrderFilter(tab.key as any)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Orders List */}
          {orderHistoryLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <RefreshCw size={36} className="spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
              <p>Đang tải danh sách đơn hàng từ máy chủ...</p>
            </div>
          ) : orderHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
              <Package size={56} style={{ margin: '0 auto 14px', opacity: 0.3, color: 'var(--text-muted)' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>Bạn chưa có đơn hàng nào</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
                Khám phá ngay các ưu đãi giảm giá và sản phẩm nổi bật tại DAFL Store!
              </p>
              <button type="button" className="btn btn-primary" onClick={() => navigateTo('home')}>
                <ShoppingBag size={16} /> Mua sắm ngay
              </button>
            </div>
          ) : (
            <div className="orders-list-container">
              {orderHistory
                .filter(o => orderFilter === 'all' || o.status === orderFilter)
                .map(order => {
                  const statusClass = order.status.toLowerCase();
                  return (
                    <div key={order.id} className="order-card">
                      {/* Order Card Header */}
                      <div className="order-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                            Mã đơn: #{order.orderCode}
                          </span>
                          <span className={`order-status-badge ${statusClass}`}>
                            {order.status === 'Paid' && <CheckCircle2 size={13} />}
                            {order.status === 'Pending' && <Clock size={13} />}
                            {order.status === 'Shipping' && <Truck size={13} />}
                            {order.status === 'Completed' && <CheckCircle2 size={13} />}
                            {order.status === 'Paid' ? 'Đã thanh toán (PayOS)' :
                              order.status === 'Pending' ? 'Chờ thanh toán' :
                                order.status === 'Shipping' ? 'Đang giao hàng' :
                                  order.status === 'Completed' ? 'Giao thành công' :
                                    order.status === 'Cancelled' ? 'Đã hủy' : order.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={14} /> {new Date(order.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </div>

                      {/* Recipient & Shipping Address */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 8, marginBottom: 14, fontSize: '0.85rem' }}>
                        <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <strong>{order.customerName}</strong> ({order.customerPhone}) — <span style={{ color: 'var(--text-muted)' }}>{order.shippingAddress}</span>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="order-items-list">
                        {order.items && order.items.map(item => (
                          <div key={item.id} className="order-item-row">
                            <img
                              src={item.productImageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'}
                              alt={item.productName}
                              className="order-item-img"
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
                                {item.productName}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Số lượng: x{item.quantity} • Đơn giá: {formatPrice(item.unitPrice)}
                              </div>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                              {formatPrice(item.unitPrice * item.quantity)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Status Timeline (If exists) */}
                      {order.statusHistories && order.statusHistories.length > 0 && (
                        <div className="order-timeline-box">
                          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Tiến trình trạng thái đơn hàng:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {order.statusHistories.map((h, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                                <CheckCircle2 size={12} color="#10b981" />
                                <span>{new Date(h.timestamp).toLocaleTimeString('vi-VN')}</span>
                                <span style={{ fontWeight: 600 }}>{h.note || 'Cập nhật trạng thái'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Order Footer & Actions */}
                      <div className="order-footer-actions">
                        <div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {order.discountAmount > 0 && (
                              <span>
                                Đã giảm <strong style={{ color: '#10b981' }}>-{formatPrice(order.discountAmount)}</strong>
                                {order.voucherCode ? ` (Mã: ${order.voucherCode})` : ''} •
                              </span>
                            )}
                            {' '}Tổng giá trị đơn: <strong style={{ color: '#e02e24', fontSize: '1.15rem' }}>{formatPrice(order.totalAmount)}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {order.status === 'Pending' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                onClick={() => {
                                  if (order.checkoutUrl) {
                                    setEmbeddedPaymentModal({
                                      orderCode: order.orderCode,
                                      checkoutUrl: order.checkoutUrl,
                                      totalAmount: order.totalAmount
                                    });
                                  } else {
                                    showToast('Thông báo', `Đơn hàng #${order.orderCode} đang đợi thanh toán PayOS.`, 'Order');
                                  }
                                }}
                              >
                                <CreditCard size={15} /> Thanh toán ngay (PayOS trực tiếp)
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                                onClick={() => handleSimulatePaymentForOrder(order.orderCode, order.totalAmount)}
                                title="Mô phỏng Webhook thanh toán thành công"
                              >
                                ⚡ Test PayOS
                              </button>
                            </>
                          )}

                          {(order.status === 'Paid' || order.status === 'Completed') && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                              onClick={() => handleReorder(order)}
                            >
                              <RotateCcw size={14} /> Mua lại đơn này
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      )}

      {/* ============================================================== */}
      {/* ROUTE VIEW: SHIPPING ADDRESS & PROFILE (#/profile) */}
      {/* ============================================================== */}
      {currentRoute === 'profile' && (
        <section className="profile-page">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => navigateTo('home')}
                >
                  <ArrowLeft size={16} /> Trang chủ
                </button>
                <h1 className="page-title" style={{ margin: 0 }}>
                  <MapPin size={26} color="var(--primary)" /> Cấu hình Địa Chỉ & Thông Tin Nhận Hàng
                </h1>
              </div>
              <p className="page-subtitle" style={{ marginTop: 6 }}>
                Thông tin này sẽ được lưu trữ an toàn và tự động điền sẵn vào đơn hàng của bạn khi đặt mua và thanh toán PayOS.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigateTo('orders')}
              style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Package size={15} /> Xem lịch sử đơn mua ({orderHistory.length})
            </button>
          </div>

          <div className="profile-card">
            {/* User Avatar & Session Info */}
            <div className="profile-avatar-banner">
              <div className="profile-avatar-circle">
                {profileFullName.charAt(0) || 'D'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{profileFullName}</h3>
                  <span className="brand-badge" style={{ fontSize: '0.75rem' }}>
                    {user?.role || 'Khách hàng VIP'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                  {profileEmail} • Tài khoản DAFL Store
                </p>
              </div>

              {user && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ color: '#f87171', borderColor: 'rgba(244, 63, 94, 0.3)', fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={handleLogout}
                >
                  <LogOut size={14} /> Đăng xuất
                </button>
              )}
            </div>

            {/* Quick Address Presets */}
            <div style={{ marginBottom: 24, padding: 14, background: 'var(--bg-subtle)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)' }}>
                <Sparkles size={15} /> Điền nhanh các địa chỉ mẫu thường dùng:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.775rem', padding: '6px 12px' }}
                  onClick={() => applyAddressPreset(
                    'Nguyễn Văn Demo',
                    '0987654321',
                    'Số 1 Đại Cồ Việt, P. Bách Khoa, Q. Hai Bà Trưng, Hà Nội',
                    'Giao tại sảnh tòa nhà B1 ĐH Bách Khoa'
                  )}
                >
                  📍 ĐH Bách Khoa Hà Nội
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.775rem', padding: '6px 12px' }}
                  onClick={() => applyAddressPreset(
                    'Trần Minh Khang',
                    '0912345678',
                    'Tòa nhà Keangnam Landmark 72, Đường Phạm Hùng, Q. Nam Từ Liêm, Hà Nội',
                    'Giao giờ hành chính, gọi trước 15 phút'
                  )}
                >
                  🏢 Keangnam Landmark 72
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.775rem', padding: '6px 12px' }}
                  onClick={() => applyAddressPreset(
                    'Lê Hoàng Long',
                    '0908765432',
                    'Tòa tháp Bitexco Financial Tower, Số 2 Hải Triều, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh',
                    'Giao hàng tại quầy lễ tân tầng trệt'
                  )}
                >
                  🏙️ Bitexco Quận 1, TP.HCM
                </button>
              </div>
            </div>

            {/* Address Configuration Form */}
            <form onSubmit={handleSaveProfile}>
              <div className="address-form-grid">
                <div className="form-group">
                  <label className="form-label">Họ và tên người nhận hàng</label>
                  <input
                    className="form-input"
                    value={profileFullName}
                    onChange={e => setProfileFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Số điện thoại liên hệ</label>
                  <input
                    className="form-input"
                    value={profilePhone}
                    onChange={e => setProfilePhone(e.target.value)}
                    placeholder="0987654321"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email nhận hóa đơn & thông báo</label>
                <input
                  className="form-input"
                  type="email"
                  value={profileEmail}
                  onChange={e => setProfileEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Địa chỉ giao hàng chi tiết (Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành)</label>
                <input
                  className="form-input"
                  value={profileAddress}
                  onChange={e => setProfileAddress(e.target.value)}
                  placeholder="Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú giao hàng mặc định</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={profileNotes}
                  onChange={e => setProfileNotes(e.target.value)}
                  placeholder="Ví dụ: Giao giờ hành chính, gọi điện trước khi giao..."
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigateTo('home')}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 8 }}
                  disabled={savingProfile}
                >
                  <Check size={16} /> {savingProfile ? 'Đang lưu vào hệ thống...' : 'Lưu thông tin địa chỉ'}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: Product Detail & Evaluation (Reviews) Modal */}
      {/* ============================================================== */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content modal-content-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="product-category-badge" style={{ position: 'static' }}>
                {selectedProduct.categoryName}
              </span>
              <button className="close-btn" onClick={() => setSelectedProduct(null)}><X size={20} /></button>
            </div>

            <div className="product-detail-layout">
              <div>
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="product-detail-image"
                />
                <div className="product-trust-badges">
                  <div className="product-trust-badge">
                    <Check size={14} color="#10b981" /> Hàng chính hãng 100%
                  </div>
                  <div className="product-trust-badge">
                    <Clock size={14} color="#6366f1" /> Đổi trả trong 7 ngày
                  </div>
                  <div className="product-trust-badge">
                    <ShieldCheck size={14} color="#e02e24" /> Bảo hành 12 tháng
                  </div>
                  <div className="product-trust-badge">
                    <Truck size={14} color="#f59e0b" /> Giao hàng toàn quốc
                  </div>
                </div>
              </div>

              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>{selectedProduct.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map(st => (
                      <Star
                        key={st}
                        size={16}
                        fill={st <= Math.round(selectedProduct.rating || 5) ? '#f59e0b' : 'transparent'}
                        color="#f59e0b"
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 700 }}>
                    {selectedProduct.rating ? selectedProduct.rating.toFixed(1) : '5.0'} / 5.0
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                    ({selectedProduct.reviewCount || selectedProduct.evaluations?.length || 0} đánh giá)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#e02e24' }}>
                    {formatPrice(selectedProduct.price)}
                  </span>
                  {selectedProduct.originalPrice && (
                    <span style={{ fontSize: '1rem', color: '#6b7280', textDecoration: 'line-through' }}>
                      {formatPrice(selectedProduct.originalPrice)}
                    </span>
                  )}
                  {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                    <span style={{ fontSize: '0.8rem', background: 'rgba(224, 46, 36, 0.1)', color: '#e02e24', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                      Tiết kiệm {formatPrice(selectedProduct.originalPrice - selectedProduct.price)}
                    </span>
                  )}
                </div>

                <div className="product-detail-desc">
                  {selectedProduct.description}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Số lượng:</span>
                  <div className="cart-item-actions">
                    <button className="qty-btn" onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}>
                      <Minus size={14} />
                    </button>
                    <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{detailQuantity}</span>
                    <button className="qty-btn" onClick={() => setDetailQuantity(detailQuantity + 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    (Còn {selectedProduct.availableStock} sản phẩm có sẵn)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '12px' }}
                    onClick={() => {
                      addToCart(selectedProduct, detailQuantity);
                      setSelectedProduct(null);
                    }}
                  >
                    <Plus size={16} /> Thêm vào giỏ hàng
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '12px' }}
                    onClick={() => {
                      addToCart(selectedProduct, detailQuantity);
                      setSelectedProduct(null);
                      setIsCartOpen(true);
                    }}
                  >
                    Mua ngay
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Detail Tabs Header */}
            <div className="detail-tabs-header">
              <button
                className={`detail-tab-btn ${modalTab === 'description' ? 'active' : ''}`}
                onClick={() => setModalTab('description')}
              >
                <FileText size={17} /> Mô tả & Thông số chi tiết
              </button>
              <button
                className={`detail-tab-btn ${modalTab === 'reviews' ? 'active' : ''}`}
                onClick={() => setModalTab('reviews')}
              >
                <Star size={17} /> Đánh giá từ khách hàng ({selectedProduct.evaluations?.length || 0})
              </button>
            </div>

            {/* TAB 1: Mô tả chi tiết & Thông số sản phẩm */}
            {modalTab === 'description' && (() => {
              const extra = getProductDetailExtra(selectedProduct);
              return (
                <div className="product-detail-expanded" style={{ marginTop: 10 }}>
                  {/* Highlights */}
                  <div className="detail-section">
                    <h4 className="detail-section-title">
                      <Sparkles size={18} color="var(--primary)" /> Đặc điểm nổi bật
                    </h4>
                    <ul style={{ paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
                      {extra.highlights.map((h, idx) => (
                        <li key={idx} style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: 6 }}>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Specifications Table */}
                  <div className="detail-section">
                    <h4 className="detail-section-title">
                      <Layers size={18} color="var(--primary)" /> Thông số kỹ thuật & Thông tin chi tiết
                    </h4>
                    <table className="specs-table">
                      <tbody>
                        {extra.specs.map((item, idx) => (
                          <tr key={idx}>
                            <td className="specs-label">{item.label}</td>
                            <td className="specs-value">{item.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Detailed Article */}
                  <div className="detail-section">
                    <h4 className="detail-section-title">
                      <FileText size={18} color="var(--primary)" /> Bài viết giới thiệu chi tiết sản phẩm
                    </h4>
                    <div style={{ background: 'var(--bg-subtle)', padding: 18, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                      {extra.detailedArticle.map((para, idx) => (
                        <p key={idx} className="detail-article-p" style={{ marginBottom: idx === extra.detailedArticle.length - 1 ? 0 : 12 }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Feature Highlights Grid */}
                  <div className="detail-section">
                    <h4 className="detail-section-title">
                      <ShieldCheck size={18} color="var(--primary)" /> Ưu điểm vượt trội & Cam kết chất lượng
                    </h4>
                    <div className="features-grid">
                      {extra.features.map((feat, idx) => (
                        <div key={idx} className="feature-box">
                          <div className="feature-box-title">✓ {feat.title}</div>
                          <div className="feature-box-desc">{feat.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Usage Guide */}
                  <div className="detail-section">
                    <h4 className="detail-section-title">
                      <CheckCircle2 size={18} color="#10b981" /> Hướng dẫn sử dụng & Bảo quản đúng cách
                    </h4>
                    <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                      <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
                        {extra.usageGuide.map((g, idx) => (
                          <li key={idx} style={{ color: 'var(--text-main)', fontSize: '0.875rem', marginBottom: 4 }}>
                            {g}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Guarantees */}
                  <div className="detail-section" style={{ marginBottom: 10 }}>
                    <h4 className="detail-section-title">
                      <Truck size={18} color="var(--primary)" /> Chính sách bán hàng & Dịch vụ khách hàng DAFL
                    </h4>
                    <div className="guarantees-grid">
                      {extra.guarantees.map((g, idx) => (
                        <div key={idx} className="guarantee-card">
                          <div>
                            <div className="guarantee-title">{g.title}</div>
                            <div className="guarantee-desc">{g.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB 2: Đánh giá từ khách hàng */}
            {modalTab === 'reviews' && (
              <div className="evaluations-container">
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 16 }}>
                  Đánh giá từ khách hàng ({selectedProduct.evaluations?.length || 0})
                </h3>

                {/* Add New Review Form */}
                <form onSubmit={handleAddReview} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Để lại đánh giá của bạn:</span>
                    <div className="star-picker">
                      {[1, 2, 3, 4, 5].map(st => (
                        <Star
                          key={st}
                          size={20}
                          fill={st <= reviewRating ? '#f59e0b' : 'transparent'}
                          color="#f59e0b"
                          onClick={() => setReviewRating(st)}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 10 }}>
                    <input
                      className="form-input"
                      placeholder="Tên của bạn..."
                      value={reviewAuthor}
                      onChange={e => setReviewAuthor(e.target.value)}
                      required
                    />
                    <input
                      className="form-input"
                      placeholder="Cảm nhận của bạn về sản phẩm..."
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.8rem', marginLeft: 'auto', display: 'flex' }}
                    disabled={submittingReview}
                  >
                    <Send size={14} /> {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                  </button>
                </form>

                {/* Reviews List */}
                {selectedProduct.evaluations && selectedProduct.evaluations.length > 0 ? (
                  selectedProduct.evaluations.map(ev => (
                    <div key={ev.id} className="evaluation-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e02e24', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                            {ev.userName.charAt(0)}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ev.userName}</span>
                        </div>
                        <div className="star-rating">
                          {[1, 2, 3, 4, 5].map(st => (
                            <Star
                              key={st}
                              size={13}
                              fill={st <= ev.rating ? '#f59e0b' : 'transparent'}
                              color="#f59e0b"
                            />
                          ))}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>{ev.comment}</p>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4, display: 'block' }}>
                        {new Date(ev.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
                    Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên đánh giá!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: Cart, Voucher & Checkout Drawer */}
      {/* ============================================================== */}
      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className={`modal-content ${checkoutResult ? 'modal-content-lg' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {checkoutResult ? 'Thanh toán đơn hàng PayOS (Trực tiếp)' : 'Giỏ hàng của bạn'}
              </h2>
              <button className="close-btn" onClick={() => setIsCartOpen(false)}><X size={20} /></button>
            </div>

            {/* View 1: Cart Items, Voucher, and Checkout Form */}
            {!checkoutResult ? (
              <>
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                    <ShoppingBag size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <p>Giỏ hàng của bạn đang trống.</p>
                  </div>
                ) : (
                  <>
                    {/* Cart Items List */}
                    <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 16 }}>
                      {cart.map(item => (
                        <div key={item.product.id} className="cart-item">
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', marginRight: 12 }}
                          />
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

                    {/* Voucher Input Section */}
                    <div className="voucher-section">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                        <Tag size={15} /> Nhập mã giảm giá / Voucher:
                      </div>
                      <div className="voucher-input-group">
                        <input
                          className="form-input"
                          placeholder="Nhập mã voucher (VD: FORDEV, DAFL10)..."
                          value={voucherCodeInput}
                          onChange={e => setVoucherCodeInput(e.target.value.toUpperCase())}
                        />
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0 18px', whiteSpace: 'nowrap' }}
                          onClick={() => handleApplyVoucher()}
                        >
                          Áp dụng
                        </button>
                      </div>

                      {/* Quick Available Vouchers Chips */}
                      <div className="voucher-chips">
                        {(vouchers.length ? vouchers : FALLBACK_VOUCHERS).map(v => (
                          <span
                            key={v.id}
                            className="voucher-chip"
                            onClick={() => {
                              setVoucherCodeInput(v.code);
                              handleApplyVoucher(v.code);
                            }}
                            title={v.description}
                          >
                            🏷️ {v.code} ({v.discountType === 'Percentage' ? `-${v.discountValue}%` : `-${formatPrice(v.discountValue)}`})
                          </span>
                        ))}
                      </div>

                      {appliedVoucher && (
                        <div className="applied-voucher-banner">
                          <span>✓ Đã áp dụng mã <strong>{appliedVoucher.code}</strong>: -{formatPrice(appliedVoucher.discountAmount)}</span>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontWeight: 700 }}
                            onClick={() => {
                              setAppliedVoucher(null);
                              setVoucherMessage(null);
                            }}
                          >
                            Bỏ chọn
                          </button>
                        </div>
                      )}

                      {voucherMessage && !appliedVoucher && (
                        <div style={{ fontSize: '0.8rem', color: '#f87171', marginTop: 6 }}>{voucherMessage}</div>
                      )}
                    </div>

                    {/* Pricing Summary */}
                    <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', padding: 14, borderRadius: 10, marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        <span>Tạm tính ({totalItemCount} sản phẩm):</span>
                        <span>{formatPrice(rawSubTotal)}</span>
                      </div>
                      {appliedVoucher && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.9rem', color: '#10b981' }}>
                          <span>Khuyến mãi Voucher ({appliedVoucher.code}):</span>
                          <span>-{formatPrice(appliedVoucher.discountAmount)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-subtle)', fontSize: '1.15rem', fontWeight: 800 }}>
                        <span>Tổng thanh toán:</span>
                        <span style={{ color: '#e02e24' }}>{formatPrice(finalTotal)}</span>
                      </div>
                    </div>

                    {/* Checkout Form */}
                    <form onSubmit={handleCheckout}>
                      <div className="form-group">
                        <label className="form-label">Họ tên người nhận</label>
                        <input className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email nhận hóa đơn & thông tin giao hàng</label>
                        <input className="form-input" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="form-group">
                          <label className="form-label">Số điện thoại</label>
                          <input className="form-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Địa chỉ giao hàng</label>
                          <input className="form-input" value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} required />
                        </div>
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 10 }} disabled={isCheckingOut}>
                        {isCheckingOut ? 'Đang tạo cổng thanh toán PayOS...' : `Thanh toán trực tiếp PayOS (${formatPrice(finalTotal)})`}
                      </button>
                    </form>
                  </>
                )}
              </>
            ) : (
              /* View 2: Embedded PayOS Payment View directly on the web page */
              <div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: 4, fontWeight: 800 }}>
                    Đơn hàng #{checkoutResult.orderCode}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Thanh toán an toàn được xử lý trực tiếp tại trang web — Không mở tab trắng
                  </p>
                </div>

                {orderStatus === 'Pending' && (
                  <div className="payos-embedded-card" style={{ marginTop: 0 }}>
                    <div className="payos-embedded-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            Cổng thanh toán PayOS (Thực hiện trực tiếp)
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Quét mã QR VietQR hoặc chuyển khoản trực tiếp qua ngân hàng
                          </div>
                        </div>
                      </div>
                      <div className="timer-badge" style={{ margin: 0 }}>
                        <Clock size={13} /> {formatTime(timeLeft)}
                      </div>
                    </div>

                    <div className="payos-summary-bar">
                      <div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Số tiền thanh toán: </span>
                        <strong style={{ color: '#e02e24', fontSize: '1.2rem' }}>{formatPrice(checkoutResult.totalAmount)}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          onClick={() => {
                            navigator.clipboard?.writeText(String(checkoutResult.orderCode));
                            showToast('Đã chép mã', `Mã đơn #${checkoutResult.orderCode}`, 'System');
                          }}
                        >
                          <Copy size={12} /> Sao chép mã
                        </button>
                      </div>
                    </div>

                    {/* Embedded PayOS Iframe directly on site */}
                    {checkoutResult.checkoutUrl ? (
                      <div className="payos-iframe-container">
                        <iframe
                          src={checkoutResult.checkoutUrl}
                          className="payos-iframe"
                          title={`Cổng thanh toán PayOS #${checkoutResult.orderCode}`}
                          allow="payment"
                        />
                      </div>
                    ) : (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        Đang kết nối cổng thanh toán PayOS...
                      </div>
                    )}

                    <div className="payos-sync-footer">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <RefreshCw size={14} className="spin" color="#10b981" />
                          <span>Hệ thống tự động đồng bộ trạng thái khi thanh toán thành công (SignalR)</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.775rem', padding: '6px 12px' }}
                            onClick={handleSimulatePaymentSuccess}
                            title="Xác nhận thanh toán mô phỏng"
                          >
                            ⚡ Test Xác nhận Thanh toán
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.775rem', padding: '6px 12px' }}
                            onClick={() => {
                              setIsCartOpen(false);
                              navigateTo('orders');
                            }}
                          >
                            Xem trong Quản lý đơn hàng
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {orderStatus === 'Paid' && (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <CheckCircle2 size={56} color="#10b981" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.4rem', color: '#10b981', marginBottom: 8 }}>Thanh toán thành công!</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 20 }}>
                      Đơn hàng #{checkoutResult.orderCode} đã được thanh toán thành công. Chúng tôi đang chuẩn bị hàng và sẽ sớm giao đến địa chỉ của bạn!
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => { setCheckoutResult(null); setIsCartOpen(false); navigateTo('orders'); }}>
                        Xem lịch sử đơn hàng
                      </button>
                      <button type="button" className="btn btn-primary" onClick={() => { setCheckoutResult(null); setIsCartOpen(false); navigateTo('home'); }}>
                        Tiếp tục mua hàng
                      </button>
                    </div>
                  </div>
                )}

                {orderStatus === 'Expired' && (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <Clock size={56} color="#f43f5e" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.3rem', color: '#f43f5e', marginBottom: 8 }}>Đơn hàng đã hết hạn giữ chỗ!</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 20 }}>
                      Đã quá 15 phút mà đơn hàng chưa được thanh toán. Số lượng tồn kho đã được hoàn trả lại cho hệ thống.
                    </p>
                    <button type="button" className="btn btn-secondary" onClick={() => { setCheckoutResult(null); }}>
                      Tạo lại đơn hàng
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: Auth Modal (Login / Register) */}
      {/* ============================================================== */}
      {isAuthModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAuthModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {authTab === 'login' ? 'Đăng nhập tài khoản' : 'Đăng ký thành viên mới'}
              </h2>
              <button className="close-btn" onClick={() => setIsAuthModalOpen(false)}><X size={20} /></button>
            </div>

            {/* Tabs */}
            <div className="modal-tabs">
              <button
                className={`tab-btn ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthTab('login'); setAuthError(null); }}
              >
                Đăng nhập
              </button>
              <button
                className={`tab-btn ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthTab('register'); setAuthError(null); }}
              >
                Đăng ký
              </button>
            </div>

            {authError && (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid #f43f5e', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.85rem' }}>
                {authError}
              </div>
            )}

            {authTab === 'login' ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email đăng nhập</label>
                  <input
                    className="form-input"
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu</label>
                  <input
                    className="form-input"
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: 10 }} disabled={authLoading}>
                  {authLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                </button>

                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '0.8rem' }}
                    onClick={() => {
                      setLoginEmail('demo@dafl.vn');
                      setLoginPassword('Password123!');
                    }}
                  >
                    ⚡ Dùng tài khoản Demo (demo@dafl.vn)
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Họ và tên</label>
                  <input
                    className="form-input"
                    value={registerName}
                    onChange={e => setRegisterName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={registerEmail}
                    onChange={e => setRegisterEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu</label>
                  <input
                    className="form-input"
                    type="password"
                    value={registerPassword}
                    onChange={e => setRegisterPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      className="form-input"
                      value={registerPhone}
                      onChange={e => setRegisterPhone(e.target.value)}
                      placeholder="0987654321"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Địa chỉ</label>
                    <input
                      className="form-input"
                      value={registerAddress}
                      onChange={e => setRegisterAddress(e.target.value)}
                      placeholder="Hà Nội, VN"
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: 10 }} disabled={authLoading}>
                  {authLoading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: User Profile & Order History Drawer */}
      {/* ============================================================== */}
      {isProfileOpen && user && (
        <div className="modal-overlay" onClick={() => setIsProfileOpen(false)}>
          <div className="modal-content modal-content-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Thông tin tài khoản & Lịch sử</h2>
              <button className="close-btn" onClick={() => setIsProfileOpen(false)}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
              {/* Profile Card */}
              <div style={{ background: 'var(--bg-subtle)', padding: 20, borderRadius: 14, border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #e02e24, #ff5722)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, margin: '0 auto 14px' }}>
                  {user.fullName.charAt(0)}
                </div>
                <h3 style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: 4 }}>{user.fullName}</h3>
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', marginBottom: 16 }}>{user.email}</p>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#9ca3af' }}>Vai trò:</span>
                    <span style={{ fontWeight: 600, color: '#ff8a80' }}>{user.role}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#9ca3af' }}>Số điện thoại:</span>
                    <span>{user.phoneNumber || 'Chưa cập nhật'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#9ca3af' }}>Địa chỉ:</span>
                    <span style={{ textAlign: 'right', maxWidth: 140 }}>{user.address || 'Chưa cập nhật'}</span>
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: 20, color: '#f87171', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                  onClick={handleLogout}
                >
                  <LogOut size={16} /> Đăng xuất
                </button>
              </div>

              {/* Order History Timeline */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Lịch sử đơn hàng</h3>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    onClick={openOrderHistory}
                  >
                    <RefreshCw size={12} /> Làm mới
                  </button>
                </div>

                {orderHistoryLoading ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#9ca3af' }}>Đang tải lịch sử đơn hàng...</div>
                ) : orderHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#9ca3af' }}>
                    <Package size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <p>Bạn chưa có đơn hàng nào.</p>
                  </div>
                ) : (
                  <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                    {orderHistory.map(order => (
                      <div key={order.id} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Đơn hàng #{order.orderCode}</span>
                          <span className="tag" style={{
                            background: order.status === 'Paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: order.status === 'Paid' ? '#34d399' : '#fbbf24',
                            border: 'none',
                            fontWeight: 700
                          }}>
                            {order.status === 'Paid' ? '✓ Đã thanh toán' : 'Chờ thanh toán'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: 8 }}>
                          Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </div>

                        {order.items && order.items.map(it => (
                          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0' }}>
                            <span>{it.productName} (x{it.quantity})</span>
                            <span>{formatPrice(it.unitPrice * it.quantity)}</span>
                          </div>
                        ))}

                        <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                          <span>Tổng tiền:</span>
                          <span style={{ color: '#10b981' }}>{formatPrice(order.totalAmount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: Notifications Drawer (SignalR Real-time) */}
      {/* ============================================================== */}
      {isNotifOpen && (
        <div className="modal-overlay" onClick={() => setIsNotifOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={20} color="#e02e24" />
                <h2 className="modal-title">Hộp thư thông báo</h2>
              </div>
              <button className="close-btn" onClick={() => setIsNotifOpen(false)}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                Cập nhật tự động: <strong style={{ color: '#10b981' }}>Đang bật</strong>
              </span>
              <button
                style={{ background: 'none', border: 'none', color: '#ff8a80', cursor: 'pointer', fontSize: '0.8rem' }}
                onClick={markAllNotificationsAsRead}
              >
                Đánh dấu tất cả đã đọc
              </button>
            </div>

            {/* Promo Alert Demo */}
            <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: 'rgba(224, 46, 36, 0.1)', border: '1px dashed rgba(224, 46, 36, 0.35)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                Bấm nút dưới để nhận thử thông báo chương trình khuyến mãi và voucher giảm giá mới nhất:
              </p>
              <button
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
                onClick={handleSendTestSignalR}
              >
                🔔 Nhận thông báo khuyến mãi mới
              </button>
            </div>

            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', padding: '30px 0' }}>Không có thông báo nào.</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                    onClick={() => markNotificationAsRead(n.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {!n.isRead && <div className="unread-dot" />}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="tag" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                        {n.type === 'Payment' ? '💳 Thanh toán' : n.type === 'Order' ? '📦 Đơn hàng' : n.type === 'Promotion' ? '🎁 Khuyến mãi' : '⚙️ Hệ thống'}
                      </span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{n.title}</strong>
                    </div>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: '4px 0' }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      {new Date(n.createdAt).toLocaleTimeString('vi-VN')} - {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: Standalone Dedicated Embedded PayOS Payment Modal */}
      {/* ============================================================== */}
      {embeddedPaymentModal && (
        <div className="modal-overlay" onClick={() => setEmbeddedPaymentModal(null)}>
          <div className="modal-content modal-content-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e02e24', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0, fontSize: '1.2rem' }}>
                    Thanh toán đơn hàng #{embeddedPaymentModal.orderCode} (PayOS Trực tiếp)
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Thanh toán trực tiếp tại trang web • Tự động xác nhận thành công
                  </span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setEmbeddedPaymentModal(null)}><X size={20} /></button>
            </div>

            <div className="payos-embedded-card" style={{ marginTop: 0 }}>
              <div className="payos-summary-bar">
                <div>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tổng thanh toán: </span>
                  <strong style={{ color: '#e02e24', fontSize: '1.25rem' }}>{formatPrice(embeddedPaymentModal.totalAmount)}</strong>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => {
                      navigator.clipboard?.writeText(String(embeddedPaymentModal.orderCode));
                      showToast('Sao chép', `Đã chép mã đơn #${embeddedPaymentModal.orderCode}`, 'System');
                    }}
                  >
                    <Copy size={13} /> Copy mã đơn
                  </button>
                </div>
              </div>

              {/* Direct On-site PayOS embedded iframe */}
              <div className="payos-iframe-container" style={{ height: 600 }}>
                <iframe
                  src={embeddedPaymentModal.checkoutUrl}
                  className="payos-iframe"
                  title={`Thanh toán PayOS #${embeddedPaymentModal.orderCode}`}
                  allow="payment"
                />
              </div>

              <div className="payos-sync-footer">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={14} className="spin" color="#10b981" />
                    <span>Lắng nghe kết quả thanh toán từ VietQR / PayOS qua SignalR...</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.775rem', padding: '6px 12px' }}
                      onClick={() => handleSimulatePaymentForOrder(embeddedPaymentModal.orderCode, embeddedPaymentModal.totalAmount)}
                    >
                      ⚡ Test Xác nhận Thanh toán
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.775rem', padding: '6px 12px' }}
                      onClick={() => setEmbeddedPaymentModal(null)}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

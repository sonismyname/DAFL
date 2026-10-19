import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

describe('App Routing & Navigation System (React Router)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();

    // Mock fetch for API endpoints called in App
    globalThis.fetch = vi.fn((url: any) => {
      const urlStr = typeof url === 'string' ? url : url.url;

      if (urlStr.includes('/api/auth/me')) {
        return Promise.resolve({
          json: () => Promise.resolve({ success: false, data: null, message: 'Unauthorized' }),
        } as Response);
      }

      if (urlStr.includes('/api/products/categories')) {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: [] }),
        } as Response);
      }

      if (urlStr.includes('/api/products')) {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: [] }),
        } as Response);
      }

      if (urlStr.includes('/api/vouchers')) {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: [] }),
        } as Response);
      }

      if (urlStr.includes('/api/notifications')) {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: [] }),
        } as Response);
      }

      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: [] }),
      } as Response);
    });
  });

  it('renders home page by default on "/"', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('brand-logo')).toBeInTheDocument();
    expect(screen.getByText(/Sàn Thương Mại Điện Tử DAFL/i)).toBeInTheDocument();
  });

  it('renders Cart & Checkout view on "/cart"', async () => {
    render(
      <MemoryRouter initialEntries={['/cart']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('cart-drawer')).toBeInTheDocument();
    });
  });

  it('renders Login view on "/login"', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      expect(screen.getByTestId('auth-tab-login')).toHaveClass('active');
    });
  });

  it('renders Register view on "/register"', async () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      expect(screen.getByTestId('auth-tab-register')).toHaveClass('active');
    });
  });

  it('redirects unauthenticated user from protected route "/orders" to "/login"', async () => {
    render(
      <MemoryRouter initialEntries={['/orders']}>
        <App />
      </MemoryRouter>
    );

    // Wait for auth check to finish and redirect to login
    await waitFor(() => {
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated user from protected route "/profile" to "/login"', async () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    });
  });

  it('renders Product Detail view on "/product/:id" without infinite loop', async () => {
    render(
      <MemoryRouter initialEntries={['/product/prod-demo']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('product-detail-page')).toBeInTheDocument();
    });
  });
});

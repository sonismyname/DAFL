import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductGallery } from '../components/product/ProductGallery';
import { IMAGE_PLACEHOLDER, resolveGalleryImages } from '../utils/images';

const IMAGES = ['https://img/1.jpg', 'https://img/2.jpg', 'https://img/3.jpg'];

describe('ProductGallery', () => {
  it('hiển thị ảnh đầu tiên và bộ đếm 1/3', () => {
    render(<ProductGallery images={IMAGES} alt="Áo" />);
    expect(screen.getByTestId('product-gallery-main')).toHaveAttribute('src', IMAGES[0]);
    expect(screen.getByTestId('product-gallery-counter')).toHaveTextContent('1/3');
  });

  it('bấm Tiếp / Trước để lướt và quay vòng', () => {
    render(<ProductGallery images={IMAGES} alt="Áo" />);
    fireEvent.click(screen.getByTestId('product-gallery-next'));
    expect(screen.getByTestId('product-gallery-main')).toHaveAttribute('src', IMAGES[1]);

    fireEvent.click(screen.getByTestId('product-gallery-prev'));
    fireEvent.click(screen.getByTestId('product-gallery-prev'));
    expect(screen.getByTestId('product-gallery-main')).toHaveAttribute('src', IMAGES[2]);
    expect(screen.getByTestId('product-gallery-counter')).toHaveTextContent('3/3');
  });

  it('chọn ảnh bằng ảnh thu nhỏ', () => {
    render(<ProductGallery images={IMAGES} alt="Áo" />);
    fireEvent.click(screen.getByTestId('product-gallery-thumb-2'));
    expect(screen.getByTestId('product-gallery-main')).toHaveAttribute('src', IMAGES[2]);
    expect(screen.getByTestId('product-gallery-thumb-2')).toHaveAttribute('aria-selected', 'true');
  });

  it('lướt bằng phím mũi tên', () => {
    render(<ProductGallery images={IMAGES} alt="Áo" />);
    const gallery = screen.getByTestId('product-gallery');
    fireEvent.keyDown(gallery, { key: 'ArrowRight' });
    expect(screen.getByTestId('product-gallery-main')).toHaveAttribute('src', IMAGES[1]);
    fireEvent.keyDown(gallery, { key: 'ArrowLeft' });
    expect(screen.getByTestId('product-gallery-main')).toHaveAttribute('src', IMAGES[0]);
  });

  it('vuốt trái trên màn hình cảm ứng chuyển sang ảnh kế tiếp', () => {
    render(<ProductGallery images={IMAGES} alt="Áo" />);
    const stage = screen.getByTestId('product-gallery-main').parentElement!;
    fireEvent.touchStart(stage, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 100 }] });
    expect(screen.getByTestId('product-gallery-main')).toHaveAttribute('src', IMAGES[1]);
  });

  it('ảnh bị lỗi (404) được thay bằng ảnh placeholder', () => {
    render(<ProductGallery images={IMAGES} alt="Áo" />);
    fireEvent.error(screen.getByTestId('product-gallery-main'));
    expect(screen.getByTestId('product-gallery-main')).toHaveAttribute('src', IMAGE_PLACEHOLDER);
  });

  it('chỉ có 1 ảnh thì ẩn nút điều hướng và ảnh thu nhỏ', () => {
    render(<ProductGallery images={[IMAGES[0]]} alt="Áo" />);
    expect(screen.queryByTestId('product-gallery-next')).toBeNull();
    expect(screen.queryByTestId('product-gallery-thumb-0')).toBeNull();
  });

  it('đổi sang sản phẩm khác thì quay về ảnh đầu tiên', () => {
    const { rerender } = render(<ProductGallery images={IMAGES} alt="Áo" />);
    fireEvent.click(screen.getByTestId('product-gallery-next'));
    rerender(<ProductGallery images={['https://other/a.jpg', 'https://other/b.jpg']} alt="Quần" />);
    expect(screen.getByTestId('product-gallery-main')).toHaveAttribute('src', 'https://other/a.jpg');
  });
});

describe('resolveGalleryImages', () => {
  it('đặt ảnh đại diện đầu tiên, bỏ ảnh trùng và rỗng', () => {
    expect(resolveGalleryImages('main', ['a', 'main', '', 'a', 'b'])).toEqual(['main', 'a', 'b']);
  });

  it('thiếu images thì chỉ còn ảnh đại diện', () => {
    expect(resolveGalleryImages('main')).toEqual(['main']);
  });
});

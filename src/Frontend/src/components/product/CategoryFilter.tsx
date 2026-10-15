import React from 'react';
import { Category } from '../../types';

export interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <section data-testid="category-filter-section">
      <div className="section-title">
        <span>Danh mục ngành hàng ({categories.length} hạng mục)</span>
        {selectedCategory && (
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
            onClick={() => onSelectCategory(null)}
            data-testid="clear-category-btn"
          >
            Xem tất cả
          </button>
        )}
      </div>

      <div className="categories-bar" data-testid="categories-bar">
        <button
          className={`category-pill ${selectedCategory === null ? 'active' : ''}`}
          onClick={() => onSelectCategory(null)}
          data-testid="category-pill-all"
        >
          Tất cả danh mục
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat.id)}
            data-testid={`category-pill-${cat.id}`}
          >
            <span style={{ marginRight: 6 }}>{cat.iconUrl || '📦'}</span>
            {cat.name}
          </button>
        ))}
      </div>
    </section>
  );
};

/**
 * AISecGuard — Reusable Top/Header Pagination Control
 * Displays "Showing X to Y of Z items" on the left, and Prev / Numbered / Next buttons on the right.
 * Positioned cleanly at the top of data tables and cards.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function PaginationControl({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  itemLabel = 'items',
  style = {},
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!totalItems || totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Compute page numbers with window and ellipsis
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((pageNum) => pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - safePage) <= 1)
    .reduce((acc, pageNum, idx, arr) => {
      if (idx > 0 && pageNum - arr[idx - 1] > 1) {
        acc.push('ellipsis-' + pageNum);
      }
      acc.push(pageNum);
      return acc;
    }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.25rem',
        borderBottom: '1px solid var(--color-border)',
        background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)',
        flexWrap: 'wrap',
        gap: '0.75rem',
        ...style,
      }}
    >
      {/* Left: Entries Counter */}
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
        Showing{' '}
        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{startItem}</span> to{' '}
        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{endItem}</span> of{' '}
        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{totalItems}</span> {itemLabel}
      </div>

      {/* Right: Page Navigation Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {/* Previous Button */}
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(safePage - 1, 1))}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.32rem 0.65rem',
            borderRadius: 7,
            fontSize: '0.76rem',
            fontWeight: 600,
            border: '1px solid var(--color-border)',
            background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
            color: safePage <= 1 ? 'var(--color-text-muted)' : 'var(--color-text)',
            cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
            opacity: safePage <= 1 ? 0.45 : 1,
            transition: 'all 0.15s ease',
          }}
          title="Previous Page"
        >
          <ChevronLeft size={14} />
          <span>Previous</span>
        </button>

        {/* Page Number Buttons */}
        {pageNumbers.map((item) => {
          if (typeof item === 'string' && item.startsWith('ellipsis')) {
            return (
              <span
                key={item}
                style={{
                  padding: '0 0.25rem',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.82rem',
                  userSelect: 'none',
                }}
              >
                …
              </span>
            );
          }

          const pageNum = item;
          const isActive = pageNum === safePage;

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              style={{
                minWidth: 28,
                height: 28,
                padding: '0 0.35rem',
                borderRadius: 7,
                fontSize: '0.76rem',
                fontWeight: isActive ? 700 : 500,
                border: isActive ? '1px solid #8b5cf6' : '1px solid var(--color-border)',
                background: isActive
                  ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.04)'
                  : 'rgba(0, 0, 0, 0.03)',
                color: isActive ? '#ffffff' : 'var(--color-text)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isActive ? '0 2px 8px rgba(124, 58, 237, 0.35)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(Math.min(safePage + 1, totalPages))}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.32rem 0.65rem',
            borderRadius: 7,
            fontSize: '0.76rem',
            fontWeight: 600,
            border: '1px solid var(--color-border)',
            background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
            color: safePage >= totalPages ? 'var(--color-text-muted)' : 'var(--color-text)',
            cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
            opacity: safePage >= totalPages ? 0.45 : 1,
            transition: 'all 0.15s ease',
          }}
          title="Next Page"
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

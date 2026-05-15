// React hooks. Cart + wishlist are localStorage-only (no accounts in this app).
import { useCallback, useEffect, useRef, useState } from 'react';

// useDialogFocus — when a modal/drawer mounts, move focus into it and trap
// Tab cycling within. On unmount, restore focus to the previously focused
// element. Pass the dialog's ref. Optional onClose handler binds Escape.
export function useDialogFocus(dialogRef, onClose) {
  useEffect(() => {
    const previous = document.activeElement;
    const node = dialogRef.current;
    if (!node) return;

    // Move focus to the first focusable child, falling back to the dialog itself
    const focusable = () => Array.from(node.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null);

    const list = focusable();
    (list[0] || node).focus({ preventScroll: true });

    function onKey(e) {
      if (e.key === 'Escape' && onClose) { onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      if (previous && typeof previous.focus === 'function') previous.focus({ preventScroll: true });
    };
  // We intentionally only bind once on mount — re-running would steal focus mid-interaction
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ── useFetch ──────────────────────────────────────────────────────────────
export function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fnRef = useRef(fn); fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    fnRef.current()
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: () => fnRef.current().then(setData) };
}

// ── useCart (localStorage-only) ───────────────────────────────────────────
const CART_KEY = 'pmb_cart';

function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; } }
function writeCart(items) { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch {} }

export function useCart({ onCap } = {}) {
  const [items, setItems] = useState(readCart);
  const onCapRef = useRef(onCap);
  onCapRef.current = onCap;

  const add = useCallback((book, qty = 1) => {
    const isBundle = book.isBundle || !!book.books;
    setItems(prev => {
      const ex = prev.find(p => p.id === book.id && p.isBundle === isBundle);
      if (ex && ex.qty + qty > 50) onCapRef.current?.(ex);
      const next = ex
        ? prev.map(p => (p === ex ? { ...p, qty: Math.min(p.qty + qty, 50) } : p))
        : [...prev, {
            id: book.id, qty, isBundle,
            title: book.title, price: book.price, mrp: book.mrp,
            author: book.author, edition: book.edition, cover: book.cover,
            imageUrl: book.imageUrl,
            count: book.books?.length,
          }];
      writeCart(next);
      return next;
    });
  }, []);

  const updateQty = useCallback((bookId, delta, isBundle = false) => {
    setItems(prev => {
      const next = prev.flatMap(p => {
        if (p.id !== bookId || p.isBundle !== isBundle) return [p];
        const newQty = p.qty + delta;
        if (newQty <= 0) return [];
        if (newQty > 50) { onCapRef.current?.(p); return [p]; }
        return [{ ...p, qty: newQty }];
      });
      writeCart(next);
      return next;
    });
  }, []);

  const remove = useCallback((bookId) => {
    setItems(prev => { const next = prev.filter(p => p.id !== bookId); writeCart(next); return next; });
  }, []);

  const clear = useCallback(() => { writeCart([]); setItems([]); }, []);

  return { items, add, updateQty, remove, clear };
}

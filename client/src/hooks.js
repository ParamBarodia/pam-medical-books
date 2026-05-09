// React hooks. Cart + wishlist are localStorage-only (no accounts in this app).
import { useCallback, useEffect, useRef, useState } from 'react';

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

export function useCart() {
  const [items, setItems] = useState(readCart);

  const add = useCallback((book, qty = 1) => {
    const isBundle = book.isBundle || !!book.books;
    setItems(prev => {
      const ex = prev.find(p => p.id === book.id && p.isBundle === isBundle);
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
        if (newQty > 50) return [p];
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

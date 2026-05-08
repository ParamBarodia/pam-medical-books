// React hooks bridging the API client and the UI.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getToken, setToken } from './api.js';

// ── useAuth ────────────────────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.me().then(({ user }) => setUser(user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.login({ email, password });
    setToken(token); setUser(user);
    return user;
  }, []);

  const signup = useCallback(async (data) => {
    const { token, user } = await api.signup(data);
    setToken(token); setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  return { user, loading, login, signup, logout };
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

// ── useCart ───────────────────────────────────────────────────────────────
// Server-backed when logged in; localStorage fallback for guests.
const GUEST_CART_KEY = 'ms_guest_cart';

function readGuestCart() { try { return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]'); } catch { return []; } }
function writeGuestCart(items) { try { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items)); } catch {} }

export function useCart(user) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Initial load (and refresh when login state changes)
  useEffect(() => {
    if (user) {
      setLoading(true);
      api.cart()
        .then(serverItems => {
          // Merge guest cart on first login
          const guest = readGuestCart();
          if (guest.length) {
            const merges = guest.map(g => api.cartAdd(g.id, g.qty, g.isBundle).catch(() => null));
            return Promise.all(merges).then(() => api.cart()).then(merged => { writeGuestCart([]); return merged; });
          }
          return serverItems;
        })
        .then(setItems)
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    } else {
      setItems(readGuestCart());
    }
  }, [user]);

  const add = useCallback(async (book, qty = 1) => {
    const isBundle = book.isBundle || !!book.books;
    if (user) {
      const updated = await api.cartAdd(book.id, qty, isBundle);
      setItems(updated);
    } else {
      setItems(prev => {
        const ex = prev.find(p => p.id === book.id && p.isBundle === isBundle);
        const next = ex
          ? prev.map(p => (p === ex ? { ...p, qty: p.qty + qty } : p))
          : [...prev, { id: book.id, qty, isBundle, title: book.title, price: book.price, mrp: book.mrp, author: book.author, edition: book.edition, cover: book.cover, count: book.books?.length }];
        writeGuestCart(next);
        return next;
      });
    }
  }, [user]);

  const updateQty = useCallback(async (bookId, delta, isBundle = false) => {
    if (user) {
      const updated = await api.cartUpdate(bookId, delta, isBundle);
      setItems(updated);
    } else {
      setItems(prev => {
        const next = prev.flatMap(p => {
          if (p.id !== bookId) return [p];
          const newQty = p.qty + delta;
          return newQty <= 0 ? [] : [{ ...p, qty: newQty }];
        });
        writeGuestCart(next);
        return next;
      });
    }
  }, [user]);

  const remove = useCallback(async (bookId) => {
    if (user) {
      const updated = await api.cartRemove(bookId);
      setItems(updated);
    } else {
      setItems(prev => { const next = prev.filter(p => p.id !== bookId); writeGuestCart(next); return next; });
    }
  }, [user]);

  const clear = useCallback(async () => {
    if (user) { await api.cartClear(); setItems([]); }
    else      { writeGuestCart([]); setItems([]); }
  }, [user]);

  return { items, loading, add, updateQty, remove, clear };
}

// ── useWishlist ───────────────────────────────────────────────────────────
const GUEST_WISH_KEY = 'ms_guest_wishlist';
function readGuestWish() { try { return JSON.parse(localStorage.getItem(GUEST_WISH_KEY) || '[]'); } catch { return []; } }
function writeGuestWish(ids) { try { localStorage.setItem(GUEST_WISH_KEY, JSON.stringify(ids)); } catch {} }

export function useWishlist(user) {
  const [ids, setIds] = useState(() => new Set());

  useEffect(() => {
    if (user) {
      api.wishlist().then(arr => setIds(new Set(arr))).catch(() => {});
    } else {
      setIds(new Set(readGuestWish()));
    }
  }, [user]);

  const toggle = useCallback(async (bookId) => {
    const has = ids.has(bookId);
    if (user) {
      const updated = has ? await api.wishlistRemove(bookId) : await api.wishlistAdd(bookId);
      setIds(new Set(updated));
    } else {
      const next = new Set(ids);
      has ? next.delete(bookId) : next.add(bookId);
      setIds(next);
      writeGuestWish([...next]);
    }
  }, [ids, user]);

  return { ids, toggle, has: (id) => ids.has(id) };
}

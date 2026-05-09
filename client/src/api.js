// Pam Medical Books API client.
// In dev, requests go to /api (Vite proxies to http://localhost:4000).
// In prod, set VITE_API_BASE_URL to the deployed API origin (e.g. https://api.example.com).

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'ms_token';

// Resolve a relative asset path (e.g. /covers/b2.jpg) against the API origin.
// In dev API_BASE is empty so the Vite proxy handles it; in prod, prefix the API host.
export function assetUrl(path) {
  if (!path) return path;
  if (/^https?:/.test(path)) return path;          // already absolute
  if (path.startsWith('/')) return `${API_BASE}${path}`;
  return path;
}

export function getToken()      { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
export function setToken(t)     { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} }

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const tok = getToken();
    if (tok) headers.Authorization = `Bearer ${tok}`;
  }
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw Object.assign(new Error(data?.error || `HTTP ${res.status}`), { status: res.status, data });
  return data;
}

// ─── Catalog (public) ──────────────────────────────────────────────────────
export const api = {
  health:      () => request('/health'),
  books:       (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/books${qs ? '?' + qs : ''}`);
  },
  book:        (id) => request(`/books/${id}`),
  bundles:     () => request('/bundles'),
  testimonials: () => request('/testimonials'),
  notify:      (bookId, email) => request('/notify', { method: 'POST', body: { bookId, email } }),

  // ─── Auth ────────────────────────────────────────────────────────────────
  signup: (data) => request('/auth/signup', { method: 'POST', body: data }),
  login:  (data) => request('/auth/login',  { method: 'POST', body: data }),
  me:     ()    => request('/auth/me', { auth: true }),

  // ─── Cart ────────────────────────────────────────────────────────────────
  cart:        () => request('/cart', { auth: true }),
  cartAdd:     (bookId, qty = 1, isBundle = false) => request('/cart', { method: 'POST', body: { bookId, qty, isBundle }, auth: true }),
  cartUpdate:  (bookId, delta, isBundle = false) => request('/cart', { method: 'PATCH', body: { bookId, delta, isBundle }, auth: true }),
  cartRemove:  (bookId) => request(`/cart/${bookId}`, { method: 'DELETE', auth: true }),
  cartClear:   () => request('/cart', { method: 'DELETE', auth: true }),

  // ─── Wishlist ────────────────────────────────────────────────────────────
  wishlist:         () => request('/wishlist', { auth: true }),
  wishlistDetailed: () => request('/wishlist/detailed', { auth: true }),
  wishlistAdd:    (bookId) => request('/wishlist', { method: 'POST', body: { bookId }, auth: true }),
  wishlistRemove: (bookId) => request(`/wishlist/${bookId}`, { method: 'DELETE', auth: true }),

  // ─── Orders ──────────────────────────────────────────────────────────────
  checkout: (address, paymentMethod) => request('/orders/checkout', { method: 'POST', body: { address, paymentMethod }, auth: true }),
  verifyPayment: (orderId, payload) => request(`/orders/${orderId}/verify`, { method: 'POST', body: payload, auth: true }),
  orders:   () => request('/orders', { auth: true }),
  order:    (id) => request(`/orders/${id}`, { auth: true }),
};

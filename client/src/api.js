// MedShelf API client. All calls go through Vite's /api proxy → http://localhost:4000.

const TOKEN_KEY = 'ms_token';

export function getToken()      { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
export function setToken(t)     { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} }

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const tok = getToken();
    if (tok) headers.Authorization = `Bearer ${tok}`;
  }
  const res = await fetch(`/api${path}`, {
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
  wishlist:       () => request('/wishlist', { auth: true }),
  wishlistAdd:    (bookId) => request('/wishlist', { method: 'POST', body: { bookId }, auth: true }),
  wishlistRemove: (bookId) => request(`/wishlist/${bookId}`, { method: 'DELETE', auth: true }),

  // ─── Orders ──────────────────────────────────────────────────────────────
  checkout: (address, paymentMethod) => request('/orders/checkout', { method: 'POST', body: { address, paymentMethod }, auth: true }),
  verifyPayment: (orderId, razorpayPaymentId) => request(`/orders/${orderId}/verify`, { method: 'POST', body: { razorpayPaymentId }, auth: true }),
  orders:   () => request('/orders', { auth: true }),
  order:    (id) => request(`/orders/${id}`, { auth: true }),
};

// Pam Medical Books API client.
// Phone-only model: no JWT, no Bearer tokens.
// Admin uses an httpOnly cookie (set server-side); we just pass credentials:'include'.

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export function assetUrl(path) {
  if (!path) return path;
  if (/^https?:/.test(path)) return path;
  if (path.startsWith('/')) return `${API_BASE}${path}`;
  return path;
}

async function request(path, { method = 'GET', body, includeCookies = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: includeCookies ? 'include' : 'same-origin',
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw Object.assign(new Error(data?.error || `HTTP ${res.status}`), { status: res.status, data });
  return data;
}

export const api = {
  health:        () => request('/health'),

  // ─── Catalog (public) ─────────────────────────────────────────────────
  books:        (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/books${qs ? '?' + qs : ''}`);
  },
  book:         (id) => request(`/books/${id}`),
  bundles:      () => request('/bundles'),
  testimonials: () => request('/testimonials'),

  // ─── Phone-only customer flow ────────────────────────────────────────
  lookupCustomer:    (phone) => request(`/customer/lookup?phone=${encodeURIComponent(phone)}`),
  requestOtp:        (phone, purpose = 'cod_checkout') => request('/otp/request', { method: 'POST', body: { phone, purpose } }),
  notifyWhenBack:    (bookId, phone) => request('/notify-when-back', { method: 'POST', body: { bookId, phone } }),

  // ─── Orders ───────────────────────────────────────────────────────────
  checkout:          (payload) => request('/orders/checkout', { method: 'POST', body: payload }),
  verifyPayment:     (orderId, payload) => request(`/orders/${orderId}/verify`, { method: 'POST', body: payload }),
  ordersByPhone:     (phone) => request(`/orders/by-phone?phone=${encodeURIComponent(phone)}`),
  orderDetail:       (orderId, phone) => request(`/orders/lookup/${orderId}?phone=${encodeURIComponent(phone)}`),
  requestReturn:     (orderId, phone, reason) => request(`/orders/${orderId}/request-return`, { method: 'POST', body: { phone, reason } }),
  requestCancellation: (orderId, phone, reason) => request(`/orders/${orderId}/request-cancellation`, { method: 'POST', body: { phone, reason } }),

  // ─── Admin (cookie-authenticated) ────────────────────────────────────
  adminRequestLogin: (phone) => request('/admin/login/request', { method: 'POST', body: { phone }, includeCookies: true }),
  adminVerifyLogin:  (phone, code) => request('/admin/login/verify', { method: 'POST', body: { phone, code }, includeCookies: true }),
  adminLogout:       () => request('/admin/logout', { method: 'POST', includeCookies: true }),
  adminMe:           () => request('/admin/me', { includeCookies: true }),
  adminOrders:       (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/orders${qs ? '?' + qs : ''}`, { includeCookies: true });
  },
  adminOrder:        (id) => request(`/admin/orders/${id}`, { includeCookies: true }),
  adminUpdateOrder:  (id, status) => request(`/admin/orders/${id}`, { method: 'PATCH', body: { status }, includeCookies: true }),
  adminBooks:        (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/books${qs ? '?' + qs : ''}`, { includeCookies: true });
  },
  adminUpdateStock:  (id, body) => request(`/admin/books/${id}/stock`, { method: 'PATCH', body, includeCookies: true }),
  adminIsbnPreview:  (isbn) => request('/admin/catalog/isbn-preview', { method: 'POST', body: { isbn }, includeCookies: true }),
  adminSaveBook:     (book) => request('/admin/catalog/book', { method: 'POST', body: book, includeCookies: true }),
  adminDeleteBook:   (id) => request(`/admin/catalog/book/${id}`, { method: 'DELETE', includeCookies: true }),
  adminRequests:     () => request('/admin/requests', { includeCookies: true }),
  adminDecideReturn: (id, decision, note) => request(`/admin/requests/return/${id}`, { method: 'PATCH', body: { decision, note }, includeCookies: true }),
  adminDecideCancel: (id, decision, note) => request(`/admin/requests/cancellation/${id}`, { method: 'PATCH', body: { decision, note }, includeCookies: true }),
};

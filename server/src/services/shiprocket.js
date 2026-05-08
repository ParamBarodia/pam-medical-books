// Shiprocket service — auto-creates courier orders post-payment.
// Caches the auth token (~9 days TTL) and refreshes on 401.
// Test/mock mode if SHIPROCKET_EMAIL is missing.

import 'dotenv/config';

const EMAIL    = process.env.SHIPROCKET_EMAIL;
const PASSWORD = process.env.SHIPROCKET_PASSWORD;
const PICKUP_LOCATION = process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary';
const IS_MOCK = !EMAIL || !PASSWORD;

const BASE = 'https://apiv2.shiprocket.in/v1/external';

let cachedToken = null;
let cachedAt = 0;
const TOKEN_TTL_MS = 8 * 24 * 60 * 60 * 1000;   // 8 days, refresh before 9-day expiry

async function getToken() {
  if (IS_MOCK) return 'mock-token';
  if (cachedToken && Date.now() - cachedAt < TOKEN_TTL_MS) return cachedToken;

  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Shiprocket auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.token;
  cachedAt = Date.now();
  return cachedToken;
}

async function shipFetch(path, options = {}, retry = true) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 && retry) {
    cachedToken = null;
    return shipFetch(path, options, false);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shiprocket ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// Create a courier order (post-payment).
// Returns Shiprocket order_id + shipment_id + tracking URL.
export async function createShiprocketOrder({ order, items, address }) {
  if (IS_MOCK) {
    return {
      order_id: 'sr_test_' + order.id.toLowerCase(),
      shipment_id: 'shp_test_' + Math.random().toString(36).slice(2, 8),
      tracking_url: `https://shiprocket.co/tracking/sr_test_${order.id.toLowerCase()}`,
      status: 'mock',
    };
  }

  const body = {
    order_id: order.id,
    order_date: new Date().toISOString().slice(0, 10),
    pickup_location: PICKUP_LOCATION,
    billing_customer_name: address.name?.split(' ')[0] || address.name,
    billing_last_name: address.name?.split(' ').slice(1).join(' ') || '',
    billing_address: address.line1,
    billing_address_2: address.line2 || '',
    billing_city: address.city,
    billing_pincode: address.pincode,
    billing_state: address.state,
    billing_country: 'India',
    billing_email: address.email || 'noreply@medshelf.in',
    billing_phone: address.phone,
    shipping_is_billing: true,
    order_items: items.map((i) => ({
      name: i.title.slice(0, 100),
      sku: i.book_id || i.bundle_id || i.title.slice(0, 30),
      units: i.qty,
      selling_price: i.unit_price,
    })),
    payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
    sub_total: order.total,
    length: 22, breadth: 16, height: 4, weight: 0.7,    // typical book — override per-bundle if needed
  };

  const created = await shipFetch('/orders/create/adhoc', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return {
    order_id: String(created.order_id),
    shipment_id: String(created.shipment_id),
    tracking_url: `https://shiprocket.co/tracking/${created.shipment_id}`,
    status: created.status || 'created',
    raw: created,
  };
}

// Cancel a Shiprocket order (e.g., on customer-initiated cancel)
export async function cancelShiprocketOrder(orderId) {
  if (IS_MOCK) return { ok: true, mock: true };
  return shipFetch('/orders/cancel', {
    method: 'POST',
    body: JSON.stringify({ ids: [orderId] }),
  });
}

// Get current courier rates for a destination (used at checkout for shipping estimate)
export async function getShippingRates({ pickup_pin, delivery_pin, weight = 0.7, cod = false }) {
  if (IS_MOCK) return { fastest: { rate: 49, etd: '2-3 days', courier: 'Mock Courier' } };
  const params = new URLSearchParams({
    pickup_postcode: pickup_pin,
    delivery_postcode: delivery_pin,
    weight: String(weight),
    cod: cod ? '1' : '0',
  });
  return shipFetch(`/courier/serviceability/?${params}`, { method: 'GET' });
}

export const IS_MOCK_SHIPROCKET = IS_MOCK;

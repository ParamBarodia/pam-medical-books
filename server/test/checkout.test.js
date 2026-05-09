// /api/orders/checkout — input validation + the new useSavedAddress contract.
// These tests guard against regressions where the server might:
//  - accept missing/short address
//  - accept absurd quantities (oversell)
//  - accept useSavedAddress for a phone with no record (would 500)
//  - accept COD without OTP (the bypass we patched in audit pass 1)
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import db from '../src/db/index.js';
import ordersRouter from '../src/routes/orders.js';

const app = express();
app.use(express.json());
app.use('/api', ordersRouter);

const PHONE = '+919876700001';
const VALID_ADDR = { line1: '1 Street', city: 'Ahmedabad', state: 'Gujarat', pincode: '380006' };
const ITEM = { bookId: 'b1', qty: 1 };

beforeAll(() => {
  // Ensure b1 exists with stock
  db.prepare(`INSERT OR REPLACE INTO books
    (id, title, author, mrp, price, cover_bg, cover_accent, cover_style, stock, shelf)
    VALUES ('b1', 'Test Book', 'Test Author', 1000, 800, '#000', '#fff', 'classic', 10, 'featured')`).run();
});

beforeEach(() => {
  db.prepare('DELETE FROM customers').run();
  db.prepare('DELETE FROM orders').run();
  db.prepare('DELETE FROM otps').run();
});

describe('POST /api/orders/checkout — input validation', () => {
  it('rejects missing phone', async () => {
    const res = await request(app).post('/api/orders/checkout')
      .send({ name: 'Valid Name', address: VALID_ADDR, items: [ITEM] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/phone/i);
  });

  it('rejects empty items array', async () => {
    const res = await request(app).post('/api/orders/checkout')
      .send({ phone: PHONE, name: 'Valid Name', address: VALID_ADDR, items: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/items/i);
  });

  it('rejects bad pincode', async () => {
    const res = await request(app).post('/api/orders/checkout')
      .send({ phone: PHONE, name: 'Valid Name', address: { ...VALID_ADDR, pincode: '12345' }, items: [ITEM] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pincode/i);
  });

  it('rejects oversold qty', async () => {
    const res = await request(app).post('/api/orders/checkout')
      .send({ phone: PHONE, name: 'Valid Name', address: VALID_ADDR, items: [{ bookId: 'b1', qty: 99 }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/qty/i);
  });

  it('rejects COD orders without OTP', async () => {
    const res = await request(app).post('/api/orders/checkout')
      .send({ phone: PHONE, name: 'Valid Name', address: VALID_ADDR, items: [ITEM], paymentMethod: 'cod' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/OTP required/);
  });
});

describe('POST /api/orders/checkout — useSavedAddress', () => {
  it('rejects useSavedAddress when phone has no saved record', async () => {
    const res = await request(app).post('/api/orders/checkout')
      .send({ phone: PHONE, useSavedAddress: true, items: [ITEM] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no saved address/);
  });

  it('uses the saved address when useSavedAddress is true and customer exists', async () => {
    // Seed the customer record
    db.prepare(`INSERT INTO customers (phone, name, last_address_json) VALUES (?, ?, ?)`)
      .run(PHONE, 'Existing User', JSON.stringify(VALID_ADDR));

    const res = await request(app).post('/api/orders/checkout')
      .send({ phone: PHONE, useSavedAddress: true, items: [ITEM] });
    expect(res.status).toBe(201);
    expect(res.body.orderId).toMatch(/^PMB/);
    // Confirm the order was actually inserted with the resolved address
    const order = db.prepare('SELECT address_json FROM orders WHERE id = ?').get(res.body.orderId);
    const addr = JSON.parse(order.address_json);
    expect(addr.pincode).toBe(VALID_ADDR.pincode);
    expect(addr.city).toBe(VALID_ADDR.city);
  });
});

describe('POST /api/orders/checkout — happy path', () => {
  it('places a UPI order and records the customer for next time', async () => {
    const res = await request(app).post('/api/orders/checkout')
      .send({ phone: PHONE, name: 'New User', email: 'new@x.dev',
              address: VALID_ADDR, items: [ITEM], paymentMethod: 'upi' });
    expect(res.status).toBe(201);
    expect(res.body.orderId).toMatch(/^PMB/);
    expect(res.body.razorpayOrderId).toBeDefined();
    expect(res.body.amount).toBe(800 + 49);   // price + shipping (under ₹999)

    // Customer record was upserted
    const c = db.prepare('SELECT name, email FROM customers WHERE phone = ?').get(PHONE);
    expect(c.name).toBe('New User');
    expect(c.email).toBe('new@x.dev');
  });
});

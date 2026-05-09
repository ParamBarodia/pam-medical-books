// /api/customer/lookup — the security-critical endpoint that used to leak
// every customer's name + email + full address.
// Tests assert it now returns ONLY masked hints; full PII never appears in
// any response, even for known customers.
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import db from '../src/db/index.js';
import customerRouter from '../src/routes/customer.js';

const app = express();
app.use(express.json());
app.use('/api', customerRouter);

const PHONE = '+919876512345';
const SECRET_NAME = 'Aarushi Khanna';
const SECRET_EMAIL = 'aarushi@example.com';
const SECRET_ADDR = { line1: '42 Long Street', city: 'Ahmedabad', state: 'Gujarat', pincode: '380006' };

beforeEach(() => {
  db.prepare('DELETE FROM customers').run();
  db.prepare('INSERT INTO customers (phone, name, email, last_address_json) VALUES (?, ?, ?, ?)')
    .run(PHONE, SECRET_NAME, SECRET_EMAIL, JSON.stringify(SECRET_ADDR));
});

describe('GET /api/customer/lookup', () => {
  it('returns {known:false} for unknown phones', async () => {
    const res = await request(app).get('/api/customer/lookup?phone=+919999999999');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ known: false });
  });

  it('returns ONLY masked hints for known phones — no raw PII', async () => {
    const res = await request(app).get(`/api/customer/lookup?phone=${encodeURIComponent(PHONE)}`);
    expect(res.status).toBe(200);
    expect(res.body.known).toBe(true);
    expect(res.body.hasAddress).toBe(true);
    // Masked hints should not equal the originals
    expect(res.body.nameHint).not.toBe(SECRET_NAME);
    expect(res.body.pincodeHint).not.toBe(SECRET_ADDR.pincode);
    // The raw response body must not contain any sensitive substring
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain(SECRET_NAME);
    expect(raw).not.toContain(SECRET_EMAIL);
    expect(raw).not.toContain(SECRET_ADDR.line1);
    expect(raw).not.toContain(SECRET_ADDR.city);
    expect(raw).not.toContain(SECRET_ADDR.state);
    expect(raw).not.toContain(SECRET_ADDR.pincode);
  });

  it('rejects malformed phones with 400', async () => {
    const res = await request(app).get('/api/customer/lookup?phone=notaphone');
    expect(res.status).toBe(400);
  });

  it('preserves the masking format (initial + *** + last char)', async () => {
    const res = await request(app).get(`/api/customer/lookup?phone=${encodeURIComponent(PHONE)}`);
    // "Aarushi" -> "A***i"
    expect(res.body.nameHint).toMatch(/^A\*+i$/);
    // "380006" -> "380***"
    expect(res.body.pincodeHint).toBe('380***');
  });
});

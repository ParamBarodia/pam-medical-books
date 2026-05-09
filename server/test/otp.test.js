// OTP service — tests cover the security-critical paths:
// - happy verify
// - wrong code increments attempts (and stays false)
// - exhausted attempts can't be retried
// - expired code returns false
// - cooldown rejects rapid re-issuance
// - constant-time compare doesn't throw on mismatched lengths
import { describe, it, expect, beforeEach } from 'vitest';
import db from '../src/db/index.js';
import { issueOtp, verifyOtp, normalizePhone } from '../src/services/otp.js';

const PHONE = '+919876500001';
const PURPOSE = 'cod_checkout';

beforeEach(() => {
  db.prepare('DELETE FROM otps').run();
});

describe('normalizePhone', () => {
  it('canonicalises 10 digits to +91 prefix', () => {
    expect(normalizePhone('9876543210')).toBe('+919876543210');
  });
  it('strips non-digits and accepts spaces', () => {
    expect(normalizePhone('98765 43210')).toBe('+919876543210');
  });
  it('accepts already-prefixed 91… numbers', () => {
    expect(normalizePhone('919876543210')).toBe('+919876543210');
  });
  it('returns null for too-short input', () => {
    expect(normalizePhone('1234')).toBeNull();
  });
  it('returns null for null/undefined', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});

describe('OTP verify', () => {
  it('verifies the correct code exactly once', async () => {
    await issueOtp(PHONE, PURPOSE);
    const row = db.prepare('SELECT code FROM otps WHERE phone = ?').get(PHONE);
    expect(verifyOtp(PHONE, PURPOSE, row.code)).toBe(true);
    // Second verify of the same code fails (consumed)
    expect(verifyOtp(PHONE, PURPOSE, row.code)).toBe(false);
  });

  it('rejects the wrong code and increments attempts', async () => {
    await issueOtp(PHONE, PURPOSE);
    expect(verifyOtp(PHONE, PURPOSE, '000000')).toBe(false);
    const row = db.prepare('SELECT attempts FROM otps WHERE phone = ?').get(PHONE);
    expect(row.attempts).toBe(1);
  });

  it('locks out after 5 wrong attempts', async () => {
    await issueOtp(PHONE, PURPOSE);
    const row = db.prepare('SELECT code FROM otps WHERE phone = ?').get(PHONE);
    for (let i = 0; i < 5; i++) verifyOtp(PHONE, PURPOSE, '000000');
    // Even the *correct* code now fails because attempts >= MAX
    expect(verifyOtp(PHONE, PURPOSE, row.code)).toBe(false);
  });

  it('rejects expired codes', async () => {
    await issueOtp(PHONE, PURPOSE);
    db.prepare('UPDATE otps SET expires_at = ? WHERE phone = ?').run(Date.now() - 1000, PHONE);
    const row = db.prepare('SELECT code FROM otps WHERE phone = ?').get(PHONE);
    expect(verifyOtp(PHONE, PURPOSE, row.code)).toBe(false);
  });

  it('does not throw on length-mismatched codes (constant-time safe)', async () => {
    await issueOtp(PHONE, PURPOSE);
    expect(() => verifyOtp(PHONE, PURPOSE, 'short')).not.toThrow();
    expect(() => verifyOtp(PHONE, PURPOSE, 'wayTooLongOfACodeForBuffer')).not.toThrow();
    expect(() => verifyOtp(PHONE, PURPOSE, '')).not.toThrow();
    expect(() => verifyOtp(PHONE, PURPOSE, null)).not.toThrow();
  });

  it('rejects unknown OTP purpose', async () => {
    await expect(issueOtp(PHONE, 'evil_purpose')).rejects.toThrow(/Unknown OTP purpose/);
  });
});

describe('OTP cooldown', () => {
  it('blocks reissue within 60s with status 429', async () => {
    await issueOtp(PHONE, PURPOSE);
    await expect(issueOtp(PHONE, PURPOSE)).rejects.toMatchObject({ status: 429 });
  });
});

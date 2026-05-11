// Modals — phone-only model. ProductModal, CartDrawer, CheckoutModal.
// No AuthModal / AccountDrawer / WishlistDrawer (those needed accounts).
import React, { useEffect, useRef, useState } from 'react';
import { Icon, BookCover } from './components.jsx';
import { api } from './api.js';
import { useDialogFocus } from './hooks.js';
import { archiveCode } from './lib/archive-code.js';

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Razorpay script failed to load')));
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Razorpay script failed to load'));
    document.head.appendChild(s);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// ProductModal
// ────────────────────────────────────────────────────────────────────────────
export function ProductModal({ book, onClose, onAdd }) {
  const [tab, setTab] = useState('description');
  const dialogRef = useRef(null);
  const discount = Math.round((1 - book.price / book.mrp) * 100);
  const stock = book.stock ?? 0;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  useDialogFocus(dialogRef, onClose);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(28,26,20,0.78)', backdropFilter: 'blur(4px)',
      zIndex: 95, animation: 'fade .2s ease-out', overflowY: 'auto', padding: '40px 20px',
    }}>
      <div onClick={e => e.stopPropagation()} ref={dialogRef} role="dialog" aria-modal="true"
        aria-labelledby="product-modal-title" tabIndex={-1}
        style={{
        maxWidth: 1080, margin: '0 auto', background: 'var(--paper)',
        position: 'relative', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5)',
      }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 16, right: 16, zIndex: 5,
          width: 44, height: 44, background: 'var(--paper)', border: '1px solid var(--rule-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={18} />
        </button>
        <div className="ms-modal-grid" style={{ display: 'grid', gridTemplateColumns: '420px 1fr' }}>
          <div style={{ background: 'var(--paper-2)', padding: '48px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--rule-soft)' }}>
            <BookCover book={book} width={280} height={390} />
          </div>
          <div style={{ padding: '40px 44px' }}>
            <div className="t-archive" style={{ marginBottom: 2 }}>{archiveCode(book)}</div>
            <div className="eyebrow" style={{ color: 'var(--muted)' }}>{book.publisher || 'Pam Medical Books'} · {book.category}</div>
            <h1 id="product-modal-title" className="display" style={{ fontSize: 'clamp(22px, 4vw, 32px)', lineHeight: 1.1, margin: '8px 0 6px', fontWeight: 500 }}>{book.title}</h1>
            <div className="serif" style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic' }}>
              by <span style={{ color: 'var(--ink)', fontStyle: 'normal', fontWeight: 600 }}>{book.author}</span> · {book.edition}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
              <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--paper-2)', fontSize: 12 }}>
                <span style={{ color: 'var(--gold)' }}>★</span> {book.rating?.toFixed(1)}
              </div>
              <div className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>{book.reviews?.toLocaleString('en-IN')} ratings</div>
              {stock > 0 && <div className="sans" style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: stock < 10 ? '#d97706' : '#16a34a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>● {stock < 10 ? `Only ${stock} left` : 'In stock'}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 22, paddingBottom: 22, borderBottom: '1px solid var(--rule-soft)' }}>
              <span className="serif" style={{ fontSize: 40, fontWeight: 600, color: 'var(--accent)' }}>₹{book.price.toLocaleString('en-IN')}</span>
              <span className="mono" style={{ fontSize: 16, color: 'var(--muted)', textDecoration: 'line-through' }}>₹{book.mrp.toLocaleString('en-IN')}</span>
              <span className="sans" style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', padding: '3px 8px', background: 'rgba(44,106,74,0.12)', letterSpacing: '0.08em' }}>{discount}% OFF</span>
            </div>

            <div style={{ display: 'flex', gap: 4, marginTop: 22, borderBottom: '1px solid var(--rule-soft)' }}>
              {['description', 'specs'].map(t => (
                <button key={t} onClick={() => setTab(t)} className="sans" style={{
                  padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: tab === t ? 'var(--ink)' : 'var(--muted)',
                  borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1 }}>{t}</button>
              ))}
            </div>
            <div className="serif" style={{ padding: '18px 0', minHeight: 100, fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)' }}>
              {tab === 'description' && <p style={{ margin: 0 }}>{book.description || 'Detailed information being updated.'}</p>}
              {tab === 'specs' && (
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 10, columnGap: 24, fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>Author</span><span>{book.author}</span>
                  <span style={{ color: 'var(--muted)' }}>Edition</span><span>{book.edition}</span>
                  <span style={{ color: 'var(--muted)' }}>Publisher</span><span>{book.publisher || '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>ISBN</span><span className="mono">{book.isbn || '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>Pages</span><span>{book.pages || '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>Language</span><span>{book.language || 'English'}</span>
                </div>
              )}
            </div>
            <div style={{ marginTop: 'auto', paddingTop: 18, borderTop: '1px solid var(--rule-soft)', display: 'flex', gap: 12 }}>
              <button onClick={() => { onAdd(); onClose(); }} disabled={stock === 0}
                className={`ms-btn ${stock === 0 ? '' : 'ms-btn-primary'}`}
                style={{ flex: 1, padding: 14, fontSize: 12, ...(stock === 0 ? { background: '#cbd5e1', color: 'var(--paper)' } : {}) }}>
                <Icon name="cart" size={14} /> {stock === 0 ? 'Notify Me' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CartDrawer
// ────────────────────────────────────────────────────────────────────────────
export function CartDrawer({ items, onUpdateQty, onClose, onCheckout }) {
  const dialogRef = useRef(null);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const saved    = items.reduce((s, i) => s + (i.mrp - i.price) * i.qty, 0);
  const tier     = subtotal >= 10000 ? 200 : subtotal >= 5000 ? 100 : 0;
  const shipping = subtotal >= 999 ? 0 : 49;
  const total    = subtotal - tier + shipping;
  useDialogFocus(dialogRef, onClose);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(28,26,20,0.7)', zIndex: 90, animation: 'fade .2s ease-out' }}>
      <div onClick={e => e.stopPropagation()} ref={dialogRef} className="ms-cart-drawer"
        role="dialog" aria-modal="true" aria-label="Cart" tabIndex={-1}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 440, maxWidth: '100vw', background: 'var(--paper)',
          display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 40px rgba(0,0,0,0.4)', animation: 'slide-up .22s ease-out' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--rule-soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="cart" size={20} />
          <div className="display" style={{ fontSize: 22, fontWeight: 500, flex: 1 }}>
            Your Cart {items.length > 0 && <span className="serif" style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--muted)', fontWeight: 400 }}>· {items.length} {items.length === 1 ? 'item' : 'items'}</span>}
          </div>
          <button onClick={onClose} aria-label="Close cart" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
          {!items.length && (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <Icon name="cart" size={36} />
              <div className="display" style={{ fontSize: 18, fontWeight: 500, marginTop: 12 }}>Your cart is empty</div>
              <div className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: 6 }}>Add books from the catalogue to get started.</div>
            </div>
          )}
          {items.map(item => (
            <div key={item.id + (item.isBundle ? '_b' : '')} style={{ display: 'flex', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--rule-soft)' }}>
              {item.cover ? <BookCover book={item} width={60} height={84} /> : (
                <div style={{ width: 60, height: 84, background: 'var(--ink)', color: 'var(--saffron)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, fontFamily: 'var(--sans)' }}>BUNDLE</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{item.title}</div>
                {item.author && <div className="serif" style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--muted)', marginTop: 2 }}>{item.author} · {item.edition}</div>}
                {!item.isBundle && <div className="t-archive" style={{ fontSize: 9, marginTop: 4 }}>{archiveCode(item)}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--rule-soft)', padding: 2 }}>
                    <button onClick={() => onUpdateQty(item.id, -1, item.isBundle)} aria-label="Decrease" style={{ width: 32, height: 32, color: 'var(--muted)' }}><Icon name="minus" size={13} /></button>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600, minWidth: 18, textAlign: 'center' }}>{item.qty}</span>
                    <button onClick={() => onUpdateQty(item.id, 1, item.isBundle)} aria-label="Increase" style={{ width: 32, height: 32, color: 'var(--muted)' }}><Icon name="plus" size={13} /></button>
                  </div>
                  <span className="serif" style={{ fontSize: 14, fontWeight: 600 }}>₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div style={{ borderTop: '1px solid var(--rule-soft)', padding: '20px 24px', background: 'var(--paper-2)' }}>
            <Line label="Subtotal" value={`₹${subtotal.toLocaleString('en-IN')}`} />
            <Line label="You save" value={`− ₹${saved.toLocaleString('en-IN')}`} positive />
            {tier > 0 && <Line label={`Tier offer (₹${subtotal >= 10000 ? '10K' : '5K'}+)`} value={`− ₹${tier}`} positive />}
            <Line label="Shipping" value={shipping === 0 ? 'FREE' : `₹${shipping}`} />
            <div style={{ paddingTop: 12, borderTop: '1px solid var(--rule-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="sans" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total</span>
              <span className="display" style={{ fontSize: 26, fontWeight: 600 }}>₹{total.toLocaleString('en-IN')}</span>
            </div>
            <button onClick={onCheckout} className="ms-btn ms-btn-primary" style={{ width: '100%', marginTop: 16, padding: 14 }}>
              Proceed to Checkout <span className="ms-arrow">→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Line({ label, value, positive }) {
  return (
    <div className="serif" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13,
      color: positive ? 'var(--success)' : 'var(--ink)', fontWeight: positive ? 600 : 500 }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CheckoutModal — phone-first flow
//   1. Phone (+ name + email)
//        → if returning customer with complete address, jump to PAYMENT
//        → otherwise continue to ADDRESS
//   2. Address (with pincode → city/state autofill via India Post)
//   3. Payment method
//   4. (COD only) OTP verify  → place order
// ────────────────────────────────────────────────────────────────────────────
const STEP = { PHONE: 1, ADDRESS: 2, PAYMENT: 3, OTP: 4, DONE: 5 };
const blankAddress = { line1: '', line2: '', city: '', state: '', pincode: '' };

// India Post free pincode lookup. Returns { city, state } or null.
const pincodeCache = new Map();
async function lookupPincode(pin) {
  if (!/^\d{6}$/.test(pin)) return null;
  if (pincodeCache.has(pin)) return pincodeCache.get(pin);
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    if (!res.ok) return null;
    const data = await res.json();
    const office = data?.[0]?.PostOffice?.[0];
    if (!office) return null;
    const result = { city: office.District, state: office.State };
    pincodeCache.set(pin, result);
    return result;
  } catch { return null; }
}

function isCompleteAddress(a) {
  return !!(a?.line1 && a?.city && a?.state && /^\d{6}$/.test(a?.pincode || ''));
}

export function CheckoutModal({ items, onClose, onComplete }) {
  const dialogRef = useRef(null);
  const [step, setStep] = useState(STEP.PHONE);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState(blankAddress);
  const [editingAddress, setEditingAddress] = useState(false);
  const [savedHint, setSavedHint] = useState(null);   // {nameHint, pincodeHint} — server-masked
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [otpCode, setOtpCode] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  useDialogFocus(dialogRef, () => { if (step !== STEP.DONE) onClose(); });

  const phoneValid = /^\d{10}$/.test(phone.replace(/\D/g, ''));
  const addrValid  = useSavedAddress
    ? !editingAddress    // saved address path → server will resolve
    : (name && isCompleteAddress(address));

  // Pincode → city/state autofill. Fires when 6 digits entered.
  useEffect(() => {
    const pin = address.pincode;
    if (!/^\d{6}$/.test(pin)) return;
    let cancelled = false;
    setPincodeLoading(true);
    lookupPincode(pin).then((res) => {
      if (cancelled || !res) { setPincodeLoading(false); return; }
      setAddress((a) => ({
        ...a,
        // Only overwrite if the user hasn't already typed something
        city: a.city && a.city !== res.city ? a.city : res.city,
        state: a.state && a.state !== res.state ? a.state : res.state,
      }));
      setPincodeLoading(false);
    });
    return () => { cancelled = true; };
  }, [address.pincode]);

  // After typing phone, look up & decide whether to skip address entry.
  // The server returns ONLY masked hints — no actual name / address /
  // email — so we can't prefill PII fields. Instead the user sees a
  // "Welcome back" banner and can opt to use the saved address (the
  // server resolves it at order time) or type a different one.
  const handlePhoneNext = async () => {
    setErr(''); setLoading(true);
    try {
      const lookup = await api.lookupCustomer(phone).catch(() => ({ known: false }));
      if (lookup.known) {
        setSavedHint({ nameHint: lookup.nameHint, pincodeHint: lookup.pincodeHint });
        if (lookup.hasAddress) {
          // Repeat customer with a complete saved address → straight to payment.
          // Order placement will set useSavedAddress: true.
          setUseSavedAddress(true);
          setStep(STEP.PAYMENT);
          return;
        }
      }
      setStep(STEP.ADDRESS);
    } catch (e) { setErr(e.message || 'Lookup failed'); }
    finally { setLoading(false); }
  };

  const sendOtp = async () => {
    setErr(''); setLoading(true);
    try {
      const r = await api.requestOtp(phone, 'cod_checkout');
      setOtpExpiresAt(r.expiresAt);
      setStep(STEP.OTP);
      if (r.mock) setErr('Mock SMS mode: check the server console for the OTP');
    } catch (e) {
      setErr(e.data?.error || e.message || 'Failed to send OTP');
    }
    finally { setLoading(false); }
  };

  const placeOrder = async (otp) => {
    setErr(''); setLoading(true);
    try {
      const payload = {
        phone, email,
        items: items.map(i => ({ bookId: i.id, qty: i.qty, isBundle: !!i.isBundle })),
        paymentMethod,
      };
      // Either use saved address (server resolves) or supply name+address
      if (useSavedAddress) {
        payload.useSavedAddress = true;
      } else {
        payload.name = name;
        payload.address = address;
      }
      if (paymentMethod === 'cod') payload.otp = otp;

      const result = await api.checkout(payload);

      // COD: order is placed immediately
      if (paymentMethod === 'cod') {
        setOrder(result);
        setStep(STEP.DONE);
        return;
      }

      // Mock-mode online payment: verify with placeholder
      if (result.mockMode) {
        await api.verifyPayment(result.orderId, {
          phone,
          razorpay_order_id: result.razorpayOrderId,
          razorpay_payment_id: 'pay_test_' + Date.now().toString(36),
        });
        setOrder(result);
        setStep(STEP.DONE);
        return;
      }

      // Live Razorpay
      await loadRazorpayScript();
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: result.razorpayKeyId,
          amount: result.amount * 100,
          currency: result.currency,
          name: 'Pam Medical Books',
          description: `Order ${result.orderId}`,
          order_id: result.razorpayOrderId,
          prefill: { name, contact: phone, email: email || undefined },
          theme: { color: '#8B2A1F' },
          handler: async (rsp) => {
            try {
              await api.verifyPayment(result.orderId, { phone, ...rsp });
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        });
        rzp.open();
      });
      setOrder(result);
      setStep(STEP.DONE);
    } catch (e) {
      setErr(e.data?.error || e.message || 'Checkout failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,26,20,0.85)', zIndex: 100, overflowY: 'auto', padding: '32px 20px' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Secure checkout" tabIndex={-1}
        style={{ maxWidth: 720, margin: '0 auto', background: 'var(--paper)', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--rule-soft)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Icon name="lock" size={18} />
          <div className="display" style={{ fontSize: 22, fontWeight: 500, flex: 1 }}>Secure Checkout</div>
          {step !== STEP.DONE && <button onClick={onClose} aria-label="Close" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={18} /></button>}
        </div>
        <div style={{ padding: '28px 32px', minHeight: 320 }}>

          {step === STEP.PHONE && (
            <>
              <h3 className="display" style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Your phone number</h3>
              <p className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', margin: '0 0 20px' }}>
                We'll WhatsApp you the order confirmation, invoice, and tracking link.
              </p>
              <Field label="Phone (10 digits)" value={phone}
                onChange={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                placeholder="98765 43210"
                autoComplete="tel-national"
                inputMode="numeric" />
              <Field label="Email (optional, for invoice)" type="email" value={email} onChange={setEmail}
                autoComplete="email" />
              {err && <div className="serif" style={{ color: 'var(--accent)', fontSize: 13, marginTop: 10 }}>{err}</div>}
            </>
          )}

          {step === STEP.ADDRESS && (
            <>
              <h3 className="display" style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>
                {savedHint && !editingAddress ? 'Confirm your address' : 'Delivery address'}
              </h3>
              <p className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', margin: '0 0 16px' }}>
                {savedHint ? `Welcome back, ${savedHint.nameHint}.` : `Tip: type your PIN code first — we'll fill in city and state.`}
              </p>

              {/* Recap for returning customers: only the masked hint is shown.
                  Server resolves the full address at order time. */}
              {savedHint?.pincodeHint && !editingAddress && (
                <div style={{
                  background: 'var(--paper-2)', padding: '16px 18px', border: '1px solid var(--rule-soft)',
                  marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14,
                }}>
                  <div className="serif" style={{ fontSize: 14, lineHeight: 1.5 }}>
                    <strong>Use your saved address</strong><br/>
                    <span style={{ color: 'var(--muted)' }}>PIN ending {savedHint.pincodeHint} · we'll fill in the rest</span>
                  </div>
                  <button onClick={() => { setEditingAddress(true); setUseSavedAddress(false); }} className="sans"
                    style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)' }}>
                    USE DIFFERENT
                  </button>
                </div>
              )}

              {(editingAddress || !savedHint?.pincodeHint) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Full name *" value={name} onChange={setName} span={2}
                    autoComplete="name" />
                  <Field label="PIN code *" value={address.pincode}
                    onChange={v => setAddress(a => ({ ...a, pincode: v.replace(/\D/g, '').slice(0, 6) }))}
                    placeholder="380006"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    suffix={pincodeLoading ? '…' : (address.pincode.length === 6 && address.city ? '✓' : '')}
                    hint={address.pincode.length === 6 && address.city ? `${address.city}, ${address.state}` : 'We auto-fill city + state from this'}
                    span={2} />
                  <Field label="Address line 1 *" value={address.line1}
                    onChange={v => setAddress(a => ({ ...a, line1: v }))}
                    placeholder="House / flat no, building, street"
                    autoComplete="address-line1" span={2} />
                  <Field label="Landmark / area (optional)" value={address.line2}
                    onChange={v => setAddress(a => ({ ...a, line2: v }))}
                    autoComplete="address-line2" span={2} />
                  <Field label="City *" value={address.city}
                    onChange={v => setAddress(a => ({ ...a, city: v }))}
                    autoComplete="address-level2" />
                  <Field label="State *" value={address.state}
                    onChange={v => setAddress(a => ({ ...a, state: v }))}
                    autoComplete="address-level1" />
                </div>
              )}
            </>
          )}

          {step === STEP.PAYMENT && (
            <>
              <h3 className="display" style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Payment method</h3>
              <p className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', margin: '0 0 20px' }}>All payments via Razorpay (UPI, cards, netbanking, COD).</p>
              {[
                { id: 'upi',        label: 'UPI',                 sub: 'GPay, PhonePe, Paytm, BHIM' },
                { id: 'card',       label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay, Amex' },
                { id: 'netbanking', label: 'Net Banking',         sub: 'All major Indian banks' },
                { id: 'cod',        label: 'Cash on Delivery',    sub: '+ ₹49 handling · OTP verification required' },
              ].map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  background: paymentMethod === p.id ? 'var(--paper-2)' : 'var(--paper)',
                  border: paymentMethod === p.id ? '2px solid var(--accent)' : '2px solid var(--rule-soft)',
                  marginBottom: 10, cursor: 'pointer' }}>
                  <input type="radio" checked={paymentMethod === p.id} onChange={() => setPaymentMethod(p.id)} />
                  <div style={{ flex: 1 }}>
                    <div className="serif" style={{ fontSize: 14, fontWeight: 600 }}>{p.label}</div>
                    <div className="serif" style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>{p.sub}</div>
                  </div>
                </label>
              ))}
              {err && <div className="serif" style={{ color: 'var(--accent)', fontSize: 13, marginTop: 10 }}>{err}</div>}
            </>
          )}

          {step === STEP.OTP && (
            <>
              <h3 className="display" style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Verify your phone</h3>
              <p className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', margin: '0 0 20px' }}>
                We sent a 6-digit code to +91 {phone}. Enter it to confirm your COD order.
              </p>
              <Field label="6-digit code" value={otpCode}
                onChange={v => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                autoComplete="one-time-code"
                inputMode="numeric" />
              <button onClick={sendOtp} className="sans" style={{
                marginTop: 8, fontSize: 11, color: 'var(--accent)', fontWeight: 600,
                letterSpacing: '0.08em' }}>RESEND CODE</button>
              {err && <div className="serif" style={{ color: 'var(--accent)', fontSize: 13, marginTop: 10 }}>{err}</div>}
            </>
          )}

          {step === STEP.DONE && order && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(44,106,74,0.15)',
                color: 'var(--success)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={40} stroke={3} />
              </div>
              <h3 className="display" style={{ fontSize: 30, fontWeight: 500, margin: '0 0 8px' }}>Order placed!</h3>
              <p className="serif" style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', margin: '0 0 24px' }}>
                Confirmation sent to <strong style={{ color: 'var(--ink)', fontStyle: 'normal' }}>+91 {phone}</strong>
              </p>
              <div style={{ display: 'inline-block', padding: '18px 28px', background: 'var(--paper-2)', border: '1px dashed var(--accent)', marginBottom: 24 }}>
                <div className="eyebrow" style={{ color: 'var(--muted)' }}>Order ID</div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{order.orderId}</div>
              </div>
              <div>
                <button onClick={() => onComplete(order.orderId)} className="sans" style={{
                  background: 'var(--accent)', color: 'var(--paper)', padding: '14px 32px',
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                  Continue Shopping →
                </button>
              </div>
            </div>
          )}
        </div>

        {step !== STEP.DONE && (
          <div style={{ padding: '16px 28px', borderTop: '1px solid var(--rule-soft)', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--paper-2)' }}>
            {step > STEP.PHONE && step !== STEP.OTP && <button onClick={() => setStep(s => s - 1)} className="sans" style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>← Back</button>}
            <div className="serif" style={{ flex: 1, fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
              <Icon name="lock" size={12} /> Secure · Razorpay
            </div>
            {step === STEP.PHONE && (
              <button disabled={!phoneValid || loading} onClick={handlePhoneNext} className="sans"
                style={{ background: phoneValid ? 'var(--accent)' : '#cbd5e1', color: 'var(--paper)',
                  padding: '12px 22px', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                {loading ? '…' : 'Continue →'}
              </button>
            )}
            {step === STEP.ADDRESS && (
              <button disabled={!addrValid} onClick={() => setStep(STEP.PAYMENT)} className="sans"
                style={{ background: addrValid ? 'var(--accent)' : '#cbd5e1', color: 'var(--paper)',
                  padding: '12px 22px', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Continue to Payment →
              </button>
            )}
            {step === STEP.PAYMENT && (
              <button disabled={loading} onClick={() => paymentMethod === 'cod' ? sendOtp() : placeOrder()} className="sans"
                style={{ background: 'var(--accent)', color: 'var(--paper)',
                  padding: '12px 22px', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                {loading ? '…' : (paymentMethod === 'cod' ? 'Send OTP →' : 'Pay Now →')}
              </button>
            )}
            {step === STEP.OTP && (
              <button disabled={loading || otpCode.length !== 6} onClick={() => placeOrder(otpCode)} className="sans"
                style={{ background: otpCode.length === 6 ? 'var(--accent)' : '#cbd5e1', color: 'var(--paper)',
                  padding: '12px 22px', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                {loading ? '…' : 'Verify & Place Order'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', span = 1, placeholder,
                 autoComplete, inputMode, hint, suffix }) {
  return (
    <label style={{ gridColumn: `span ${span}`, display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
      <span className="sans" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.04em' }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <input type={type} value={value} placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '12px 14px', fontSize: 14, fontFamily: 'var(--serif)',
            background: 'var(--paper)', border: '1px solid var(--rule-soft)', color: 'var(--ink)', outline: 'none' }} />
        {suffix && (
          <span className="sans" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>{suffix}</span>
        )}
      </div>
      {hint && <span className="serif" style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>{hint}</span>}
    </label>
  );
}

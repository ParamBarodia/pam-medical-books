// Modals — product detail, auth, cart drawer, checkout (multi-step), wishlist, account
import React, { useEffect, useState } from 'react';
import { Icon, BookCover } from './components.jsx';
import { api } from './api.js';

// Loads Razorpay's checkout script once. No-ops if already present.
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
export function ProductModal({ book, onClose, onAdd, onWish, wished }) {
  const [tab, setTab] = useState('description');
  const discount = Math.round((1 - book.price / book.mrp) * 100);
  const stock = book.stock ?? 0;

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, background: 'rgba(28,26,20,0.78)', backdropFilter: 'blur(4px)',
      zIndex: 95, animation: 'fade .2s ease-out', overflowY: 'auto', padding: '40px 20px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
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
            <div className="eyebrow" style={{ color: 'var(--muted)' }}>{book.publisher || 'Pam Medical Books'} · {book.category}</div>
            <h1 className="display" style={{ fontSize: 'clamp(22px, 4vw, 32px)', lineHeight: 1.1, margin: '8px 0 6px', fontWeight: 500 }}>{book.title}</h1>
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
              <button onClick={onWish} aria-label="Wishlist" style={{ width: 48, height: 48,
                background: wished ? 'rgba(139,42,31,0.1)' : 'var(--paper-2)',
                border: '1px solid var(--rule-soft)',
                color: wished ? 'var(--accent)' : 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={wished ? 'heart-fill' : 'heart'} size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// AuthModal — sign in / sign up
// ────────────────────────────────────────────────────────────────────────────
export function AuthModal({ onClose, onSignedIn, login, signup }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', referredBy: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const handle = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else                   await signup(form);
      onSignedIn();
    } catch (e) { setErr(e.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, background: 'rgba(28,26,20,0.78)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 460, width: '100%', background: 'var(--paper)', padding: 36, position: 'relative',
        boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5)',
      }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 16, right: 16,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={18} />
        </button>
        <h2 className="display" style={{ fontSize: 28, fontWeight: 500, margin: '0 0 6px' }}>
          {mode === 'login' ? 'Welcome back.' : <>Join Pam Medical Books<span style={{ color: 'var(--accent)' }}>.</span></>}
        </h2>
        <p className="serif" style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 22 }}>
          {mode === 'login' ? 'Sign in to your saved cart, wishlist, and orders.' : 'Save your cart and earn ₹200 for every classmate you refer.'}
        </p>
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <Field label="Full name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
          )}
          <Field label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
          <Field label="Password" type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} required />
          {mode === 'signup' && (
            <Field label="Referral code (optional)" value={form.referredBy} onChange={v => setForm(f => ({ ...f, referredBy: v.toUpperCase() }))} />
          )}
          {err && <div className="serif" style={{ color: 'var(--accent)', fontSize: 13, fontStyle: 'italic' }}>{err}</div>}
          <button type="submit" disabled={loading} className="ms-btn ms-btn-primary" style={{ padding: 14, marginTop: 8 }}>
            {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <div className="serif" style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
          {mode === 'login'
            ? <>New here? <button onClick={() => setMode('signup')} style={{ color: 'var(--accent)', fontWeight: 600 }}>Create an account</button></>
            : <>Have an account? <button onClick={() => setMode('login')} style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</button></>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span className="sans" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        style={{ padding: '12px 14px', fontSize: 14, fontFamily: 'var(--serif)',
          border: '1px solid var(--rule-soft)', background: 'var(--paper-2)', color: 'var(--ink)', outline: 'none' }} />
    </label>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CartDrawer
// ────────────────────────────────────────────────────────────────────────────
export function CartDrawer({ items, onUpdateQty, onClose, onCheckout }) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const saved    = items.reduce((s, i) => s + (i.mrp - i.price) * i.qty, 0);
  const tier     = subtotal >= 10000 ? 200 : subtotal >= 5000 ? 100 : 0;
  const shipping = subtotal >= 999 ? 0 : 49;
  const total    = subtotal - tier + shipping;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(28,26,20,0.7)', zIndex: 90, animation: 'fade .2s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} className="ms-cart-drawer"
        role="dialog" aria-modal="true" aria-label="Cart"
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 440, background: 'var(--paper)',
          display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 40px rgba(0,0,0,0.4)',
          animation: 'slide-up .22s ease-out' }}>
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
                <div style={{ width: 60, height: 84, background: 'var(--ink)', color: 'var(--saffron)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, fontFamily: 'var(--sans)' }}>
                  BUNDLE
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{item.title}</div>
                {item.author && <div className="serif" style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--muted)', marginTop: 2 }}>{item.author} · {item.edition}</div>}
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
// CheckoutModal — 3-step (address → payment → confirmation)
// Calls real backend: POST /orders/checkout, then POST /orders/:id/verify
// ────────────────────────────────────────────────────────────────────────────
export function CheckoutModal({ items, user, onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({
    name: user?.name || '', phone: user?.phone || '', email: user?.email || '',
    line1: '', line2: '', city: '', state: '', pincode: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape' && step !== 3) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
  }, [onClose, step]);

  const valid = address.name && address.phone.length >= 10 && address.line1 && address.city && address.pincode.length === 6;

  const placeOrder = async () => {
    setErr(''); setLoading(true);
    try {
      const result = await api.checkout(address, paymentMethod);

      // COD: server already created the order; nothing to verify, just confirm.
      if (paymentMethod === 'cod') {
        setOrder(result);
        setStep(3);
        return;
      }

      // Mock mode: server returns mockMode=true; just call verify with no signature.
      if (result.mockMode) {
        await api.verifyPayment(result.orderId, {
          razorpay_order_id: result.razorpayOrderId,
          razorpay_payment_id: 'pay_test_' + Date.now().toString(36),
        });
        setOrder(result);
        setStep(3);
        return;
      }

      // Real mode: load Razorpay checkout JS, open the modal, verify on success.
      await loadRazorpayScript();
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: result.razorpayKeyId,
          amount: result.amount * 100,
          currency: result.currency,
          name: 'Pam Medical Books',
          description: `Order ${result.orderId}`,
          order_id: result.razorpayOrderId,
          prefill: { name: address.name, email: address.email, contact: address.phone },
          theme: { color: '#8B2A1F' },
          handler: async (rsp) => {
            try {
              await api.verifyPayment(result.orderId, rsp);
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        });
        rzp.open();
      });
      setOrder(result);
      setStep(3);
    } catch (e) { setErr(e.message || 'Checkout failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,26,20,0.85)', zIndex: 100, overflowY: 'auto', padding: '32px 20px' }}>
      <div role="dialog" aria-modal="true" style={{ maxWidth: 920, margin: '0 auto', background: 'var(--paper)',
        boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--rule-soft)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Icon name="lock" size={18} />
          <div className="display" style={{ fontSize: 22, fontWeight: 500, flex: 1 }}>Secure Checkout</div>
          {step !== 3 && <button onClick={onClose} aria-label="Close" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={18} /></button>}
        </div>

        <div style={{ padding: '28px 32px', minHeight: 360 }}>
          {step === 1 && (
            <>
              <h3 className="display" style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Delivery Address</h3>
              <p className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', margin: '0 0 20px' }}>Where should we ship your books?</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <CheckoutField label="Full name *" value={address.name} onChange={v => setAddress(a => ({ ...a, name: v }))} />
                <CheckoutField label="Phone *" value={address.phone} onChange={v => setAddress(a => ({ ...a, phone: v.replace(/\D/g, '').slice(0, 10) }))} />
                <CheckoutField label="Email" type="email" value={address.email} onChange={v => setAddress(a => ({ ...a, email: v }))} span={2} />
                <CheckoutField label="Address line 1 *" value={address.line1} onChange={v => setAddress(a => ({ ...a, line1: v }))} span={2} />
                <CheckoutField label="Address line 2" value={address.line2} onChange={v => setAddress(a => ({ ...a, line2: v }))} span={2} />
                <CheckoutField label="City *" value={address.city} onChange={v => setAddress(a => ({ ...a, city: v }))} />
                <CheckoutField label="State *" value={address.state} onChange={v => setAddress(a => ({ ...a, state: v }))} />
                <CheckoutField label="PIN code *" value={address.pincode} onChange={v => setAddress(a => ({ ...a, pincode: v.replace(/\D/g, '').slice(0, 6) }))} />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h3 className="display" style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Payment Method</h3>
              <p className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', margin: '0 0 20px' }}>All payments are encrypted via Razorpay (test mode).</p>
              {[
                { id: 'upi',        label: 'UPI',                 sub: 'GPay, PhonePe, Paytm, BHIM' },
                { id: 'card',       label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay, Amex' },
                { id: 'netbanking', label: 'Net Banking',         sub: 'All major Indian banks' },
                { id: 'cod',        label: 'Cash on Delivery',    sub: 'Pay when your books arrive · ₹49 extra' },
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
          {step === 3 && order && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(44,106,74,0.15)',
                color: 'var(--success)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={40} stroke={3} />
              </div>
              <h3 className="display" style={{ fontSize: 30, fontWeight: 500, margin: '0 0 8px' }}>Order placed!</h3>
              <p className="serif" style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', margin: '0 0 24px' }}>
                Thank you, <strong style={{ color: 'var(--ink)', fontStyle: 'normal' }}>{address.name}</strong>!
              </p>
              <div style={{ display: 'inline-block', padding: '18px 28px', background: 'var(--paper-2)', border: '1px dashed var(--accent)', marginBottom: 24 }}>
                <div className="eyebrow" style={{ color: 'var(--muted)' }}>Order ID</div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{order.orderId}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>razorpay: {order.razorpayOrderId}</div>
              </div>
              <button onClick={() => { onComplete(order.orderId); }} className="sans" style={{
                background: 'var(--accent)', color: 'var(--paper)', padding: '14px 32px',
                fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Continue Shopping →
              </button>
            </div>
          )}
        </div>

        {step !== 3 && (
          <div style={{ padding: '16px 28px', borderTop: '1px solid var(--rule-soft)', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--paper-2)' }}>
            {step > 1 && <button onClick={() => setStep(s => s - 1)} className="sans" style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>← Back</button>}
            <div className="serif" style={{ flex: 1, fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
              <Icon name="lock" size={12} /> Secure Razorpay checkout
            </div>
            {step === 1 && (
              <button disabled={!valid} onClick={() => setStep(2)} className="sans"
                style={{ background: valid ? 'var(--accent)' : '#cbd5e1', color: 'var(--paper)',
                  padding: '12px 22px', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Continue to Payment →
              </button>
            )}
            {step === 2 && (
              <button disabled={loading} onClick={placeOrder} className="sans"
                style={{ background: 'var(--accent)', color: 'var(--paper)',
                  padding: '12px 22px', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                {loading ? '…' : 'Place Order'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutField({ label, value, onChange, type = 'text', span = 1 }) {
  return (
    <label style={{ gridColumn: `span ${span}`, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span className="sans" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.04em' }}>{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: '11px 14px', fontSize: 14, fontFamily: 'var(--serif)',
          background: 'var(--paper)', border: '1px solid var(--rule-soft)', color: 'var(--ink)', outline: 'none' }} />
    </label>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// WishlistDrawer — slides in from right; lists wishlisted books, with Add to Cart + Remove
// ────────────────────────────────────────────────────────────────────────────
export function WishlistDrawer({ onClose, onAdd, onWishToggle, onOpenBook }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    api.wishlistDetailed().then(setItems).catch(() => setItems([]));
    return () => { document.body.style.overflow = ''; };
  }, []);

  const removeOne = async (bookId) => {
    setItems(prev => prev.filter(b => b.id !== bookId));
    onWishToggle(bookId);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(28,26,20,0.7)', zIndex: 90, animation: 'fade .2s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Wishlist"
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 440, maxWidth: '100vw',
          background: 'var(--paper)', display: 'flex', flexDirection: 'column',
          boxShadow: '-20px 0 40px rgba(0,0,0,0.4)', animation: 'slide-up .22s ease-out' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--rule-soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="heart" size={20} />
          <div className="display" style={{ fontSize: 22, fontWeight: 500, flex: 1 }}>
            Your Wishlist {items && items.length > 0 && <span className="serif" style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--muted)', fontWeight: 400 }}>· {items.length} {items.length === 1 ? 'book' : 'books'}</span>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
          {items === null && <div className="serif" style={{ padding: '40px 0', textAlign: 'center', fontStyle: 'italic', color: 'var(--muted)' }}>Loading…</div>}
          {items && items.length === 0 && (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <Icon name="heart" size={36} />
              <div className="display" style={{ fontSize: 18, fontWeight: 500, marginTop: 12 }}>No saved books yet</div>
              <div className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: 6 }}>Tap the ♥ on any book to save it for later.</div>
            </div>
          )}
          {items && items.map(book => (
            <div key={book.id} style={{ display: 'flex', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--rule-soft)' }}>
              <button onClick={() => { onClose(); onOpenBook(book); }} aria-label="Open book" style={{ flexShrink: 0 }}>
                <BookCover book={book} width={60} height={84} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{book.title}</div>
                <div className="serif" style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--muted)', marginTop: 2 }}>{book.author} · {book.edition}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <span className="serif" style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>₹{book.price?.toLocaleString('en-IN')}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => onAdd(book)} className="sans" style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                      padding: '8px 12px', background: 'var(--accent)', color: 'var(--paper)' }}>
                      Add to cart
                    </button>
                    <button onClick={() => removeOne(book.id)} aria-label="Remove from wishlist"
                      className="sans" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                      padding: '8px 12px', background: 'var(--paper-2)', color: 'var(--muted)',
                      border: '1px solid var(--rule-soft)' }}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// AccountDrawer — profile summary + recent orders with status & tracking
// ────────────────────────────────────────────────────────────────────────────
export function AccountDrawer({ user, onLogout, onClose }) {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    api.orders().then(setOrders).catch(() => setOrders([]));
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const statusColor = (s) =>
    s === 'paid'      ? 'var(--success)' :
    s === 'shipped'   ? 'var(--accent)'  :
    s === 'delivered' ? 'var(--success)' :
    s === 'cancelled' ? 'var(--muted)'   : 'var(--ink-2)';

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(28,26,20,0.7)', zIndex: 90, animation: 'fade .2s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Account"
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 480, maxWidth: '100vw',
          background: 'var(--paper)', display: 'flex', flexDirection: 'column',
          boxShadow: '-20px 0 40px rgba(0,0,0,0.4)', animation: 'slide-up .22s ease-out' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--rule-soft)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Icon name="user" size={20} />
          <div style={{ flex: 1 }}>
            <div className="display" style={{ fontSize: 22, fontWeight: 500 }}>{user.name || 'My account'}</div>
            <div className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>{user.email}</div>
            {user.wallet_credit > 0 && (
              <div className="sans" style={{ display: 'inline-block', marginTop: 8, padding: '4px 10px',
                background: 'rgba(44,106,74,0.12)', color: 'var(--success)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>
                ◆ Wallet credit ₹{user.wallet_credit.toLocaleString('en-IN')}
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          <div className="eyebrow" style={{ color: 'var(--muted)', marginBottom: 12 }}>Recent orders</div>
          {orders === null && <div className="serif" style={{ padding: '20px 0', fontStyle: 'italic', color: 'var(--muted)' }}>Loading…</div>}
          {orders && orders.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Icon name="package" size={32} />
              <div className="display" style={{ fontSize: 17, fontWeight: 500, marginTop: 10 }}>No orders yet</div>
              <div className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: 6 }}>Your past orders will appear here.</div>
            </div>
          )}
          {orders && orders.map(o => (
            <div key={o.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--rule-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{o.id}</span>
                <span className="sans" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: statusColor(o.status) }}>
                  ● {o.status}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <span className="serif" style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                  {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  · {o.payment_method?.toUpperCase()}
                </span>
                <span className="serif" style={{ fontSize: 14, fontWeight: 600 }}>₹{o.total?.toLocaleString('en-IN')}</span>
              </div>
              {o.tracking_url && (
                <a href={o.tracking_url} target="_blank" rel="noreferrer" className="sans"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)' }}>
                  Track shipment →
                </a>
              )}
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--rule-soft)', padding: '14px 28px', background: 'var(--paper-2)' }}>
          <button onClick={() => { onLogout(); onClose(); }} className="sans"
            style={{ width: '100%', padding: 12, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              background: 'var(--paper)', border: '1px solid var(--rule-soft)', color: 'var(--ink)' }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

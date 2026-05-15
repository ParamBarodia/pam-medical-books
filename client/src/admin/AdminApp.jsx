// Admin SPA — mounted at /admin/*. Mobile-first, sticky bottom nav.
// Login flow: phone → OTP → cookie session.
import React, { useState, useEffect } from 'react';
import { api } from './../api.js';

// Use the same tokens as the storefront. Previously these were inline hex
// constants that drifted out of sync (PAPER was #f7efdc while --paper is
// #f4ede0). Renamed for clarity but the variable names are kept to
// minimise churn in the rest of this file.
const ACCENT = 'var(--oxblood)';
const PAPER  = 'var(--paper)';
const INK    = 'var(--ink)';
const MUTED  = 'var(--muted)';
const RULE   = 'var(--rule-soft)';
const HEADER_BG = 'var(--paper-2)';   // was hard-coded 'white' — kill pure white

export default function AdminApp() {
  const [me, setMe] = useState(undefined);   // undefined = checking, null = logged out
  const [tab, setTab] = useState('orders');

  useEffect(() => {
    api.adminMe().then(setMe).catch(() => setMe(null));
  }, []);

  if (me === undefined) return <CenterMsg>Checking session…</CenterMsg>;
  if (me === null) return <Login onSuccess={(u) => setMe(u)} />;

  return (
    <div style={{ background: PAPER, minHeight: '100vh', paddingBottom: 70 }}>
      <header style={{ background: HEADER_BG, borderBottom: `1px solid ${RULE}`, padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 700, color: INK }}>Pam Admin</div>
          <div style={{ fontSize: 11, color: MUTED }}>{me.phone}</div>
        </div>
        <button onClick={async () => { await api.adminLogout(); setMe(null); }}
          style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: MUTED,
            padding: '8px 12px', background: PAPER, border: `1px solid ${RULE}` }}>
          SIGN OUT
        </button>
      </header>

      <main style={{ padding: '16px' }}>
        {tab === 'orders' && <OrdersTab />}
        {tab === 'stock' && <StockTab />}
        {tab === 'catalog' && <CatalogTab />}
        {tab === 'requests' && <RequestsTab />}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, background: HEADER_BG,
        borderTop: `1px solid ${RULE}`, display: 'flex', zIndex: 10 }}>
        {[
          { id: 'orders', label: 'Orders' },
          { id: 'stock', label: 'Stock' },
          { id: 'catalog', label: 'Catalog' },
          { id: 'requests', label: 'Requests' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: tab === t.id ? ACCENT : MUTED,
              borderTop: tab === t.id ? `2px solid ${ACCENT}` : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Login ───────────────────────────────────────────────────────────────
function Login({ onSuccess }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    if (!/^\d{10}$/.test(phone)) { setErr('Enter your 10-digit phone'); return; }
    setErr(''); setLoading(true);
    try {
      const r = await api.adminRequestLogin(`+91${phone}`);
      setStep(2);
      if (r.mock) setErr('Mock SMS mode: check the server console for the OTP');
    } catch (e) { setErr(e.data?.error || e.message); }
    finally { setLoading(false); }
  };

  const verify = async () => {
    setErr(''); setLoading(true);
    try {
      await api.adminVerifyLogin(`+91${phone}`, code);
      const me = await api.adminMe();
      onSuccess(me);
    } catch (e) { setErr(e.data?.error || 'Invalid or expired code'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, background: HEADER_BG, padding: 32, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
        <div className="display" style={{ fontSize: 24, fontWeight: 700, color: INK, marginBottom: 4 }}>Pam Admin</div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>
          {step === 1 ? 'Enter your phone to receive a one-time code.' : `Enter the 6-digit code sent to +91 ${phone}.`}
        </div>
        {step === 1 && (
          <>
            <Input prefix="+91" value={phone}
              onChange={v => setPhone(v.replace(/\D/g, '').slice(0, 10))}
              placeholder="98765 43210" inputMode="numeric" />
            <Btn onClick={requestOtp} disabled={loading} style={{ marginTop: 12 }}>
              {loading ? '…' : 'Send code'}
            </Btn>
          </>
        )}
        {step === 2 && (
          <>
            <Input value={code}
              onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456" inputMode="numeric" />
            <Btn onClick={verify} disabled={loading || code.length !== 6} style={{ marginTop: 12 }}>
              {loading ? '…' : 'Sign in'}
            </Btn>
            <button onClick={requestOtp} disabled={loading}
              style={{ marginTop: 8, fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: '0.08em' }}>
              RESEND
            </button>
          </>
        )}
        {err && <div style={{ marginTop: 12, fontSize: 13, color: ACCENT }}>{err}</div>}
      </div>
    </div>
  );
}

// ─── Orders tab ──────────────────────────────────────────────────────────
function OrdersTab() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(null);

  const load = () => api.adminOrders(filter ? { status: filter } : {}).then(setData);
  useEffect(() => { load(); }, [filter]);

  return (
    <div>
      <H title="Orders" />
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
        {['', 'placed', 'paid', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map(s => (
          <Pill key={s} active={filter === s} onClick={() => setFilter(s)}>{s || 'All'}</Pill>
        ))}
      </div>
      {data === null && <div style={{ color: MUTED, fontSize: 13 }}>Loading…</div>}
      {data && data.orders.length === 0 && <div style={{ color: MUTED, fontSize: 13 }}>No orders.</div>}
      {data?.orders.map(o => (
        <Card key={o.id} onClick={() => setOpen(o.id)}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{o.id}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT }}>● {o.status}</span>
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>{o.customer_name || '—'} · {o.customer_phone}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 12, color: MUTED }}>
              {new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              · {o.payment_method?.toUpperCase()}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>₹{o.total?.toLocaleString('en-IN')}</span>
          </div>
        </Card>
      ))}
      {open && <OrderDetail id={open} onClose={() => { setOpen(null); load(); }} />}
    </div>
  );
}

function OrderDetail({ id, onClose }) {
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.adminOrder(id).then(setOrder); }, [id]);

  const setStatus = async (status) => {
    if (!confirm(`Set status to ${status}?`)) return;
    setBusy(true);
    try { await api.adminUpdateOrder(id, status); onClose(); }
    catch (e) { alert(e.data?.error || e.message); }
    finally { setBusy(false); }
  };

  if (!order) return null;
  const TRANSITIONS = ['paid', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];

  return (
    <Drawer onClose={onClose} title={order.id}>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>
        {order.customer_name || '—'} · {order.customer_phone}
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>
        {order.address?.line1}{order.address?.line2 ? ', ' + order.address.line2 : ''} · {order.address?.city} · {order.address?.pincode}
      </div>
      {order.items.map(it => (
        <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${RULE}` }}>
          <div style={{ fontSize: 13 }}>{it.title} <span style={{ color: MUTED }}>× {it.qty}</span></div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>₹{(it.unit_price * it.qty).toLocaleString('en-IN')}</div>
        </div>
      ))}
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
        <span style={{ fontSize: 16, fontWeight: 700 }}>₹{order.total?.toLocaleString('en-IN')}</span>
      </div>
      {order.tracking_url && (
        <a href={order.tracking_url} target="_blank" rel="noreferrer"
          style={{ display: 'block', marginTop: 12, fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: '0.1em' }}>
          OPEN CARRIER TRACKING →
        </a>
      )}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Change status</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TRANSITIONS.map(s => (
            <Btn key={s} disabled={busy || s === order.status} onClick={() => setStatus(s)}
              variant={s === order.status ? 'ghost' : 'primary'} small>{s.replace(/_/g, ' ')}</Btn>
          ))}
        </div>
      </div>
    </Drawer>
  );
}

// ─── Stock tab ───────────────────────────────────────────────────────────
function StockTab() {
  const [books, setBooks] = useState(null);
  const [q, setQ] = useState('');

  const load = () => api.adminBooks(q ? { q } : {}).then(setBooks);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);

  const adjust = async (id, delta) => {
    await api.adminUpdateStock(id, { delta });
    load();
  };
  const setExact = async (id, current) => {
    const v = window.prompt('Set stock to:', String(current));
    if (v === null) return;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) return alert('Must be a non-negative integer');
    await api.adminUpdateStock(id, { set: n });
    load();
  };

  return (
    <div>
      <H title="Stock" />
      <label htmlFor="admin-stock-search" className="sr-only">Search stock by title, ISBN, or author</label>
      <input id="admin-stock-search" value={q} onChange={e => setQ(e.target.value)}
        placeholder="Search title / ISBN / author"
        aria-label="Search stock"
        style={{ width: '100%', padding: 12, fontSize: 14, border: `1px solid ${RULE}`, marginBottom: 14, background: HEADER_BG }} />
      {books === null && <div style={{ color: MUTED, fontSize: 13 }}>Loading…</div>}
      {books?.map(b => (
        <Card key={b.id}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{b.title}</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>{b.author} · {b.edition || ''} · ₹{b.price}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Btn small variant="ghost" onClick={() => adjust(b.id, -1)}>−</Btn>
            <button onClick={() => setExact(b.id, b.stock)}
              aria-label={`Current stock for ${b.title}: ${b.stock}. Click to set an exact value.`}
              title="Click to set exact stock"
              style={{ fontSize: 18, fontWeight: 700, padding: '6px 14px', background: PAPER, border: `1px solid ${RULE}`, borderStyle: 'dashed', minWidth: 60, cursor: 'pointer' }}>
              {b.stock}
            </button>
            <Btn small variant="ghost" onClick={() => adjust(b.id, +1)}>+</Btn>
            <Btn small variant="ghost" onClick={() => adjust(b.id, +10)}>+10</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Catalog tab ─────────────────────────────────────────────────────────
function CatalogTab() {
  const [mode, setMode] = useState('isbn');
  return (
    <div>
      <H title="Catalog" />
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { id: 'isbn', label: 'Add by ISBN' },
          { id: 'manual', label: 'Manual' },
        ].map(m => (
          <Pill key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</Pill>
        ))}
      </div>
      {mode === 'isbn' && <IsbnAdd />}
      {mode === 'manual' && <ManualAdd />}
    </div>
  );
}

function IsbnAdd() {
  const [isbn, setIsbn] = useState('');
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [extra, setExtra] = useState({ price: '', mrp: '', stock: '', category: 'MBBS' });
  const [savedMsg, setSavedMsg] = useState('');

  const fetchPreview = async () => {
    setErr(''); setLoading(true); setPreview(null);
    try {
      const p = await api.adminIsbnPreview(isbn);
      setPreview(p);
    } catch (e) { setErr(e.data?.error || e.message); }
    finally { setLoading(false); }
  };

  const save = async () => {
    if (!preview) return;
    if (!extra.price || !extra.mrp || extra.stock === '') return setErr('price, mrp, stock required');
    const id = `book-${preview.isbn}`;
    try {
      await api.adminSaveBook({
        id,
        title: preview.title, author: preview.author, publisher: preview.publisher,
        pages: preview.pages, description: preview.description,
        cover_url: preview.coverUrl, isbn: preview.isbn,
        mrp: Number(extra.mrp), price: Number(extra.price), stock: Number(extra.stock),
        category: extra.category,
      });
      setSavedMsg(`Saved "${preview.title.slice(0, 40)}"`);
      setIsbn(''); setPreview(null); setExtra({ price: '', mrp: '', stock: '', category: 'MBBS' });
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e) { setErr(e.data?.error || e.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Input value={isbn} onChange={setIsbn} placeholder="9780323790185" style={{ flex: 1 }} />
        <Btn disabled={loading || !isbn} onClick={fetchPreview}>{loading ? '…' : 'Lookup'}</Btn>
      </div>
      {err && <div style={{ marginTop: 8, fontSize: 13, color: ACCENT }}>{err}</div>}
      {savedMsg && <div style={{ marginTop: 8, fontSize: 13, color: 'green' }}>{savedMsg}</div>}
      {preview && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{preview.title}</div>
          <div style={{ fontSize: 12, color: MUTED }}>{preview.author} · {preview.publisher || '—'}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>via {preview.source} · {preview.pages || '?'} pages</div>
          {preview.coverUrl && <img src={preview.coverUrl} alt={`Cover for ${preview.title}`} style={{ marginTop: 10, width: 80, height: 'auto', border: `1px solid ${RULE}` }} />}
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
            <Input label="MRP ₹" value={extra.mrp} onChange={v => setExtra(e => ({ ...e, mrp: v.replace(/\D/g, '') }))} inputMode="numeric" />
            <Input label="Price ₹" value={extra.price} onChange={v => setExtra(e => ({ ...e, price: v.replace(/\D/g, '') }))} inputMode="numeric" />
            <Input label="Stock" value={extra.stock} onChange={v => setExtra(e => ({ ...e, stock: v.replace(/\D/g, '') }))} inputMode="numeric" />
          </div>
          <div style={{ marginTop: 8 }}>
            <label htmlFor="admin-isbn-category" style={{ display: 'block', fontSize: 11, color: MUTED, marginBottom: 4 }}>Category</label>
            <select id="admin-isbn-category" value={extra.category} onChange={e => setExtra(x => ({ ...x, category: e.target.value }))}
              style={{ width: '100%', padding: 10, fontSize: 14, border: `1px solid ${RULE}`, background: HEADER_BG }}>
              {['MBBS', 'BDS', 'Nursing', 'NEET-PG', 'MD/MS', 'Faculty'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Btn onClick={save} style={{ width: '100%', marginTop: 12 }}>Save book</Btn>
        </Card>
      )}
    </div>
  );
}

function ManualAdd() {
  const [b, setB] = useState({ id: '', title: '', author: '', edition: '', mrp: '', price: '', stock: '', category: 'MBBS', isbn: '', publisher: '' });
  const [err, setErr] = useState('');
  const save = async () => {
    setErr('');
    try {
      await api.adminSaveBook({
        ...b,
        id: b.id || `book-${b.isbn || Date.now()}`,
        mrp: Number(b.mrp), price: Number(b.price), stock: Number(b.stock),
      });
      alert('Saved');
      setB({ id: '', title: '', author: '', edition: '', mrp: '', price: '', stock: '', category: 'MBBS', isbn: '', publisher: '' });
    } catch (e) { setErr(e.data?.error || e.message); }
  };
  const set = k => v => setB(prev => ({ ...prev, [k]: v }));
  return (
    <Card>
      <Input label="Title" value={b.title} onChange={set('title')} />
      <Input label="Author" value={b.author} onChange={set('author')} />
      <Input label="Edition" value={b.edition} onChange={set('edition')} />
      <Input label="ISBN" value={b.isbn} onChange={set('isbn')} />
      <Input label="Publisher" value={b.publisher} onChange={set('publisher')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
        <Input label="MRP" value={b.mrp} onChange={v => set('mrp')(v.replace(/\D/g, ''))} inputMode="numeric" />
        <Input label="Price" value={b.price} onChange={v => set('price')(v.replace(/\D/g, ''))} inputMode="numeric" />
        <Input label="Stock" value={b.stock} onChange={v => set('stock')(v.replace(/\D/g, ''))} inputMode="numeric" />
      </div>
      <label htmlFor="admin-manual-category" style={{ display: 'block', fontSize: 11, color: MUTED, marginTop: 8, marginBottom: 4 }}>Category</label>
      <select id="admin-manual-category" value={b.category} onChange={e => set('category')(e.target.value)}
        style={{ width: '100%', padding: 10, fontSize: 14, border: `1px solid ${RULE}`, background: HEADER_BG }}>
        {['MBBS', 'BDS', 'Nursing', 'NEET-PG', 'MD/MS', 'Faculty'].map(c => <option key={c}>{c}</option>)}
      </select>
      {err && <div style={{ marginTop: 8, fontSize: 13, color: ACCENT }}>{err}</div>}
      <Btn onClick={save} style={{ width: '100%', marginTop: 12 }}>Save book</Btn>
    </Card>
  );
}

// ─── Returns / cancellations queue ──────────────────────────────────────
function RequestsTab() {
  const [data, setData] = useState(null);
  const load = () => api.adminRequests().then(setData);
  useEffect(() => { load(); }, []);

  const decide = async (kind, id, decision) => {
    const note = decision === 'denied' ? window.prompt('Note for the customer (optional):') || '' : '';
    if (kind === 'return') await api.adminDecideReturn(id, decision, note);
    else await api.adminDecideCancel(id, decision, note);
    load();
  };

  if (!data) return <div style={{ color: MUTED, fontSize: 13 }}>Loading…</div>;
  const total = data.returns.length + data.cancellations.length;
  return (
    <div>
      <H title={`Requests${total ? ` (${total})` : ''}`} />
      {total === 0 && <div style={{ color: MUTED, fontSize: 13 }}>No pending requests. ✓</div>}
      {data.cancellations.map(c => (
        <Card key={'c' + c.id}>
          <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cancellation</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{c.order_id}</div>
          <div style={{ fontSize: 12, color: MUTED }}>{c.customer_name || '—'} · {c.customer_phone}</div>
          {c.reason && <div style={{ fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>"{c.reason}"</div>}
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <Btn small onClick={() => decide('cancellation', c.id, 'approved')}>Approve</Btn>
            <Btn small variant="ghost" onClick={() => decide('cancellation', c.id, 'denied')}>Deny</Btn>
          </div>
        </Card>
      ))}
      {data.returns.map(r => (
        <Card key={'r' + r.id}>
          <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Return</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{r.order_id}</div>
          <div style={{ fontSize: 12, color: MUTED }}>{r.customer_name || '—'} · {r.customer_phone}</div>
          {r.reason && <div style={{ fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>"{r.reason}"</div>}
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <Btn small onClick={() => decide('return', r.id, 'approved')}>Approve</Btn>
            <Btn small variant="ghost" onClick={() => decide('return', r.id, 'denied')}>Deny</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Primitives ──────────────────────────────────────────────────────────
function CenterMsg({ children }) {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>{children}</div>;
}
function H({ title }) { return <div className="display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 14 }}>{title}</div>; }
function Card({ children, onClick }) {
  return (
    <div onClick={onClick} style={{ background: HEADER_BG, padding: 14, marginBottom: 10, border: `1px solid ${RULE}`, cursor: onClick ? 'pointer' : 'default' }}>
      {children}
    </div>
  );
}
function Pill({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
      background: active ? ACCENT : 'white', color: active ? 'white' : INK,
      border: `1px solid ${active ? ACCENT : RULE}`, whiteSpace: 'nowrap', textTransform: 'capitalize',
    }}>{children}</button>
  );
}
function Btn({ children, onClick, disabled, variant = 'primary', small, style = {} }) {
  const isGhost = variant === 'ghost';
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '8px 14px' : '12px 18px',
      fontSize: small ? 11 : 13, fontWeight: 700, letterSpacing: '0.08em',
      background: isGhost ? 'white' : ACCENT, color: isGhost ? INK : 'white',
      border: `1px solid ${isGhost ? RULE : ACCENT}`,
      opacity: disabled ? 0.5 : 1, textTransform: 'uppercase', ...style,
    }}>{children}</button>
  );
}
function Input({ label, prefix, value, onChange, placeholder, inputMode, style = {} }) {
  return (
    <label style={{ display: 'block', marginBottom: 8, ...style }}>
      {label && <span style={{ display: 'block', fontSize: 11, color: MUTED, fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>{label}</span>}
      <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${RULE}`, background: HEADER_BG }}>
        {prefix && <span style={{ padding: '0 0 0 12px', color: MUTED, fontSize: 14 }}>{prefix}</span>}
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode}
          style={{ flex: 1, padding: '12px 12px', fontSize: 14, border: 'none', outline: 'none', background: 'transparent' }} />
      </div>
    </label>
  );
}
function Drawer({ children, onClose, title }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: HEADER_BG, width: '100%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto',
        padding: 20, borderRadius: '16px 16px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} aria-label="Close dialog"
            style={{ fontSize: 22, color: MUTED, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// /track — public order lookup by phone.
// No auth: phone is the lookup key. Each order shows status, carrier link,
// and (in-window) buttons to request return / cancellation.
import React, { useState, useEffect } from 'react';
import { api } from './api.js';
import { Footer, Icon } from './components.jsx';

const STATUS_COLORS = {
  placed:           'var(--ink-2)',
  paid:             'var(--success)',
  shipped:          'var(--accent)',
  out_for_delivery: 'var(--accent)',
  delivered:        'var(--success)',
  cancelled:        'var(--muted)',
  refunded:         'var(--muted)',
};
const STATUS_LABEL = {
  placed: 'Order placed',
  paid: 'Payment received',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export default function TrackPage() {
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [openOrder, setOpenOrder] = useState(null);

  const lookup = async () => {
    if (!/^\d{10}$/.test(phone)) { setError('Enter a 10-digit phone'); return; }
    setError(''); setLoading(true);
    try {
      const list = await api.ordersByPhone(`+91${phone}`);
      setOrders(list);
      setSubmitted(`+91${phone}`);
    } catch (e) { setError(e.message || 'Lookup failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ background: 'var(--paper-2)', minHeight: '100vh' }}>
      <header style={{ background: 'var(--paper)', borderBottom: '1px solid var(--rule-soft)', padding: '20px 32px' }}>
        <div className="ms-container" style={{ maxWidth: 1320, margin: '0 auto' }}>
          <a href="/" className="display" style={{ fontSize: 28, fontWeight: 600, color: 'var(--ink)' }}>
            Pam Medical Books<span style={{ color: 'var(--accent)' }}>.</span>
          </a>
        </div>
      </header>

      <main style={{ padding: '60px 24px 80px', maxWidth: 720, margin: '0 auto' }}>
        <div className="eyebrow" style={{ color: 'var(--accent)' }}>Track your order</div>
        <h1 className="display" style={{ fontSize: 38, fontWeight: 500, margin: '8px 0 6px' }}>Where's my order?</h1>
        <p className="serif" style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 28 }}>
          Enter the phone number you used at checkout.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span className="mono" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>+91</span>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="98765 43210"
              style={{ width: '100%', padding: '14px 14px 14px 50px', fontSize: 16,
                fontFamily: 'var(--serif)', background: 'var(--paper)',
                border: '1px solid var(--rule-soft)', outline: 'none' }} />
          </div>
          <button onClick={lookup} disabled={loading} className="sans"
            style={{ background: 'var(--accent)', color: 'var(--paper)', padding: '14px 24px',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            {loading ? '…' : 'Look up'}
          </button>
        </div>
        {error && <div className="serif" style={{ color: 'var(--accent)', fontStyle: 'italic', fontSize: 13 }}>{error}</div>}

        {orders !== null && (
          <div style={{ marginTop: 32 }}>
            {orders.length === 0 ? (
              <div style={{ background: 'var(--paper)', padding: 40, textAlign: 'center', border: '1px solid var(--rule-soft)' }}>
                <Icon name="package" size={32} />
                <div className="display" style={{ fontSize: 18, marginTop: 12 }}>No orders found</div>
                <div className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: 6 }}>
                  Make sure you typed the same phone number you used at checkout.
                </div>
              </div>
            ) : (
              <>
                <div className="eyebrow" style={{ color: 'var(--muted)', marginBottom: 12 }}>{orders.length} order{orders.length === 1 ? '' : 's'}</div>
                {orders.map(o => (
                  <div key={o.id} style={{ background: 'var(--paper)', border: '1px solid var(--rule-soft)', padding: 20, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{o.id}</span>
                      <span className="sans" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: STATUS_COLORS[o.status] || 'var(--ink-2)' }}>
                        ● {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                      <span className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                        {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        · {o.payment_method?.toUpperCase()}
                      </span>
                      <span className="serif" style={{ fontSize: 16, fontWeight: 600 }}>₹{o.total?.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {o.tracking_url && (
                        <a href={o.tracking_url} target="_blank" rel="noreferrer" className="sans"
                          style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--accent)',
                            padding: '8px 14px', border: '1px solid var(--accent)' }}>
                          Track shipment →
                        </a>
                      )}
                      <button onClick={() => setOpenOrder({ id: o.id, status: o.status })} className="sans"
                        style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', padding: '8px 14px',
                          background: 'var(--paper-2)', color: 'var(--ink-2)', border: '1px solid var(--rule-soft)' }}>
                        Order details
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </main>

      {openOrder && <OrderDetailModal orderId={openOrder.id} phone={submitted} status={openOrder.status} onClose={() => setOpenOrder(null)} />}

      <Footer />
    </div>
  );
}

function OrderDetailModal({ orderId, phone, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.orderDetail(orderId, phone).then(setData).catch(e => setError(e.message));
  }, [orderId, phone]);

  const requestReturn = async () => {
    const reason = window.prompt('Reason for return?');
    if (!reason) return;
    setBusy(true);
    try {
      await api.requestReturn(orderId, phone, reason);
      const fresh = await api.orderDetail(orderId, phone);
      setData(fresh);
    } catch (e) { alert(e.data?.error || e.message); }
    finally { setBusy(false); }
  };

  const requestCancel = async () => {
    const reason = window.prompt('Reason for cancellation?');
    if (!reason) return;
    setBusy(true);
    try {
      await api.requestCancellation(orderId, phone, reason);
      const fresh = await api.orderDetail(orderId, phone);
      setData(fresh);
    } catch (e) { alert(e.data?.error || e.message); }
    finally { setBusy(false); }
  };

  if (error) return null;
  if (!data) return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} onClick={onClose} />;

  const canCancel = ['placed', 'paid'].includes(data.status) && !data.cancellationRequest;
  const canReturn = data.status === 'delivered' && (Date.now() - data.updated_at < 7 * 86400000) && !data.returnRequest;

  return (
    <div onClick={onClose} role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,26,20,0.78)', zIndex: 100,
        overflowY: 'auto', padding: '40px 20px' }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 640, margin: '0 auto', background: 'var(--paper)',
        position: 'relative', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--rule-soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="display" style={{ fontSize: 22, fontWeight: 500, flex: 1 }}>Order {data.id}</div>
          <button onClick={onClose} aria-label="Close"
            style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div style={{ padding: '20px 28px' }}>
          <div className="eyebrow" style={{ color: 'var(--muted)', marginBottom: 8 }}>Items</div>
          {data.items.map(it => (
            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--rule-soft)' }}>
              <div className="serif" style={{ fontSize: 14 }}>{it.title} <span style={{ color: 'var(--muted)' }}>· qty {it.qty}</span></div>
              <div className="serif" style={{ fontSize: 14, fontWeight: 600 }}>₹{(it.unit_price * it.qty).toLocaleString('en-IN')}</div>
            </div>
          ))}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="sans" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total</span>
            <span className="display" style={{ fontSize: 24, fontWeight: 600 }}>₹{data.total?.toLocaleString('en-IN')}</span>
          </div>

          {data.cancellationRequest && (
            <div style={{ marginTop: 20, padding: 14, background: 'var(--paper-2)', border: '1px dashed var(--accent)' }}>
              <div className="eyebrow" style={{ color: 'var(--accent)' }}>Cancellation request</div>
              <div className="serif" style={{ fontSize: 13, marginTop: 4 }}>{data.cancellationRequest.status}</div>
            </div>
          )}
          {data.returnRequest && (
            <div style={{ marginTop: 20, padding: 14, background: 'var(--paper-2)', border: '1px dashed var(--accent)' }}>
              <div className="eyebrow" style={{ color: 'var(--accent)' }}>Return request</div>
              <div className="serif" style={{ fontSize: 13, marginTop: 4 }}>{data.returnRequest.status}</div>
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {canCancel && (
              <button disabled={busy} onClick={requestCancel} className="sans"
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '12px 18px', background: 'var(--paper-2)', color: 'var(--accent)',
                  border: '1px solid var(--accent)' }}>
                Request cancellation
              </button>
            )}
            {canReturn && (
              <button disabled={busy} onClick={requestReturn} className="sans"
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '12px 18px', background: 'var(--paper-2)', color: 'var(--accent)',
                  border: '1px solid var(--accent)' }}>
                Request return
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

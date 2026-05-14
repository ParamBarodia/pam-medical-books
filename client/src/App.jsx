// Pam Medical Books — root.
// Three top-level routes (path-based):
//   /         → main store
//   /track    → public order tracking page (phone lookup)
//   /admin/*  → admin dashboard
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { api } from './api.js';
import { SANITY_ENABLED, fetchBooksByShelf, searchBooks, fetchBundles, fetchTestimonials } from './sanity.js';
import { useCart, useFetch } from './hooks.js';
import {
  Ticker, UtilityStrip, Navbar, Hero, TrustStrip, SectionHead, CourseTiles,
  BookCard, BookGrid, Bundles, Forthcoming, SecondHand, Testimonials,
  GenuineBanner, Distributors, Footer, BookCover, Icon,
  SectionOrnament,
} from './components.jsx';
import { ProductModal, CartDrawer, CheckoutModal, NotifyModal } from './modals.jsx';

// /track and /admin are visited by < 1% of traffic — code-split so they
// don't bloat the storefront's first paint.
const TrackPage = lazy(() => import('./track.jsx'));
const AdminApp  = lazy(() => import('./admin/AdminApp.jsx'));

const RouteFallback = () => (
  <div role="status" aria-live="polite" style={{
    minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--muted)',
  }}>Loading…</div>
);

export default function App() {
  // Per-route document.title (SPA — no SSR, so we use useEffect)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/track')) document.title = 'Track your order · Pam Medical Books';
    else if (path.startsWith('/admin')) document.title = 'Admin · Pam Medical Books';
    else document.title = "Pam Medical Books · Ahmedabad's Medical Bookseller Since 2020";
  }, []);

  const path = window.location.pathname;
  if (path.startsWith('/track')) return (
    <Suspense fallback={<RouteFallback />}><TrackPage /></Suspense>
  );
  if (path.startsWith('/admin')) return (
    <Suspense fallback={<RouteFallback />}><AdminApp /></Suspense>
  );
  return <Storefront />;
}

function Storefront() {
  // showToast is defined below; thread it into useCart via a ref so the hook
  // can fire feedback when the per-item cap (50) is hit.
  const onCapRef = React.useRef();
  const cart = useCart({ onCap: (item) => onCapRef.current?.(item) });

  const fetchShelf = (shelf) => SANITY_ENABLED ? fetchBooksByShelf(shelf) : api.books({ shelf });
  const featured     = useFetch(() => fetchShelf('featured'), []);
  const newArrivals  = useFetch(() => fetchShelf('new'), []);
  const forthcoming  = useFetch(() => fetchShelf('forthcoming'), []);
  const secondhand   = useFetch(() => fetchShelf('secondhand'), []);
  const bundles      = useFetch(() => SANITY_ENABLED ? fetchBundles() : api.bundles(), []);
  const testimonials = useFetch(() => SANITY_ENABLED ? fetchTestimonials() : api.testimonials(), []);

  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [productOpen, setProductOpen] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [notifyBook, setNotifyBook] = useState(null);
  const [toast, setToast] = useState(null);

  React.useEffect(() => {
    const id = setTimeout(() => setSubmittedQuery(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  const isFiltering = submittedQuery.trim().length > 0 || activeCategory !== 'All';
  const search = useFetch(
    () => {
      if (!isFiltering) return Promise.resolve([]);
      return SANITY_ENABLED
        ? searchBooks({ q: submittedQuery, category: activeCategory })
        : api.books({ q: submittedQuery, ...(activeCategory !== 'All' ? { category: activeCategory } : {}) });
    },
    [submittedQuery, activeCategory, isFiltering],
  );

  const showToast = (text, accent = 'amber') => {
    setToast({ text, accent, id: Date.now() });
    setTimeout(() => setToast(null), 2400);
  };
  onCapRef.current = (item) => showToast(`Max 50 per item — "${(item.title || '').slice(0, 30)}…" stays at 50`, 'amber');

  const handleAdd = (book) => {
    cart.add(book);
    showToast(`Added "${book.title.slice(0, 32)}…"`);
  };
  const handleAddBundle = (bundle) => {
    cart.add({ ...bundle, isBundle: true });
    showToast(`Bundle added · You saved ₹${bundle.saved.toLocaleString('en-IN')}`, 'teal');
  };
  const handleCheckout = () => {
    if (!cart.items.length) return;
    setCartOpen(false); setCheckoutOpen(true);
  };
  const handleOrderComplete = (orderId) => {
    cart.clear();
    setCheckoutOpen(false);
    // Archive-coded confirmation rather than a generic "placed" toast —
    // the order id is the user's archive reference for the dispatch.
    showToast(`Recorded · ${orderId} · we'll dispatch within 2 working days`, 'teal');
  };
  const clearFilters = () => { setQuery(''); setSubmittedQuery(''); setActiveCategory('All'); };

  return (
    <>
      <UtilityStrip />
      <Ticker />
      <Navbar
        cartCount={cart.items.length}
        query={query} setQuery={setQuery}
        activeCategory={activeCategory} setActiveCategory={setActiveCategory}
        onOpenCart={() => setCartOpen(true)}
      />

      <main id="main">
        {isFiltering ? (
          <SearchResults
            books={search.data || []}
            loading={search.loading}
            query={submittedQuery}
            category={activeCategory}
            onClear={clearFilters}
            onAdd={handleAdd}
            onOpen={setProductOpen}
          />
        ) : (
          <>
            <Hero books={featured.data?.slice(0, 5) || []} onAdd={handleAdd} onOpen={setProductOpen} />
            <TrustStrip />
            <BookGrid
              eyebrow="New Arrivals · 2026" title="Fresh from the printers."
              marginNote="Chapter I — what's just landed at the warehouse"
              books={newArrivals.data} loading={newArrivals.loading}
              density={5}
              onAdd={handleAdd} onOpen={setProductOpen}
            />
            <SectionOrnament variant="chapter" />
            <CourseTiles onSelectCategory={setActiveCategory} />
            <SectionOrnament variant="leaf" />
            <BookGrid
              eyebrow="Bestsellers · This Semester" title="What everyone's reading right now."
              marginNote="Chapter II — the books they all need by November"
              books={featured.data} loading={featured.loading}
              density={5}
              onAdd={handleAdd} onOpen={setProductOpen}
            />
            <SectionOrnament variant="part" />
            <Bundles bundles={bundles.data} onAdd={handleAddBundle} />
            <Forthcoming books={forthcoming.data} onOpen={setProductOpen}
              onNotify={(b) => setNotifyBook(b)} />
            <SectionOrnament variant="rule" />
            <SecondHand books={secondhand.data} onAdd={handleAdd} onOpen={setProductOpen} />
            <GenuineBanner />
            <Testimonials testimonials={testimonials.data} />
            <Distributors />
          </>
        )}
      </main>

      <Footer />

      {productOpen && (
        <ProductModal
          book={productOpen}
          onClose={() => setProductOpen(null)}
          onAdd={() => handleAdd(productOpen)}
          onNotify={(b) => { setProductOpen(null); setNotifyBook(b); }}
        />
      )}
      {cartOpen && (
        <CartDrawer
          items={cart.items}
          onUpdateQty={(id, delta, isBundle) => cart.updateQty(id, delta, isBundle)}
          onClose={() => setCartOpen(false)}
          onCheckout={handleCheckout}
        />
      )}
      {checkoutOpen && (
        <CheckoutModal
          items={cart.items}
          onClose={() => setCheckoutOpen(false)}
          onComplete={handleOrderComplete}
        />
      )}
      {notifyBook && (
        <NotifyModal
          book={notifyBook}
          onClose={() => setNotifyBook(null)}
          onSubmit={(phone) => {
            api.notifyWhenBack(notifyBook.id, phone).catch(() => {});
            showToast(`We'll text you when "${notifyBook.title.slice(0, 26)}…" arrives`, 'teal');
            setNotifyBook(null);
          }}
        />
      )}
      {toast && <Toast key={toast.id} text={toast.text} accent={toast.accent}
        liftAbove={cartOpen}
        onDismiss={() => setToast(null)} />}
    </>
  );
}

function SearchResults({ books, loading, query, category, onClear, onAdd, onOpen }) {
  return (
    <section style={{ padding: '40px 32px 80px' }}>
      <div className="ms-container" style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <div className="eyebrow" style={{ color: 'var(--accent)' }}>Search results</div>
          <button onClick={onClear} className="sans"
            style={{ fontSize: 12, color: 'var(--ink-2)', padding: '4px 10px',
              background: 'var(--paper-2)', border: '1px solid var(--rule-soft)' }}>
            ✕ Clear
          </button>
        </div>
        <h2 className="display" style={{ fontSize: 32, fontWeight: 500, margin: '0 0 6px' }}>
          {query ? <>Results for "<span style={{ color: 'var(--accent)' }}>{query}</span>"</> : `${category} books`}
        </h2>
        <div className="serif" style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 32 }}>
          {loading ? 'Searching…' : `${books.length} ${books.length === 1 ? 'book' : 'books'} found`}
        </div>
        {!loading && books.length === 0 ? (
          <div style={{
            background: 'var(--paper)', border: '1px dashed var(--rule-soft)',
            padding: '56px 24px', textAlign: 'center',
          }}>
            <div className="display" style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>
              Nothing found in this shelf.
            </div>
            <p className="serif" style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', margin: '0 0 18px' }}>
              {query ? <>No books match "<strong style={{ color: 'var(--ink)', fontStyle: 'normal' }}>{query}</strong>"{category !== 'All' && <> in <strong style={{ color: 'var(--ink)', fontStyle: 'normal' }}>{category}</strong></>}.</> : <>No {category} books on the shelf yet.</>}
              {' '}Try a different spelling, ISBN, or clear the filters.
            </p>
            <button onClick={onClear} className="ms-btn ms-btn-ghost" style={{ padding: '10px 22px', fontSize: 13 }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="ms-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
            {books.map(b => (
              <BookCard key={b.id} book={b}
                onAdd={() => onAdd(b)} onOpen={() => onOpen(b)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Toast({ text, accent, onDismiss, liftAbove }) {
  const color = accent === 'teal' ? 'var(--accent)' : 'var(--saffron)';
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && onDismiss) onDismiss(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDismiss]);
  return (
    <div className="toast-enter ms-toast" role="status" aria-live="polite"
      onClick={onDismiss}
      title="Dismiss"
      style={{
      position: 'fixed', bottom: liftAbove ? 96 : 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--ink)', color: 'var(--paper)', zIndex: 100,
      padding: '12px 18px', border: `1px solid ${color}`,
      boxShadow: '0 16px 40px -10px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500,
      maxWidth: 'min(420px, calc(100vw - 32px))', fontFamily: 'var(--serif)',
      cursor: 'pointer',
    }}>
      <span style={{ color, fontSize: 14, flexShrink: 0 }}>◆</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{text}</span>
    </div>
  );
}

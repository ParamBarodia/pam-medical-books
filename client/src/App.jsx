// MedShelf — full-stack frontend.
// All product/cart/auth/order data flows through the Express API at /api (Vite proxies to :4000).
import React, { useState } from 'react';
import { api } from './api.js';
import { SANITY_ENABLED, fetchBooksByShelf, searchBooks, fetchBundles, fetchTestimonials } from './sanity.js';
import { useAuth, useCart, useWishlist, useFetch } from './hooks.js';
import {
  Ticker, UtilityStrip, Navbar, Hero, TrustStrip, SectionHead, CourseTiles,
  BookCard, BookGrid, Bundles, Forthcoming, SecondHand, Testimonials,
  GenuineBanner, Distributors, Footer, BookCover, Icon,
  SectionOrnament,
} from './components.jsx';
import { ProductModal, AuthModal, CartDrawer, CheckoutModal } from './modals.jsx';

export default function App() {
  // ── Server-backed state ──────────────────────────────────────────────────
  const auth = useAuth();
  const cart = useCart(auth.user);
  const wish = useWishlist(auth.user);

  // Dual-mode: Sanity if VITE_SANITY_PROJECT_ID is set, else local Express API
  const fetchShelf = (shelf) => SANITY_ENABLED ? fetchBooksByShelf(shelf) : api.books({ shelf });
  const featured     = useFetch(() => fetchShelf('featured'), []);
  const newArrivals  = useFetch(() => fetchShelf('new'), []);
  const forthcoming  = useFetch(() => fetchShelf('forthcoming'), []);
  const secondhand   = useFetch(() => fetchShelf('secondhand'), []);
  const bundles      = useFetch(() => SANITY_ENABLED ? fetchBundles() : api.bundles(), []);
  const testimonials = useFetch(() => SANITY_ENABLED ? fetchTestimonials() : api.testimonials(), []);

  // ── Local UI state ───────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [productOpen, setProductOpen] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Live-search debounce
  React.useEffect(() => {
    const id = setTimeout(() => setSubmittedQuery(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  // Fetch search results when query/category changes
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

  const handleAdd = (book) => {
    if (!auth.user) {
      // Allow guest adds via localStorage; surface gentle hint
      cart.add(book);
      showToast(`Added "${book.title.slice(0, 32)}…". Sign in to save your cart.`);
      return;
    }
    cart.add(book);
    showToast(`Added "${book.title.slice(0, 32)}…"`);
  };

  const handleAddBundle = (bundle) => {
    cart.add({ ...bundle, isBundle: true });
    showToast(`Bundle added · You saved ₹${bundle.saved.toLocaleString('en-IN')}`, 'teal');
  };

  const handleToggleWish = (bookId) => {
    if (!auth.user) { setAuthOpen(true); return; }
    wish.toggle(bookId);
  };

  const handleCheckout = () => {
    if (!auth.user) { setCartOpen(false); setAuthOpen(true); return; }
    if (!cart.items.length) return;
    setCartOpen(false); setCheckoutOpen(true);
  };

  const handleOrderComplete = (orderId) => {
    cart.clear();
    setCheckoutOpen(false);
    showToast(`Order ${orderId} placed!`, 'teal');
  };

  const clearFilters = () => { setQuery(''); setSubmittedQuery(''); setActiveCategory('All'); };

  return (
    <>
      <UtilityStrip user={auth.user} onSignIn={() => setAuthOpen(true)} onLogout={auth.logout} />
      <Ticker />
      <Navbar
        user={auth.user}
        cartCount={cart.items.length}
        wishCount={wish.ids.size}
        query={query} setQuery={setQuery}
        activeCategory={activeCategory} setActiveCategory={setActiveCategory}
        onOpenCart={() => setCartOpen(true)}
        onSignIn={() => setAuthOpen(true)}
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
            onWish={handleToggleWish}
            onOpen={setProductOpen}
            wished={wish}
          />
        ) : (
          <>
            <Hero featuredBook={featured.data?.[1] || featured.data?.[0]} />
            <TrustStrip />
            <BookGrid
              eyebrow="New Arrivals · 2026" title="Fresh from the printers."
              marginNote="Chapter I — what's just landed at the warehouse"
              books={newArrivals.data} loading={newArrivals.loading}
              density={5}
              onAdd={handleAdd} onWish={handleToggleWish} onOpen={setProductOpen} wished={wish}
            />
            <SectionOrnament />
            <CourseTiles />
            <SectionOrnament />
            <BookGrid
              eyebrow="Bestsellers · This Semester" title="What everyone's reading right now."
              marginNote="Chapter II — the books they all need by November"
              books={featured.data} loading={featured.loading}
              density={5}
              onAdd={handleAdd} onWish={handleToggleWish} onOpen={setProductOpen} wished={wish}
            />
            <SectionOrnament />
            <Bundles bundles={bundles.data} onAdd={handleAddBundle} />
            <Forthcoming books={forthcoming.data} onOpen={setProductOpen}
              onNotify={(b) => { api.notify(b.id, auth.user?.email).catch(() => {}); showToast(`We'll email you when "${b.title.slice(0, 26)}…" arrives`, 'teal'); }} />
            <SectionOrnament />
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
          wished={wish.has(productOpen.id)}
          onClose={() => setProductOpen(null)}
          onAdd={() => handleAdd(productOpen)}
          onWish={() => handleToggleWish(productOpen.id)}
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
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSignedIn={() => setAuthOpen(false)}
          login={auth.login} signup={auth.signup}
        />
      )}
      {checkoutOpen && (
        <CheckoutModal
          items={cart.items}
          user={auth.user}
          onClose={() => setCheckoutOpen(false)}
          onComplete={handleOrderComplete}
        />
      )}
      {toast && <Toast key={toast.id} text={toast.text} accent={toast.accent} />}
    </>
  );
}

// ─── Search results view (filter sidebar elided for brevity in this baseline) ─
function SearchResults({ books, loading, query, category, onClear, onAdd, onWish, onOpen, wished }) {
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
        <div className="ms-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
          {books.map(b => (
            <BookCard key={b.id} book={b}
              onAdd={() => onAdd(b)} onWish={() => onWish(b.id)} onOpen={() => onOpen(b)}
              wished={wished.has(b.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Toast({ text, accent }) {
  const color = accent === 'teal' ? 'var(--accent)' : 'var(--saffron)';
  return (
    <div className="toast-enter ms-toast" role="status" aria-live="polite" style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--ink)', color: 'var(--paper)', zIndex: 100,
      padding: '12px 18px', border: `1px solid ${color}`,
      boxShadow: '0 16px 40px -10px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500,
      maxWidth: 'calc(100vw - 32px)', fontFamily: 'var(--serif)',
    }}>
      <span style={{ color, fontSize: 14 }}>◆</span> {text}
    </div>
  );
}

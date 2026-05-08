// MedShelf shared visual components — all paper-warm + Indian retail design.
// Pure presentation; data comes from props. State (cart/wishlist/auth) lives in App.
import React, { useEffect, useRef, useState } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// Differentiation hooks & primitives
// ────────────────────────────────────────────────────────────────────────────

/** Trigger a fade-up reveal when an element scrolls into view. */
export function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    el.classList.add('ms-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Page-flourish ornament between sections — like a chapter break in a printed book. */
export function SectionOrnament({ color = 'var(--rule-soft)' }) {
  return (
    <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', padding: '32px 0', background: 'var(--paper)' }}>
      <svg width="120" height="22" viewBox="0 0 240 44" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round">
        {/* Center diamond */}
        <path d="M120 12 L130 22 L120 32 L110 22 Z" fill={color} fillOpacity="0.6" />
        {/* Left flourish */}
        <path d="M0 22 L100 22" />
        <path d="M84 22 C 90 18, 96 22, 102 22" fill="none" />
        <circle cx="92" cy="22" r="1.6" fill={color} />
        {/* Right flourish */}
        <path d="M140 22 L240 22" />
        <path d="M138 22 C 144 26, 150 22, 156 22" fill="none" />
        <circle cx="148" cy="22" r="1.6" fill={color} />
      </svg>
    </div>
  );
}

/** A rotated, hand-stamped oxblood seal — used on the Bestseller spotlight. */
export function StampSeal({ children, rotate = -12, size = 110 }) {
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, position: 'relative',
      transform: `rotate(${rotate}deg)`,
      filter: 'contrast(1.1) saturate(0.95)',
    }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <filter id="stamp-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
        {/* Outer + inner rings */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="var(--accent)" strokeWidth="0.6" strokeDasharray="2 2" />
        {/* Curved arc text top */}
        <path id="stamp-arc-top" d="M 50 14 a 36 36 0 0 1 0 72 a 36 36 0 0 1 0 -72" fill="none" />
        <text fill="var(--accent)" fontFamily="var(--sans)" fontSize="5" letterSpacing="3" fontWeight="700">
          <textPath href="#stamp-arc-top" startOffset="6%">VERIFIED · MEDSHELF · 2026 ·</textPath>
        </text>
        {/* Center label */}
        <foreignObject x="20" y="35" width="60" height="30">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 14,
            color: 'var(--accent)', textAlign: 'center', lineHeight: 1.05,
            letterSpacing: '-0.01em', fontStyle: 'italic',
          }}>{children}</div>
        </foreignObject>
        {/* Faux ink imperfections */}
        <rect x="0" y="0" width="100" height="100" fill="var(--accent)" filter="url(#stamp-grain)" opacity="0.12" />
      </svg>
    </div>
  );
}

/** Editor's margin note — italic serif aside in oxblood, runs vertically along the gutter. */
export function MarginNote({ children, side = 'left' }) {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', [side]: -50, top: '50%',
      transform: `translateY(-50%) rotate(${side === 'left' ? -90 : 90}deg)`,
      transformOrigin: side === 'left' ? 'left center' : 'right center',
      fontFamily: 'var(--serif)', fontStyle: 'italic',
      fontSize: 11, color: 'var(--muted)',
      letterSpacing: '0.04em', whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}>
      <span style={{ color: 'var(--accent)', marginRight: 8 }}>§</span>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Icon — stroke SVG icons with consistent sizing
// ────────────────────────────────────────────────────────────────────────────
export function Icon({ name, size = 20, stroke = 1.6, ...rest }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round', ...rest };
  switch (name) {
    case 'search':       return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'user':         return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>;
    case 'heart':        return <svg {...props}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/></svg>;
    case 'heart-fill':   return <svg {...props} fill="currentColor" stroke="none"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/></svg>;
    case 'cart':         return <svg {...props}><path d="M3 4h2l2.5 11.5a2 2 0 0 0 2 1.5h7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>;
    case 'arrow-right':  return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'arrow-left':   return <svg {...props}><path d="M19 12H5M11 5l-7 7 7 7"/></svg>;
    case 'check':        return <svg {...props}><path d="m4 12 5 5L20 6"/></svg>;
    case 'check-circle': return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>;
    case 'truck':        return <svg {...props}><path d="M3 16V6h11v10M14 9h4l3 4v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>;
    case 'rotate':       return <svg {...props}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 4v4h-4"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 20v-4h4"/></svg>;
    case 'wallet':       return <svg {...props}><path d="M3 7a2 2 0 0 1 2-2h13v4H5a2 2 0 0 1-2-2Z"/><path d="M3 7v10a2 2 0 0 0 2 2h15v-5"/><circle cx="17" cy="14" r="1.2" fill="currentColor"/></svg>;
    case 'shield':       return <svg {...props}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'plus':         return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'minus':        return <svg {...props}><path d="M5 12h14"/></svg>;
    case 'close':        return <svg {...props}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case 'lock':         return <svg {...props}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
    case 'sparkles':     return <svg {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>;
    case 'phone':        return <svg {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>;
    case 'package':      return <svg {...props}><path d="M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    case 'pin':          return <svg {...props}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
    case 'mail':         return <svg {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
    default: return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// BookCover — real Sanity image when available, procedural fallback otherwise
// ────────────────────────────────────────────────────────────────────────────
export function BookCover({ book, width = 138, height = 196 }) {
  // 1. Real cover from Sanity CDN — preferred
  const realImageUrl = book?.imageUrl || book?.fallbackUrl;
  if (realImageUrl) {
    return (
      <img
        src={realImageUrl}
        alt={`${book.title} cover`}
        loading="lazy"
        width={width}
        height={height}
        style={{
          width, height, objectFit: 'cover',
          background: book?.blurHash ? `url(${book.blurHash})` : 'var(--paper-3)',
          backgroundSize: 'cover',
          boxShadow: '0 14px 26px -10px rgba(0,0,0,0.45), 0 6px 14px -8px rgba(0,0,0,0.5)',
        }}
      />
    );
  }
  // 2. Procedural placeholder — used when no real cover exists
  if (!book?.cover) return <div style={{ width, height, background: 'var(--paper-3)' }} />;
  const { bg, accent } = book.cover;
  return (
    <div style={{
      width, height, background: bg, color: accent || '#f7efdc',
      position: 'relative', overflow: 'hidden',
      boxShadow: 'inset 6px 0 0 rgba(0,0,0,0.18), 0 14px 26px -10px rgba(0,0,0,0.45), 0 6px 14px -8px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '14px 12px 12px 18px',
    }}>
      <div>
        <div className="sans" style={{ fontSize: 8.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, opacity: 0.85, marginBottom: 8 }}>
          {book.publisher || 'Medical Press'}
        </div>
        <div className="serif" style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.01em', textShadow: '0 1px 0 rgba(0,0,0,0.25)' }}>
          {book.title}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: '42%', height: '14%', background: `${accent}22`, borderTop: `1px solid ${accent}40`, borderBottom: `1px solid ${accent}40` }} />
      <div>
        <div className="sans" style={{ fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.75 }}>{book.author}</div>
        <div className="mono" style={{ color: accent, marginTop: 3, fontSize: 8, opacity: 0.8 }}>{book.edition}</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Layout chrome
// ────────────────────────────────────────────────────────────────────────────
export function UtilityStrip({ user, onSignIn, onLogout }) {
  return (
    <div className="ms-utility-strip" style={{
      background: 'var(--paper-2)', color: 'var(--muted)',
      fontSize: 11, fontFamily: 'var(--sans)',
      padding: '8px 0', borderBottom: '1px solid var(--rule-soft)',
    }}>
      <div className="ms-container" style={{ maxWidth: 1320, margin: '0 auto', padding: '0 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <a href="tel:07926578901" style={{ color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="phone" size={12} stroke={2} aria-hidden="true" /> +91 79 2657 8901
          </a>
          <span>Mon–Sat · 10:30 AM – 7 PM · Ellis Bridge, Ahmedabad</span>
          <span className="serif" style={{ color: 'var(--accent)', fontWeight: 600, fontStyle: 'italic', fontSize: 12 }}>
            Helping medical students serve humanity.
          </span>
        </div>
        <div className="ms-utility-strip-right" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <a href="https://wa.me/919912817189" style={{ color: '#1f7a3a' }}>WhatsApp +91 99128 17189</a>
          <span>Track Order</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Refer & Earn ₹200</span>
          {user
            ? <span><strong>{user.name}</strong> · <button onClick={onLogout} style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign out</button></span>
            : <button onClick={onSignIn} style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</button>}
        </div>
      </div>
    </div>
  );
}

export function Ticker() {
  const items = [
    'Flat ₹100 OFF on orders ₹5,000+', 'Flat ₹200 OFF on orders ₹10,000+',
    'Free shipping above ₹999', 'Same-day dispatch from Ahmedabad',
    '100% Original — money back otherwise', 'COD available · 21,000 PIN codes',
    'Refer a classmate · Get ₹200 credit',
  ];
  const all = [...items, ...items, ...items];
  return (
    <div role="region" aria-label="Current offers" style={{
      background: 'var(--ink)', color: 'var(--paper)', overflow: 'hidden',
      borderBottom: '2px solid var(--accent)', position: 'relative',
    }}>
      <div style={{ display: 'flex', whiteSpace: 'nowrap', padding: '10px 0',
        animation: 'ms-marquee 60s linear infinite', fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.04em', fontWeight: 500 }}>
        {all.map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 32, paddingRight: 32 }}>
            <span style={{ color: 'var(--saffron)' }}>◆</span><span>{t}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const CATEGORIES = ['MBBS', 'BDS', 'Nursing', 'NEET-PG', 'MD/MS', 'Faculty'];

export function Navbar({ user, cartCount = 0, wishCount = 0, query, setQuery, activeCategory, setActiveCategory, onOpenCart, onSignIn, onOpenWishlist, onOpenAccount }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--paper)', borderBottom: '1px solid var(--rule-soft)' }}>
      <div className="ms-container ms-navbar-row" style={{ maxWidth: 1320, margin: '0 auto', padding: '20px 32px',
        display: 'flex', alignItems: 'center', gap: 32 }}>
        <a href="#" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, flexShrink: 0 }}>
          <span className="display" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
            Pam Medical Books<span style={{ color: 'var(--accent)' }}>.</span>
          </span>
          <span className="serif" style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>
            Ahmedabad's medical bookseller since 2020
          </span>
        </a>
        <div className="ms-navbar-search" style={{ flex: 1, minWidth: 0, display: 'flex' }}>
          <SearchBar query={query} setQuery={setQuery} />
        </div>
        <div className="ms-navbar-icons" style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <NavIcon icon="user"  label="Account"  onClick={user ? onOpenAccount : onSignIn} />
          <NavIcon icon="heart" label="Wishlist" badge={wishCount} onClick={user ? onOpenWishlist : onSignIn} />
          <NavIcon icon="cart"  label="Cart"     badge={cartCount} highlight onClick={onOpenCart} />
        </div>
      </div>
      <nav aria-label="Categories" style={{ background: 'var(--accent)', color: 'var(--paper)' }}>
        <div className="ms-container" style={{ maxWidth: 1320, margin: '0 auto', padding: '0 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', overflowX: 'auto' }} className="no-scrollbar">
            <CatBtn label="All" active={activeCategory === 'All'} onClick={() => setActiveCategory('All')} first />
            {CATEGORIES.map(c => (
              <CatBtn key={c} label={c} active={activeCategory === c} onClick={() => setActiveCategory(c)} />
            ))}
          </div>
          <div className="ms-utility-strip-right sans" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="package" size={14} aria-hidden="true" /> Free Shipping ₹499+
          </div>
        </div>
      </nav>
    </header>
  );
}

function SearchBar({ query, setQuery }) {
  const [focused, setFocused] = useState(false);
  return (
    <form onSubmit={e => e.preventDefault()} style={{
      flex: 1, maxWidth: 720, position: 'relative',
      background: 'var(--paper-2)',
      border: focused ? '1px solid var(--accent)' : '1px solid var(--rule-soft)',
      boxShadow: focused ? '0 0 0 3px rgba(139,42,31,0.15)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 2px 0 18px', height: 48 }}>
        <span className="serif" aria-hidden="true" style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--muted)', marginRight: 8 }}>"</span>
        <input
          type="text" value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder="Search 25,000 medical books — by title, author, or ISBN"
          aria-label="Search books"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent',
            padding: '0 10px', fontSize: 15, fontFamily: 'var(--serif)', color: 'var(--ink)' }}
        />
        <button type="submit" className="ms-btn-search">Search</button>
      </div>
    </form>
  );
}

function NavIcon({ icon, label, badge, highlight, onClick }) {
  return (
    <button onClick={onClick} aria-label={label}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '6px 12px', minWidth: 44, minHeight: 44,
        color: highlight ? 'var(--accent)' : 'var(--ink-2)', position: 'relative' }}>
      <span style={{ position: 'relative' }}>
        <Icon name={icon} size={20} />
        {badge > 0 && (
          <span aria-hidden="true" style={{ position: 'absolute', top: -6, right: -8,
            background: 'var(--accent)', color: 'var(--paper)', fontSize: 10, fontWeight: 700,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--paper)' }}>{badge}</span>
        )}
      </span>
      <span style={{ fontSize: 11, fontFamily: 'var(--sans)' }}>{label}</span>
    </button>
  );
}

function CatBtn({ label, active, onClick, first }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="sans"
      style={{ padding: '14px 18px', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em',
        whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.12)',
        borderLeft: first ? '1px solid rgba(255,255,255,0.12)' : 'none',
        background: active || hover ? 'rgba(0,0,0,0.18)' : 'transparent',
        color: 'var(--paper)', transition: 'background .15s' }}>
      {label}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Hero — A · Bazaar Edition: "New Release 2026" promo banner with offset
// color blocks, white card overlay, slide dots, quick-pills row below.
// ────────────────────────────────────────────────────────────────────────────
export function Hero({ featuredBook }) {
  // Use a real featured book if provided; else fall back to placeholder shape
  const b = featuredBook || {
    title: 'Robbins & Kumar Basic Pathology',
    author: 'Vinay Kumar', edition: '11th Ed',
    mrp: 2295, price: 1799,
    cover: { bg: '#7a1e2b', accent: '#f0d8a0', style: 'medical' },
  };
  const off = Math.round((1 - b.price / b.mrp) * 100);

  return (
    <section style={{ background: 'var(--paper)', borderBottom: '1px solid var(--rule)', padding: '24px 32px' }}>
      <div className="ms-container" style={{ maxWidth: 1320, margin: '0 auto' }}>
        {/* The promo banner */}
        <div className="ms-hero-banner" style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(115deg, #1a4a52 0%, #2c6470 60%, #1a4a52 100%)',
          color: 'var(--paper)', padding: '56px 64px', minHeight: 380,
          display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, alignItems: 'center',
        }}>
          {/* Offset color blocks for depth */}
          <div aria-hidden="true" style={{
            position: 'absolute', left: '42%', top: '10%', width: 240, height: 200,
            background: 'var(--saffron)', opacity: 0.7,
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute', left: '50%', top: '45%', width: 200, height: 180,
            background: 'var(--accent)', opacity: 0.4,
          }} />

          {/* White card overlay with featured book details */}
          <div style={{
            position: 'relative', background: 'var(--paper)', color: 'var(--ink)',
            padding: '40px 48px', maxWidth: 520,
          }}>
            <div className="eyebrow" style={{ color: 'var(--accent)', letterSpacing: '0.32em' }}>New Release · 2026</div>
            <h1 className="display ms-hero-h1" style={{
              fontWeight: 500, fontSize: 'clamp(28px, 3.5vw, 44px)',
              letterSpacing: '-0.02em', lineHeight: 1.05, marginTop: 14, color: 'var(--ink)',
            }}>{b.title}</h1>
            {b.subtitle && (
              <div className="serif" style={{ fontStyle: 'italic', fontSize: 16, color: 'var(--muted)', marginTop: 8 }}>{b.subtitle}</div>
            )}
            <div style={{ height: 1, background: 'var(--accent)', opacity: 0.5, margin: '18px 0', width: 90 }} />
            <div className="serif" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
              By {b.author} · {b.edition}
            </div>
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="serif" style={{ fontWeight: 600, fontSize: 22, color: 'var(--accent)' }}>
                  ₹{b.price.toLocaleString('en-IN')}
                </span>
                <span className="mono" style={{ fontSize: 14, color: 'var(--muted)', textDecoration: 'line-through' }}>
                  ₹{b.mrp.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="sans" style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', letterSpacing: '0.04em' }}>
                You save ₹{(b.mrp - b.price).toLocaleString('en-IN')} ({off}%)
              </span>
            </div>
            <button className="ms-btn ms-btn-ink" style={{ marginTop: 20, padding: '14px 28px' }}>
              Buy Now <span className="ms-arrow">→</span>
            </button>
          </div>

          {/* Featured book cover, tilted, with stamped seal */}
          <div className="ms-hero-cover" style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div style={{ transform: 'rotate(2deg)', position: 'relative' }}>
              <BookCover book={b} width={220} height={310} />
              {/* Hand-stamped seal — overlaps the cover, rotated, looks like a librarian's stamp */}
              <div style={{ position: 'absolute', bottom: -18, right: -34, zIndex: 5 }}>
                <StampSeal rotate={-14}>1st<br/>Edition</StampSeal>
              </div>
            </div>
          </div>

          {/* Slide dots */}
          <div aria-hidden="true" style={{
            position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 6,
          }}>
            {[0,1,2,3,4].map((i) => (
              <span key={i} style={{
                width: i === 0 ? 22 : 7, height: 7, borderRadius: 4,
                background: i === 0 ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
              }} />
            ))}
          </div>
        </div>

        {/* Quick action pills below banner */}
        <div className="ms-quick-pills" style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 18,
        }}>
          {['Publishers', 'Used Books', "Can't find a book?", 'Bulk orders', 'International shipping'].map((p, i) => (
            <button key={i} className="ms-btn-pill">{p}</button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustStrip() {
  const items = [
    { icon: 'truck',  title: 'Quick Dispatch',   sub: 'Within 2 working days' },
    { icon: 'shield', title: '100% Original',    sub: 'Authorised reseller' },
    { icon: 'wallet', title: 'Cash on Delivery', sub: '21,000 PIN codes' },
    { icon: 'rotate', title: 'Easy Returns',     sub: '7-day no-questions' },
  ];
  return (
    <section style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--rule-soft)' }}>
      <div className="ms-container ms-trustbar-grid" style={{ maxWidth: 1320, margin: '0 auto', padding: '28px 32px',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
        {items.map((it, i) => (
          <div key={i} className="ms-trustbar-item" style={{ display: 'flex', alignItems: 'center', gap: 14,
            padding: '8px 24px', borderLeft: i > 0 ? '1px solid var(--rule-soft)' : 'none' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: 'var(--paper)', border: '1px solid var(--rule-soft)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={it.icon} size={20} />
            </div>
            <div>
              <div className="serif" style={{ fontSize: 15, fontWeight: 600 }}>{it.title}</div>
              <div className="serif" style={{ fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>{it.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CourseTiles — Medioks-style color-tinted faculty tiles
// ────────────────────────────────────────────────────────────────────────────
const COURSE_TINTS = [
  { name: 'MBBS',     sub: '1st – Final year',         tint: '#fde6d8', hue: '#a85328' },
  { name: 'BDS',      sub: 'Dental sciences',          tint: '#dceee2', hue: '#1f6a4a' },
  { name: 'Nursing',  sub: 'GNM · B.Sc · M.Sc',        tint: '#e7e0f3', hue: '#5a4793' },
  { name: 'NEET-PG',  sub: 'Final sprint, all 19 subjects', tint: '#fdecd1', hue: '#9c6a17' },
  { name: 'MD/MS',    sub: 'Speciality references',    tint: '#dde7f3', hue: '#2c5689' },
  { name: 'Faculty',  sub: 'Reference & teaching',     tint: '#ede2d5', hue: '#7a5028' },
];

export function CourseTiles() {
  return (
    <section style={{ padding: '56px 32px', background: 'var(--paper)', borderBottom: '1px solid var(--rule)' }}>
      <div className="ms-container" style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="eyebrow" style={{ color: 'var(--accent)' }}>Find your shelf</div>
          <h2 className="display" style={{ fontWeight: 500, fontSize: 34, letterSpacing: '-0.018em', marginTop: 8 }}>
            Browse by faculty &amp; year
          </h2>
        </div>
        <div className="ms-grid-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
          {COURSE_TINTS.map((c, i) => (
            <a key={i} href="#" style={{
              padding: '24px 18px', background: c.tint,
              border: `1px solid ${c.hue}22`, position: 'relative',
              display: 'flex', flexDirection: 'column', gap: 6, minHeight: 140,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--paper)', border: `1px solid ${c.hue}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 16, color: c.hue,
              }}>
                {c.name[0]}
              </div>
              <div className="display" style={{
                fontWeight: 500, fontSize: 22, letterSpacing: '-0.01em',
                color: c.hue, marginTop: 6,
              }}>{c.name}</div>
              <div className="serif" style={{ fontStyle: 'italic', fontSize: 12, color: 'var(--ink-2)', opacity: 0.75 }}>{c.sub}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionHead({ eyebrow, title, subtitle, link }) {
  return (
    <div className="ms-section-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 32, paddingBottom: 20, marginBottom: 28, borderBottom: '1px solid var(--rule)' }}>
      <div style={{ maxWidth: 640 }}>
        {eyebrow && <div className="eyebrow" style={{ color: 'var(--accent)' }}>{eyebrow}</div>}
        <h2 className="display" style={{ fontSize: 38, fontWeight: 500, letterSpacing: '-0.018em', margin: 0, lineHeight: 1.05, marginTop: 10 }}>
          {title}
        </h2>
        {subtitle && <p className="serif" style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', marginTop: 6, marginBottom: 0 }}>{subtitle}</p>}
      </div>
      {link && (
        <a href="#" className="ms-btn-link ms-arrow-link" style={{ flexShrink: 0 }}>
          {link} <span className="ms-arrow">→</span>
        </a>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// BookCard — paper background, % off corner badge, retail signals
// ────────────────────────────────────────────────────────────────────────────
export function BookCard({ book, onAdd, onWish, onOpen, wished }) {
  const [hover, setHover] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const discount = Math.round((1 - book.price / book.mrp) * 100);

  const handleAdd = (e) => {
    e?.stopPropagation(); onAdd();
    setJustAdded(true); setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <article onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : undefined}
      aria-label={`View ${book.title}`}
      className="ms-card-lift"
      style={{ background: 'var(--paper)', border: '1px solid var(--rule-soft)', padding: 16, position: 'relative',
        cursor: onOpen ? 'pointer' : 'default', display: 'flex', flexDirection: 'column' }}>

      <span aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, zIndex: 3,
        background: 'var(--accent)', color: 'var(--paper)', padding: '4px 10px',
        fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
        {discount}% OFF
      </span>

      {book.tag && (
        <span aria-hidden="true" style={{ position: 'absolute', top: 0, right: 44, zIndex: 3,
          background: book.tag === 'Bestseller' ? 'var(--gold)' : book.tag === 'Just In' ? 'var(--success)' : 'var(--ink)',
          color: 'var(--paper)', padding: '4px 9px', fontSize: 9.5, fontWeight: 700,
          fontFamily: 'var(--sans)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{book.tag}</span>
      )}

      <button onClick={(e) => { e.stopPropagation(); onWish(); }}
        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'} aria-pressed={wished}
        style={{ position: 'absolute', top: 6, right: 6, zIndex: 3, width: 32, height: 32,
          background: 'var(--paper)', border: '1px solid var(--rule-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: wished ? 'var(--accent)' : 'var(--muted)' }}>
        <Icon name={wished ? 'heart-fill' : 'heart'} size={14} />
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 14px',
        background: 'var(--paper-2)', margin: '-16px -16px 14px',
        borderBottom: '1px solid var(--rule-soft)' }}>
        <BookCover book={book} />
      </div>

      <h3 className="serif" style={{ fontSize: 14.5, lineHeight: 1.2, fontWeight: 500, color: 'var(--ink)',
        margin: '0 0 4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 36 }}>
        {book.title} <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>· {book.edition}</span>
      </h3>
      <div className="serif" style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--muted)', marginTop: 4 }}>{book.author}</div>

      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-2)' }}>
          <span style={{ color: 'var(--gold)' }}>★</span><span>{book.rating?.toFixed(1)}</span>
          <span style={{ color: 'var(--muted)' }}>({book.reviews?.toLocaleString('en-IN')})</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
            <span className="serif" style={{ fontSize: 17, fontWeight: 600, color: 'var(--accent)' }}>₹{book.price.toLocaleString('en-IN')}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'line-through' }}>₹{book.mrp.toLocaleString('en-IN')}</span>
          </span>
          <button onClick={handleAdd} aria-label="Add to cart"
            className="ms-btn-icon"
            data-state={justAdded ? 'added' : ''}>
            {justAdded ? <Icon name="check" size={14} stroke={3} /> : '+'}
          </button>
        </div>
      </div>
    </article>
  );
}

export function BookGrid({ eyebrow, title, subtitle, books, loading, onAdd, onWish, onOpen, wished, density = 5, marginNote }) {
  const ref = useReveal();
  return (
    <section ref={ref} style={{ borderBottom: '1px solid var(--rule)', position: 'relative' }}>
      {marginNote && <MarginNote>{marginNote}</MarginNote>}
      <div className="ms-container" style={{ maxWidth: 1320, margin: '0 auto', padding: '56px 32px' }}>
        <SectionHead eyebrow={eyebrow} title={title} subtitle={subtitle} link="View all" />
        <div className={`ms-grid-${density}`} style={{
          display: 'grid', gridTemplateColumns: `repeat(${density}, 1fr)`, gap: 16,
        }}>
          {loading
            ? Array.from({ length: density }).map((_, i) => (
                <div key={i} className="ms-skel" style={{ height: 360 }} />
              ))
            : (books || []).slice(0, density * 2).map((b) => (
                <BookCard key={b.id} book={b}
                  onAdd={() => onAdd(b)} onWish={() => onWish(b.id)} onOpen={() => onOpen(b)}
                  wished={wished.has(b.id)} />
              ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Bundles, Forthcoming, Second-hand, Testimonials, GenuineBanner, Distributors
// ────────────────────────────────────────────────────────────────────────────
export function Bundles({ bundles, onAdd }) {
  if (!bundles?.length) return null;
  return (
    <section style={{ background: 'var(--paper)', borderBottom: '1px solid var(--rule-soft)' }}>
      <div className="ms-container" style={{ maxWidth: 1320, margin: '0 auto', padding: '80px 32px' }}>
        <SectionHead eyebrow="Bundle deals" title="Buy together. Save more."
          subtitle="Curated by senior students and faculty mentors." link="All bundles" />
        <div className="ms-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {bundles.map(b => (
            <article key={b.id} style={{ background: 'var(--paper-2)', border: '1px solid var(--rule-soft)', padding: 24 }}>
              <div className="eyebrow" style={{ color: 'var(--accent)' }}>Combo · {b.books.length} books</div>
              <h3 className="display" style={{ fontSize: 22, fontWeight: 500, marginTop: 8, lineHeight: 1.15 }}>{b.title}</h3>
              <p className="serif" style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: 6 }}>{b.subtitle}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0', borderTop: '1px dotted var(--rule-soft)', paddingTop: 14 }}>
                {b.books.map((bk, i) => (
                  <li key={i} className="serif" style={{ fontSize: 12.5, padding: '4px 0', display: 'flex', gap: 8 }}>
                    <Icon name="check" size={13} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
                    <span>{bk}</span>
                  </li>
                ))}
              </ul>
              <div style={{ paddingTop: 14, borderTop: '1px dotted var(--rule-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'line-through' }}>₹{b.mrp.toLocaleString('en-IN')}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="serif" style={{ fontSize: 24, fontWeight: 600, color: 'var(--accent)' }}>₹{b.price.toLocaleString('en-IN')}</span>
                    <span className="sans" style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)' }}>SAVE ₹{b.saved.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <button onClick={() => onAdd(b)} className="ms-btn ms-btn-ink" style={{ padding: '11px 18px' }}>
                  Add Combo <span className="ms-arrow">→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Forthcoming({ books, onOpen, onNotify }) {
  if (!books?.length) return null;
  return (
    <section style={{ background: 'var(--paper)', borderBottom: '1px solid var(--rule)' }}>
      <div className="ms-container" style={{ maxWidth: 1320, margin: '0 auto', padding: '56px 32px' }}>
        <SectionHead eyebrow="Forthcoming Books" title="Pre-order before they ship."
          subtitle="Pay nothing today — we'll write you the morning the carton arrives." />
        <div className="ms-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {books.slice(0, 3).map((b) => (
            <article key={b.id} onClick={() => onOpen(b)}
              role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(b); } }}
              style={{
                background: 'var(--paper-2)', padding: 24, cursor: 'pointer',
                border: '1px solid var(--rule-soft)', display: 'flex', gap: 20,
              }}>
              <BookCover book={b} width={110} height={158} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="mono" style={{
                  display: 'inline-block', alignSelf: 'flex-start',
                  background: 'var(--accent)', color: 'var(--paper)', padding: '3px 10px',
                  fontSize: 9.5, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 10,
                }}>
                  ARRIVES {String(b.arrivalDate || '').toUpperCase()}
                </div>
                <h3 className="serif" style={{
                  fontWeight: 500, fontSize: 18, lineHeight: 1.18, letterSpacing: '-0.005em', color: 'var(--ink)',
                }}>{b.title}</h3>
                <div className="serif" style={{ fontStyle: 'italic', fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                  {b.author} · {b.edition}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                    <span className="serif" style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>
                      ₹{b.price.toLocaleString('en-IN')}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'line-through' }}>
                      ₹{b.mrp.toLocaleString('en-IN')}
                    </span>
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); onNotify(b); }} className="ms-btn-link ms-arrow-link" style={{ marginTop: 10 }}>
                    Notify me <span className="ms-arrow">→</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SecondHand({ books, onAdd, onOpen }) {
  if (!books?.length) return null;
  return (
    <section style={{ background: 'var(--paper)', borderBottom: '1px solid var(--rule-soft)' }}>
      <div className="ms-container" style={{ maxWidth: 1320, margin: '0 auto', padding: '80px 32px' }}>
        <SectionHead eyebrow="Student marketplace" title="Second-hand books — up to 60% off"
          subtitle="Quality-checked used textbooks from senior students at AIIMS, JIPMER, KGMU and 480+ medical colleges." link="Sell your books" />
        <div className="ms-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          {books.map(b => {
            const usedDiscount = Math.round((1 - b.price / (b.originalPrice || b.mrp)) * 100);
            const condColor = b.conditionScore >= 9 ? '#16a34a' : b.conditionScore >= 7 ? '#65a30d' : '#ca8a04';
            return (
              <article key={b.id} onClick={() => onOpen(b)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(b); } }}
                style={{ background: 'var(--paper)', border: '1px solid var(--rule-soft)', padding: 16, position: 'relative', cursor: 'pointer' }}>
                <span style={{ position: 'absolute', top: 0, left: 0, background: condColor, color: 'var(--paper)',
                  padding: '4px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', fontFamily: 'var(--sans)' }}>{b.condition}</span>
                <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--accent)', color: 'var(--paper)',
                  padding: '4px 10px', fontSize: 10, fontWeight: 700, fontFamily: 'var(--sans)' }}>{usedDiscount}% OFF</span>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 14px', background: 'var(--paper-2)', margin: '-16px -16px 14px', borderBottom: '1px solid var(--rule-soft)' }}>
                  <BookCover book={b} />
                </div>
                <h3 className="serif" style={{ fontSize: 14, lineHeight: 1.2, fontWeight: 500, minHeight: 36, overflow: 'hidden' }}>{b.title}</h3>
                <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{b.edition}</div>
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--paper-2)', borderLeft: `3px solid ${condColor}`, fontSize: 11 }}>
                  <div className="serif" style={{ fontWeight: 600 }}>Sold by {b.seller?.split(',')[0]}</div>
                  <div className="serif" style={{ fontStyle: 'italic', color: 'var(--muted)', marginTop: 2 }}>{b.soldBy}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
                  <span className="serif" style={{ fontSize: 19, fontWeight: 600, color: '#16a34a' }}>₹{b.price.toLocaleString('en-IN')}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'line-through' }}>₹{(b.originalPrice || b.mrp).toLocaleString('en-IN')}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onAdd(b); }} className="ms-btn ms-btn-ink"
                  style={{ width: '100%', marginTop: 12, padding: 10, fontSize: 11, letterSpacing: '0.14em' }}>
                  Buy Used · 1 in stock
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function GenuineBanner() {
  return (
    <section style={{ padding: '40px 48px', background: 'var(--paper)' }}>
      <div className="ms-container" style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '48px 56px',
          background: 'var(--ink)', color: 'var(--paper)', position: 'relative' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 8, border: '1px solid rgba(217,152,80,0.35)', pointerEvents: 'none' }} />
          <div className="serif" style={{ fontStyle: 'italic', fontSize: 14, color: 'var(--saffron)',
            letterSpacing: '0.16em', textTransform: 'uppercase' }}>The Pam Guarantee</div>
          <h2 className="display" style={{ fontWeight: 500, fontSize: 40, marginTop: 14, lineHeight: 1.1, color: 'var(--paper)' }}>
            100% Original Books. <span style={{ color: 'var(--saffron)', fontStyle: 'italic' }}>Money back, otherwise.</span>
          </h2>
          <p className="serif" style={{ fontSize: 15, color: 'rgba(246,241,231,0.78)', marginTop: 16, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 }}>
            Every book is sourced from authorised publishers and dispatched same-day from our Ellis Bridge shop in Ahmedabad, wrapped in butter paper.
          </p>
        </div>
      </div>
    </section>
  );
}

export function Testimonials({ testimonials }) {
  if (!testimonials?.length) return null;
  const sourceColors = { Google: '#4285F4', WhatsApp: '#25D366', Trustpilot: '#00B67A' };
  return (
    <section style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--rule-soft)' }}>
      <div className="ms-container" style={{ maxWidth: 1320, margin: '0 auto', padding: '80px 32px' }}>
        <SectionHead eyebrow="What students say" title="Loved by 180,000+ medical students"
          subtitle="Real reviews from Google and WhatsApp." />
        <div className="ms-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {testimonials.slice(0, 6).map((t, i) => (
            <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--rule-soft)', padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--accent)', color: 'var(--paper)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {t.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="serif" style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                  <div className="serif" style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>{t.role}</div>
                </div>
                <span className="sans" style={{ padding: '3px 8px', fontSize: 10, fontWeight: 700,
                  background: `${sourceColors[t.source] || '#888'}22`, color: sourceColors[t.source] || '#888' }}>
                  {t.source.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 1, marginTop: 10 }}>
                {[1,2,3,4,5].map(n => <span key={n} style={{ color: n <= t.rating ? 'var(--gold)' : 'var(--rule-soft)' }}>★</span>)}
                <span className="serif" style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginLeft: 8 }}>{t.date}</span>
              </div>
              <div className="serif" style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-2)', marginTop: 12 }}>"{t.text}"</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Distributors() {
  const list = ['Elsevier', 'Wolters Kluwer', 'Lippincott', 'CBS', 'Jaypee', 'Bhanot', 'Thieme', 'Springer'];
  return (
    <section style={{ padding: '40px 32px', background: 'var(--paper)', borderTop: '1px solid var(--rule-soft)' }}>
      <div className="ms-container" style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div className="eyebrow" style={{ color: 'var(--muted)', textAlign: 'center', marginBottom: 24 }}>Authorised distributor for</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 32 }}>
          {list.map((d, i) => (
            <div key={d} className="serif" style={{ fontWeight: 500, fontSize: 18, color: 'var(--ink-2)', fontStyle: i % 2 ? 'italic' : 'normal' }}>{d}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const cols = [
    { title: 'Catalogue', links: ['MBBS','BDS','Nursing','NEET-PG','MD/MS','Equipment'] },
    { title: 'Account',   links: ['My Orders','Wishlist','Track Order','Returns','Refund Status'] },
    { title: 'Company',   links: ['About','Our Warehouse','Careers','Bulk Orders','Affiliate'] },
    { title: 'Help',      links: ['FAQs','Shipping','Cancellation','Privacy','Terms'] },
  ];
  return (
    <footer style={{ background: 'var(--ink)', color: 'rgba(246,241,231,0.85)', borderTop: '6px solid var(--accent)' }}>
      <div className="ms-container" style={{ maxWidth: 1320, margin: '0 auto', padding: '56px 32px 24px' }}>
        <div className="ms-grid-4" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr', gap: 48 }}>
          <div>
            <span className="display" style={{ fontSize: 28, fontWeight: 600, color: 'var(--paper)' }}>
              Pam Medical Books<span style={{ color: 'var(--accent-soft)' }}>.</span>
            </span>
            <p className="serif" style={{ fontSize: 13.5, fontStyle: 'italic', marginTop: 14, lineHeight: 1.6, maxWidth: 300, color: 'rgba(246,241,231,0.7)' }}>
              Ellis Bridge, Ahmedabad's trusted medical bookseller since 2020. Genuine prints, same-day dispatch across Gujarat.
            </p>
            <div className="sans" style={{ marginTop: 22, fontSize: 12, color: 'rgba(246,241,231,0.65)', lineHeight: 1.7 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <Icon name="pin" size={13} aria-hidden="true" />
                <span>9, Rangoli Complex, Opp. Victoria Garden, B/S Shantaben Panipuriwala, V.S. Hospital, Ellis Bridge, Ahmedabad — 380006</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Icon name="phone" size={13} stroke={2} aria-hidden="true" /> +91 79 2657 8901
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="mail" size={13} aria-hidden="true" /> hello@pammedicalbooks.in
              </div>
            </div>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <div className="eyebrow" style={{ color: 'rgba(246,241,231,0.55)', marginBottom: 16 }}>{col.title}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {col.links.map(l => <li key={l} style={{ marginBottom: 9 }}><a href="#" className="serif" style={{ fontSize: 13.5 }}>{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="serif" style={{ marginTop: 40, padding: '24px 0', borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: 11.5, color: 'rgba(246,241,231,0.5)', lineHeight: 1.8 }}>
          <strong className="sans" style={{ color: 'var(--accent-soft)', fontSize: 10, letterSpacing: '0.16em',
            textTransform: 'uppercase', display: 'inline-block', marginRight: 10 }}>Popular Searches:</strong>
          MBBS 1st Year Books · Robbins Pathology · Gray's Anatomy · BD Chaurasia · Park's PSM · Bailey & Love · Harrison's Medicine · NEET-PG Books · Marrow MCQs · Lippincott Biochemistry · Stethoscopes · Dissection Kits
        </div>
        <div className="mono" style={{ paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, fontSize: 10.5, color: 'rgba(246,241,231,0.5)' }}>
          <div>© 2026 Pam Medical Book House · Ahmedabad · GSTIN 24ABCDE1234F1Z5</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span>VISA</span><span>UPI</span><span>RUPAY</span><span>NETBANKING</span><span>COD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

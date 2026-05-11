// World-building components — the inhabited-archive primitives.
// These are the pieces that make the site feel like an institution rather
// than a storefront. All deliberately small and composable; render
// metadata (dates, codes, conditions) as catalog artefacts.
import React from 'react';
import { archiveCode } from '../lib/archive-code.js';

// ─── DispatchSlip ─────────────────────────────────────────────────────────
// A receipt/catalog-card block. Used on Hero, ProductModal, OrderConfirm,
// and any other surface that needs to surface a book's metadata as if it
// were a paper insert tucked into the leaves.
export function DispatchSlip({ book, lines, rotate = 0, compact = false, style }) {
  const code = book ? archiveCode(book) : null;
  const inferredLines = lines || (book ? [
    book.acquired ? ['Acquired',  book.acquired] : null,
    book.edition  ? ['Edition',   book.edition] : null,
    book.condition? ['Condition', book.condition] : null,
    ['Dispatch',   'Within 2 working days'],
  ].filter(Boolean) : []);
  return (
    <div style={{
      background: 'var(--paper-2)',
      border: '1px solid var(--rule-soft)',
      padding: compact ? '8px 12px' : '12px 16px',
      transform: rotate ? `rotate(${rotate}deg)` : undefined,
      boxShadow: '0 8px 18px -10px rgba(15,13,8,0.32)',
      minWidth: compact ? 160 : 200,
      ...style,
    }}>
      <div className="t-archive" style={{ fontSize: 9 }}>Dispatch slip</div>
      {code && (
        <div className="t-mono" style={{
          fontSize: 10, marginTop: 4, color: 'var(--ink-2)',
          fontFeatureSettings: '"tnum","lnum"',
        }}>{code}</div>
      )}
      {inferredLines.length > 0 && (
        <div style={{
          marginTop: 6, paddingTop: 4,
          borderTop: '1px dashed var(--rule-hair)',
          fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)',
        }}>
          {inferredLines.map(([label, value], i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              gap: 12, padding: '1px 0',
            }}>
              <span style={{ letterSpacing: '0.04em' }}>{label}</span>
              <span style={{ color: 'var(--ink-2)', fontFeatureSettings: '"tnum","lnum"' }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ArchiveStamp ─────────────────────────────────────────────────────────
// Wraps the existing SVG stamp seal with named, semantic variants so
// callers don't have to hand-write rotation angles and labels.
const STAMP_VARIANTS = {
  verified:    { label: 'Verified',  sub: 'condition',    rotate: -12 },
  acquired:    { label: 'Acquired',  sub: 'archive',      rotate: -8  },
  dispatch:    { label: 'Dispatch',  sub: '2 w.d.',       rotate: -14 },
  bestseller:  { label: 'Best',      sub: 'seller',       rotate: -10 },
  edition:     { label: 'New',       sub: 'edition',      rotate: -12 },
};

export function ArchiveStamp({ variant = 'verified', size = 96, date, children }) {
  const v = STAMP_VARIANTS[variant] || STAMP_VARIANTS.verified;
  const labelLines = children
    ? React.Children.toArray(children).filter(Boolean)
    : [<span key="a">{v.label}</span>, <br key="br" />, <span key="b">{v.sub}</span>];
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, position: 'relative',
      transform: `rotate(${v.rotate}deg)`,
      filter: 'contrast(1.05) saturate(0.92)',
    }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <filter id={`stamp-grain-${variant}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
        <circle cx="50" cy="50" r="46" fill="none" stroke="var(--oxblood)" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="var(--oxblood)" strokeWidth="0.6" strokeDasharray="2 2" />
        <path id={`stamp-arc-${variant}`} d="M 50 14 a 36 36 0 0 1 0 72 a 36 36 0 0 1 0 -72" fill="none" />
        <text fill="var(--oxblood)" fontFamily="var(--sans)" fontSize="5" letterSpacing="2.4" fontWeight="700">
          <textPath href={`#stamp-arc-${variant}`} startOffset="6%">
            {`PMB · ${(date || new Date().getFullYear()).toString().toUpperCase()} ·`}
          </textPath>
        </text>
        <foreignObject x="20" y="35" width="60" height="32">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 13,
            color: 'var(--oxblood)', textAlign: 'center', lineHeight: 1.05,
            letterSpacing: '-0.01em', fontStyle: 'italic',
          }}>{labelLines}</div>
        </foreignObject>
        <rect x="0" y="0" width="100" height="100"
          fill="var(--oxblood)" filter={`url(#stamp-grain-${variant})`} opacity="0.10" />
      </svg>
    </div>
  );
}

// ─── CatalogCard ──────────────────────────────────────────────────────────
// Replaces the trust-strip pills with a real 3.5×5" catalog-card aesthetic.
// Each tile is paper-on-paper with a dispatch-slip dotted divider.
export function CatalogCard({ icon, title, sub, code }) {
  return (
    <div className="ms-catalog-card" style={{
      background: 'var(--paper)',
      border: '1px solid var(--rule-soft)',
      padding: '18px 22px',
      display: 'flex', alignItems: 'flex-start', gap: 14,
      minHeight: 96,
      position: 'relative',
      transition: 'transform var(--dur-micro) var(--ease-micro), box-shadow var(--dur-micro) var(--ease-micro)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: 'var(--paper-2)', border: '1px solid var(--rule-soft)',
        color: 'var(--oxblood)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="serif" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-deep)' }}>{title}</div>
        <div className="t-meta" style={{ marginTop: 2 }}>{sub}</div>
        {code && (
          <div style={{
            marginTop: 8, paddingTop: 6,
            borderTop: '1px dashed var(--rule-hair)',
          }}>
            <div className="t-archive" style={{ fontSize: 9 }}>{code}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ChapterMark ──────────────────────────────────────────────────────────
// Section heading with optional Roman numeral. Use in place of SectionHead
// when a section deserves chapter-of-archive treatment.
const ROMAN = ['', 'I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
export function ChapterMark({ chapter, eyebrow, title, subtitle, archiveSlug, link, linkLabel = 'View collection' }) {
  return (
    <div className="ms-section-head" style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 32, paddingBottom: 20, marginBottom: 28,
      borderBottom: '1px solid var(--rule)',
    }}>
      <div style={{ maxWidth: 640, position: 'relative' }}>
        {chapter && (
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 13, fontStyle: 'italic',
            color: 'var(--muted)', letterSpacing: '0.04em', marginBottom: 4,
          }}>
            Chapter <span style={{ color: 'var(--oxblood)', fontWeight: 600 }}>{ROMAN[chapter] || chapter}</span>
            {archiveSlug ? <> · <span className="t-mono" style={{ fontSize: 11, fontStyle: 'normal' }}>{archiveSlug}</span></> : null}
          </div>
        )}
        {eyebrow && <div className="eyebrow" style={{ color: 'var(--oxblood)' }}>{eyebrow}</div>}
        <h2 className="display" style={{
          fontSize: 'var(--t-display-l)', fontWeight: 500,
          letterSpacing: '-0.022em', margin: '10px 0 0', lineHeight: 1.05,
          color: 'var(--ink-deep)',
          fontVariationSettings: '"opsz" 96',
        }}>
          {title}
        </h2>
        {subtitle && (
          <p className="serif" style={{
            fontSize: 14, color: 'var(--muted)', fontStyle: 'italic',
            marginTop: 8, marginBottom: 0, maxWidth: 540, lineHeight: 1.55,
          }}>{subtitle}</p>
        )}
      </div>
      {link && (
        <a href={link} className="ms-btn-link ms-arrow-link ms-hand-underline" style={{ flexShrink: 0 }}>
          {linkLabel} <span className="ms-arrow">→</span>
        </a>
      )}
    </div>
  );
}

// ─── MarginAnnotation ─────────────────────────────────────────────────────
// A scholarly margin note. Two voices: 'faculty' (oxblood, signed) and
// 'curator' (muted ink). Renders rotated -90° in the left gutter on
// desktop; degrades to inline italic on mobile via CSS.
export function MarginAnnotation({ children, hand = 'curator', side = 'left' }) {
  const color = hand === 'faculty' ? 'var(--oxblood)' : 'var(--muted)';
  return (
    <div aria-hidden="true" className="ms-margin-note" style={{
      position: 'absolute',
      [side]: -58,
      top: '50%',
      transform: `translateY(-50%) rotate(${side === 'left' ? -90 : 90}deg)`,
      transformOrigin: side === 'left' ? 'left center' : 'right center',
      fontFamily: 'var(--serif)', fontStyle: 'italic',
      fontSize: 11, color,
      letterSpacing: '0.04em', whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}>
      <span style={{ color: 'var(--oxblood)', marginRight: 8, fontWeight: 600 }}>§</span>
      {children}
    </div>
  );
}

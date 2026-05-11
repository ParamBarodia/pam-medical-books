// Deterministic archive code for every book. Rendered in ~8 surfaces
// (BookCard, ProductModal, CartDrawer, CheckoutReview, OrderConfirm,
// Forthcoming card, SecondHand card, Admin order rows). The same book
// always produces the same code — it is an identifier the user can
// learn to recognize.
//
// Format:  PMB · MBBS · 2024 · 0042
//          ^^^   ^^^^   ^^^^   ^^^^
//          fond  series year   sequence

const SERIES = {
  'MBBS':    'MBBS',
  'BDS':     'BDS',
  'Nursing': 'NUR',
  'NEET-PG': 'NPG',
  'MD/MS':   'MDS',
  'Faculty': 'FAC',
};

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function archiveCode(book) {
  if (!book) return '';
  const series = SERIES[book.category] || 'GEN';
  const year = book.publishedYear || book.year || 2024;
  const seq = String(hash(String(book.id || book.title || '')) % 10000).padStart(4, '0');
  return `PMB · ${series} · ${year} · ${seq}`;
}

// Variant for dispatch slips — adds vol/sec
export function archiveLong(book) {
  const base = archiveCode(book);
  const shelf = (book.shelf || 'general').toUpperCase().slice(0, 4);
  return `${base} · ${shelf}`;
}

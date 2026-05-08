// ISBN-based metadata fetcher.
// Tries Google Books → Open Library → null. Returns a normalized shape.

export async function fetchBookMetadata(isbn) {
  if (!isbn) return null;
  const cleaned = String(isbn).replace(/[^\dXx]/g, '');
  if (cleaned.length !== 10 && cleaned.length !== 13) return null;

  const fromGoogle = await tryGoogleBooks(cleaned);
  if (fromGoogle) return fromGoogle;

  const fromOpenLib = await tryOpenLibrary(cleaned);
  if (fromOpenLib) return fromOpenLib;

  return null;
}

async function tryGoogleBooks(isbn) {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
    // Google Books occasionally returns 503; retry once with a short backoff
    let res = await fetch(url, { headers: { 'User-Agent': 'MedShelf-Importer/1.0' } });
    if (res.status === 503) {
      await new Promise((r) => setTimeout(r, 1500));
      res = await fetch(url, { headers: { 'User-Agent': 'MedShelf-Importer/1.0' } });
    }
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0]?.volumeInfo;
    if (!item) return null;

    return {
      source: 'google-books',
      title: item.title,
      subtitle: item.subtitle,
      authors: item.authors || [],
      publisher: item.publisher,
      publishedDate: item.publishedDate,
      pageCount: item.pageCount,
      description: item.description,
      categories: item.categories || [],
      language: item.language,
      coverUrl: item.imageLinks?.extraLarge
                || item.imageLinks?.large
                || item.imageLinks?.medium
                || item.imageLinks?.thumbnail
                || null,
    };
  } catch { return null; }
}

async function tryOpenLibrary(isbn) {
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=details&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data[`ISBN:${isbn}`];
    if (!entry?.details) return null;

    const d = entry.details;
    return {
      source: 'open-library',
      title: d.title,
      subtitle: d.subtitle,
      authors: (d.authors || []).map((a) => a.name),
      publisher: d.publishers?.[0],
      publishedDate: d.publish_date,
      pageCount: d.number_of_pages,
      description: typeof d.description === 'string' ? d.description : d.description?.value,
      categories: d.subjects || [],
      language: d.languages?.[0]?.key?.replace('/languages/', ''),
      coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,
    };
  } catch { return null; }
}

// Try to extract "11th Ed" from a title like "Robbins Basic Pathology, 11e"
export function extractEdition(title = '') {
  const m = title.match(/(\d+)(st|nd|rd|th)?[\s-]?(e|ed|edition)\b/i)
         || title.match(/(\d+)\s*\/?\s*e\b/i);
  return m ? `${m[1]}${suffixFor(m[1])} Ed` : null;
}
function suffixFor(n) {
  const x = Number(n) % 100;
  if (x >= 11 && x <= 13) return 'th';
  switch (x % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Map free-form publisher strings to our canonical list.
const PUBLISHER_ALIASES = {
  'elsevier': 'Elsevier', 'elsevier health sciences': 'Elsevier',
  'wolters kluwer': 'Wolters Kluwer', 'wolters kluwer health': 'Wolters Kluwer',
  'lippincott': 'Lippincott', 'lippincott williams & wilkins': 'Lippincott',
  'cbs': 'CBS', 'cbs publishers': 'CBS',
  'jaypee': 'Jaypee', 'jaypee brothers': 'Jaypee',
  'banarsidas bhanot': 'Bhanot', 'bhanot': 'Bhanot',
  'thieme': 'Thieme',
  'mcgraw hill': 'McGraw Hill', 'mcgraw-hill': 'McGraw Hill',
  'springer': 'Springer',
};
export function normalisePublisher(p) {
  if (!p) return undefined;
  return PUBLISHER_ALIASES[p.toLowerCase().trim()] || p;
}

// Map their category to ours.
const CATEGORY_ALIASES = {
  'mbbs': 'MBBS', 'm.b.b.s': 'MBBS', 'm.b.b.s.': 'MBBS', 'mbbs y1': 'MBBS', 'mbbs y2': 'MBBS', 'mbbs y3': 'MBBS', 'mbbs y4': 'MBBS',
  'bds': 'BDS', 'b.d.s': 'BDS', 'b.d.s.': 'BDS',
  'nursing': 'Nursing', 'gnm': 'Nursing', 'b.sc nursing': 'Nursing',
  'neet pg': 'NEET-PG', 'neet-pg': 'NEET-PG', 'pg entrance': 'NEET-PG',
  'md': 'MD/MS', 'ms': 'MD/MS', 'md/ms': 'MD/MS', 'pg': 'MD/MS',
  'faculty': 'Faculty', 'reference': 'Faculty',
};
export function normaliseCategory(c) {
  if (!c) return 'MBBS';   // default
  return CATEGORY_ALIASES[c.toLowerCase().trim()] || c;
}

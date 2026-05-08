// Sanity client + image URL builder. Set VITE_SANITY_PROJECT_ID in .env to enable.
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production';

export const SANITY_ENABLED = Boolean(projectId);

export const sanity = SANITY_ENABLED
  ? createClient({ projectId, dataset, apiVersion: '2024-01-01', useCdn: true })
  : null;

const builder = SANITY_ENABLED ? imageUrlBuilder(sanity) : null;
export const urlFor = (src) => (builder ? builder.image(src) : null);

// ─── Queries ──────────────────────────────────────────────────────────────
const BOOK_FIELDS = `
  _id, title, author, edition, isbn, mrp, price, stock, rating, reviews,
  publisher, pages, language, description, category, shelf, tag, archived,
  arrivalDate, condition, conditionScore, seller, soldBy, originalPrice,
  "imageRef": cover.asset->._id,
  "imageUrl": cover.asset->url,
  "blurHash": cover.asset->metadata.lqip,
  "fallbackUrl": coverUrl
`;

export async function fetchBooksByShelf(shelf) {
  if (!SANITY_ENABLED) return null;
  return sanity.fetch(
    `*[_type == "book" && shelf == $shelf && !archived] | order(rating desc, reviews desc) { ${BOOK_FIELDS} }`,
    { shelf }
  );
}

export async function searchBooks({ q, category }) {
  if (!SANITY_ENABLED) return null;
  let filter = '_type == "book" && !archived';
  const params = {};
  if (category && category !== 'All') { filter += ' && category == $category'; params.category = category; }
  if (q) {
    filter += ` && (title match $q || author match $q || publisher match $q || isbn match $q)`;
    params.q = q + '*';
  }
  return sanity.fetch(`*[${filter}] | order(rating desc) { ${BOOK_FIELDS} }`, params);
}

export async function fetchBundles() {
  if (!SANITY_ENABLED) return null;
  return sanity.fetch(
    `*[_type == "bundle" && !archived] | order(_createdAt desc) {
       _id, title, subtitle, badge, accent, mrp, price, saved,
       books[]->{ title, author, edition, "imageUrl": cover.asset->url }
     }`
  );
}

export async function fetchTestimonials() {
  if (!SANITY_ENABLED) return null;
  return sanity.fetch(
    `*[_type == "testimonial"] | order(order asc, _createdAt desc) { name, role, source, rating, date, text }`
  );
}

export async function fetchSiteSettings() {
  if (!SANITY_ENABLED) return null;
  return sanity.fetch(`*[_type == "siteSettings"][0]`);
}

// Helper: get an optimized image URL — used by BookCover when the book has a Sanity cover
export function coverUrl(book, width = 300) {
  if (!book) return null;
  if (book.imageRef && urlFor) {
    return urlFor(book.imageRef).width(width).fit('max').auto('format').url();
  }
  return book.imageUrl || book.fallbackUrl || null;
}

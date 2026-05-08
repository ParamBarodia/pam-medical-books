// Book schema — every field that flows from publisher → client → website.
// Soft-delete via `archived` (never delete books referenced by past orders).

const CATEGORIES = ['MBBS', 'BDS', 'Nursing', 'NEET-PG', 'MD/MS', 'Faculty'];
const SHELVES = ['featured', 'new', 'forthcoming', 'secondhand'];
const TAGS = ['Bestseller', 'New Edition', 'Just In', 'Top Pick', '2 Vol Set'];

export default {
  name: 'book',
  title: 'Book',
  type: 'document',
  groups: [
    { name: 'main',     title: 'Main',     default: true },
    { name: 'pricing',  title: 'Pricing & Stock' },
    { name: 'metadata', title: 'Metadata' },
    { name: 'used',     title: 'Used (second-hand)' },
    { name: 'preorder', title: 'Forthcoming (pre-order)' },
  ],
  fields: [
    // ── Main ──────────────────────────────────────────────────────────────
    { name: 'title',  title: 'Title',  type: 'string', group: 'main',
      validation: (r) => r.required().min(2).max(200) },
    { name: 'author', title: 'Author', type: 'string', group: 'main',
      validation: (r) => r.required() },
    { name: 'edition', title: 'Edition', type: 'string', group: 'main',
      description: 'e.g. "11th Ed", "9th Ed · Vol 1"' },
    { name: 'cover', title: 'Cover image', type: 'image', group: 'main',
      options: { hotspot: true },
      description: 'Upload here OR leave empty if you set "coverUrl" — we will fetch automatically.' },
    { name: 'coverUrl', title: 'Cover image URL (auto-fetch fallback)', type: 'url', group: 'main',
      hidden: ({ parent }) => Boolean(parent?.cover),
      description: 'Used by the import script to auto-fetch a cover from Open Library / Google Books.' },
    { name: 'description', title: 'Description', type: 'text', rows: 6, group: 'main' },
    { name: 'tag', title: 'Tag (badge on card)', type: 'string', group: 'main',
      options: { list: TAGS } },

    // ── Pricing & Stock ───────────────────────────────────────────────────
    { name: 'mrp',   title: 'MRP (₹)',          type: 'number', group: 'pricing',
      validation: (r) => r.required().min(0) },
    { name: 'price', title: 'Selling price (₹)', type: 'number', group: 'pricing',
      validation: (r) => r.required().min(0).custom((v, ctx) => v <= ctx.parent.mrp || 'Selling price must be ≤ MRP') },
    { name: 'stock', title: 'Stock count',       type: 'number', group: 'pricing', initialValue: 0,
      validation: (r) => r.min(0) },
    { name: 'rating',  title: 'Rating (0-5)',  type: 'number', group: 'pricing',
      validation: (r) => r.min(0).max(5) },
    { name: 'reviews', title: 'Review count', type: 'number', group: 'pricing', initialValue: 0 },
    { name: 'soldCount', title: 'Sold count', type: 'number', group: 'pricing',
      readOnly: true, initialValue: 0,
      description: 'Auto-incremented by the order webhook. Do not edit.' },

    // ── Metadata ──────────────────────────────────────────────────────────
    { name: 'isbn',     title: 'ISBN',     type: 'string',  group: 'metadata',
      validation: (r) => r.regex(/^\d{10}(\d{3})?$/, { name: 'ISBN' }).warning('Should be 10 or 13 digits') },
    { name: 'publisher', title: 'Publisher', type: 'string',  group: 'metadata',
      options: { list: ['Elsevier', 'Wolters Kluwer', 'Lippincott', 'CBS', 'Jaypee', 'Bhanot', 'Thieme', 'McGraw Hill', 'Springer', 'Other'] } },
    { name: 'pages',    title: 'Pages',    type: 'number', group: 'metadata' },
    { name: 'language', title: 'Language', type: 'string', group: 'metadata', initialValue: 'English' },
    { name: 'category', title: 'Category', type: 'string', group: 'metadata',
      options: { list: CATEGORIES }, validation: (r) => r.required() },
    { name: 'shelf', title: 'Shelf', type: 'string', group: 'metadata',
      options: { list: SHELVES }, initialValue: 'featured', validation: (r) => r.required() },
    { name: 'archived', title: 'Archived (soft delete)', type: 'boolean', group: 'metadata',
      initialValue: false,
      description: 'Hide from website without losing the record. Used books still reference this for past orders.' },

    // ── Used ──────────────────────────────────────────────────────────────
    { name: 'condition',      title: 'Condition (used books)', type: 'string', group: 'used',
      options: { list: ['Like New', 'Good', 'Acceptable'] },
      hidden: ({ parent }) => parent?.shelf !== 'secondhand' },
    { name: 'conditionScore', title: 'Condition score (1-10)', type: 'number', group: 'used',
      validation: (r) => r.min(1).max(10),
      hidden: ({ parent }) => parent?.shelf !== 'secondhand' },
    { name: 'seller',         title: 'Seller name + college', type: 'string', group: 'used',
      hidden: ({ parent }) => parent?.shelf !== 'secondhand' },
    { name: 'soldBy',         title: 'Seller year (e.g. "4th-year MBBS")', type: 'string', group: 'used',
      hidden: ({ parent }) => parent?.shelf !== 'secondhand' },
    { name: 'sellerNotes',    title: 'Notes from seller', type: 'text', rows: 3, group: 'used',
      hidden: ({ parent }) => parent?.shelf !== 'secondhand' },
    { name: 'originalPrice',  title: 'Original new price', type: 'number', group: 'used',
      hidden: ({ parent }) => parent?.shelf !== 'secondhand' },

    // ── Pre-order ─────────────────────────────────────────────────────────
    { name: 'arrivalDate',  title: 'Expected arrival date', type: 'date', group: 'preorder',
      hidden: ({ parent }) => parent?.shelf !== 'forthcoming' },
  ],
  preview: {
    select: { title: 'title', author: 'author', edition: 'edition', media: 'cover', stock: 'stock' },
    prepare({ title, author, edition, media, stock }) {
      return {
        title: `${title}${edition ? ` (${edition})` : ''}`,
        subtitle: `${author || ''}${stock != null ? ` · ${stock} in stock` : ''}`,
        media,
      };
    },
  },
  orderings: [
    { title: 'Stock (low first)', name: 'stockAsc',  by: [{ field: 'stock', direction: 'asc' }] },
    { title: 'Newest first',      name: 'createdDesc', by: [{ field: '_createdAt', direction: 'desc' }] },
    { title: 'Title A-Z',         name: 'titleAsc',  by: [{ field: 'title', direction: 'asc' }] },
  ],
};

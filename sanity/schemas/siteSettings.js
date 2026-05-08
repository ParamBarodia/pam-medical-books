// Singleton — only one instance ever. Lives at documentId 'siteSettings'.
export default {
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    { name: 'storeName',   title: 'Store name', type: 'string', initialValue: 'MedShelf' },
    { name: 'tagline',     title: 'Tagline',    type: 'string', initialValue: "India's bookseller to medicine" },

    // Promo bar
    { name: 'promos', title: 'Promo bar offers', type: 'array', of: [{ type: 'string' }],
      description: 'Each item appears in the scrolling ticker at the top of the site.',
      initialValue: [
        'Flat ₹100 OFF on orders ₹5,000+',
        'Flat ₹200 OFF on orders ₹10,000+',
        'Free shipping above ₹999',
        '100% Original — money back otherwise',
      ] },

    // Hero
    { name: 'heroEyebrow', title: 'Hero eyebrow', type: 'string',
      initialValue: 'CURATED FOR INDIAN MEDICAL CURRICULA · 2026 EDITIONS' },
    { name: 'heroHeadline', title: 'Hero headline', type: 'text', rows: 2,
      initialValue: 'Books, Instruments & Equipment.' },
    { name: 'heroAccent', title: 'Hero accent line (italic)', type: 'string',
      initialValue: 'Everything medical.' },
    { name: 'heroSubtext', title: 'Hero subtext', type: 'text', rows: 3,
      initialValue: '100% original textbooks, stethoscopes, dissection kits and more.' },

    // Contact
    { name: 'phone',         title: 'Phone',         type: 'string' },
    { name: 'whatsappPhone', title: 'WhatsApp number', type: 'string' },
    { name: 'email',         title: 'Email',         type: 'string' },
    { name: 'hours',         title: 'Hours',         type: 'string', initialValue: 'Mon–Sat · 10:30 AM – 7 PM' },
    { name: 'address',       title: 'Warehouse address', type: 'text', rows: 3 },

    // Business
    { name: 'gstin', title: 'GSTIN', type: 'string' },
    { name: 'cin',   title: 'CIN',   type: 'string' },

    // Pricing rules
    { name: 'freeShippingMin', title: 'Free shipping above (₹)', type: 'number', initialValue: 999 },
    { name: 'shippingFee',     title: 'Below-min shipping fee (₹)', type: 'number', initialValue: 49 },
    { name: 'tier1Min',        title: 'Tier 1 discount min (₹)', type: 'number', initialValue: 5000 },
    { name: 'tier1Off',        title: 'Tier 1 discount (₹)',     type: 'number', initialValue: 100 },
    { name: 'tier2Min',        title: 'Tier 2 discount min (₹)', type: 'number', initialValue: 10000 },
    { name: 'tier2Off',        title: 'Tier 2 discount (₹)',     type: 'number', initialValue: 200 },

    // Referral
    { name: 'referralCredit', title: 'Refer & Earn credit (₹)', type: 'number', initialValue: 200 },
    { name: 'referralMinOrder', title: 'Min order to qualify (₹)', type: 'number', initialValue: 999 },
  ],
  preview: { prepare: () => ({ title: 'Site Settings' }) },
};

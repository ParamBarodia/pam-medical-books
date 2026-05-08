export default {
  name: 'bundle',
  title: 'Bundle',
  type: 'document',
  fields: [
    { name: 'title',    title: 'Title',    type: 'string', validation: (r) => r.required() },
    { name: 'subtitle', title: 'Subtitle', type: 'string' },
    { name: 'badge',    title: 'Badge text (e.g. "Save 15%")', type: 'string' },
    { name: 'accent',   title: 'Accent color', type: 'string',
      options: { list: ['amber', 'teal', 'navy', 'oxblood'] } },
    { name: 'books',    title: 'Books in bundle', type: 'array',
      of: [{ type: 'reference', to: [{ type: 'book' }] }],
      validation: (r) => r.min(2).max(10) },
    { name: 'mrp',      title: 'Combined MRP',      type: 'number', validation: (r) => r.required().min(0) },
    { name: 'price',    title: 'Bundle price',      type: 'number', validation: (r) => r.required().min(0) },
    { name: 'saved',    title: 'Savings',           type: 'number', validation: (r) => r.min(0) },
    { name: 'archived', title: 'Archived',          type: 'boolean', initialValue: false },
  ],
  preview: {
    select: { title: 'title', subtitle: 'subtitle' },
  },
};

export default {
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  fields: [
    { name: 'name',   title: 'Name',   type: 'string', validation: (r) => r.required() },
    { name: 'role',   title: 'Role / college', type: 'string',
      description: 'e.g. "AIIMS Delhi · MBBS Year 4"' },
    { name: 'source', title: 'Source', type: 'string',
      options: { list: ['Google', 'WhatsApp', 'Trustpilot', 'Email'] }, initialValue: 'Google' },
    { name: 'rating', title: 'Rating (1-5)', type: 'number', validation: (r) => r.required().min(1).max(5) },
    { name: 'date',   title: 'Date label (e.g. "12 days ago")', type: 'string' },
    { name: 'text',   title: 'Review text', type: 'text', rows: 4, validation: (r) => r.required() },
    { name: 'verified', title: 'Verified', type: 'boolean', initialValue: true },
    { name: 'order',  title: 'Display order', type: 'number', initialValue: 0,
      description: 'Lower numbers show first' },
  ],
  orderings: [{ title: 'Display order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'name', subtitle: 'text', rating: 'rating' },
    prepare({ title, subtitle, rating }) {
      return { title: `${title} (${rating}★)`, subtitle: subtitle?.slice(0, 80) };
    },
  },
};

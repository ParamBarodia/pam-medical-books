// Generic content page — Refund Policy, Terms, About, etc.
export default {
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (r) => r.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() },
    { name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] },
    { name: 'updatedAt', title: 'Last updated', type: 'date', initialValue: new Date().toISOString().slice(0, 10) },
  ],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
};

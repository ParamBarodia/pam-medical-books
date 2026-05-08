// Sanity Studio configuration
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';

export default defineConfig({
  name: 'medshelf',
  title: 'MedShelf',

  // Replace with your real Sanity project ID after `npx sanity init`
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'replace-me',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Site Settings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.divider(),
            S.documentTypeListItem('book').title('Books'),
            S.documentTypeListItem('bundle').title('Bundles'),
            S.documentTypeListItem('testimonial').title('Testimonials'),
            S.documentTypeListItem('page').title('Pages'),
          ]),
    }),
    visionTool(),
  ],

  schema: { types: schemaTypes },
});

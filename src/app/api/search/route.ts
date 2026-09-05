import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const revalidate = false;

export const { staticGET: GET } = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
  async buildIndex(page) {
    const structuredData = page.data.structuredData;

    return {
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      id: page.url,
      structuredData: {
        ...structuredData,
        // Cloudflare Pages limits individual static assets to 25 MiB. Keep
        // search coverage broad while preventing very long pages from making
        // the serialized index exceed that limit.
        contents: structuredData.contents.slice(0, 200),
      },
    };
  },
});

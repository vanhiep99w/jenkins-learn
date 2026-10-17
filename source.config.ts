import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { remarkD2 } from '@vanhiep99w/docs-kit/d2';
import { remarkCodeWalkthrough } from '@vanhiep99w/docs-kit/code-walkthrough';
import { remarkTerminalSession } from '@vanhiep99w/docs-kit/terminal-session';
import { remarkCodeDiff } from '@vanhiep99w/docs-kit/code-diff';
import { remarkProtocolExchange } from '@vanhiep99w/docs-kit/protocol-exchange';
import { remarkSpanWaterfall } from '@vanhiep99w/docs-kit/span-waterfall';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [
      [remarkD2, {
        cacheDir: '.next/cache/docs-kit/d2',
        assetsRoot: 'content/assets/d2',
        layout: 'elk',
        sketch: false,
        defaultCaption: 'Sơ đồ',
      }],
      remarkCodeWalkthrough,
      remarkTerminalSession,
      remarkCodeDiff,
      remarkProtocolExchange,
      remarkSpanWaterfall,
    ],
  },
});

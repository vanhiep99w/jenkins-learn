import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

function remarkMermaid() {
  return (tree: Root) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid' || index === undefined || !parent) return;

      (parent.children as unknown[])[index] = {
        type: 'mdxJsxFlowElement',
        name: 'MermaidDiagram',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'chart',
            value: node.value,
          },
        ],
        children: [],
      };
    });
  };
}

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
    remarkPlugins: [remarkMermaid],
  },
});

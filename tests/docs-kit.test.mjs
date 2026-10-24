import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const content = path.join(root, 'content/docs');
const output = path.join(root, 'out/docs');

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}

const pages = files(content)
  .filter((file) => /\.mdx?$/.test(file))
  .map((file) => {
    const slug = path.relative(content, file).replace(/\.mdx?$/, '');
    return {
      file,
      source: readFileSync(file, 'utf8'),
      htmlPath: path.join(output, slug === 'index' ? '' : slug, 'index.html'),
    };
  });

function html(page) {
  assert.ok(existsSync(page.htmlPath), `Run npm run build first: ${page.htmlPath}`);
  return readFileSync(page.htmlPath, 'utf8');
}

function fences(source, language) {
  return [...source.matchAll(new RegExp('^```' + language + '(?:[^\\n]*)\\n([\\s\\S]*?)^```\\s*$', 'gm'))];
}

test('docs use D2 instead of Mermaid; text trees and transcripts remain supported', () => {
  for (const page of pages) {
    assert.equal(fences(page.source, 'mermaid').length, 0, page.file);
    for (const block of fences(page.source, 'text')) {
      // A directory/namespace tree is intentionally text, not a flow diagram.
      assert.doesNotMatch(block[1], /[→►▼]|──>/, page.file);
    }
  }
});

test('every D2 fence exports a labelled SVG in both themes, without client rendering', () => {
  let total = 0;
  for (const page of pages) {
    const diagrams = fences(page.source, 'd2');
    if (!diagrams.length) continue;
    const rendered = html(page);
    total += diagrams.length;
    assert.equal((rendered.match(/<figure class="d2-diagram\b/g) ?? []).length, diagrams.length, page.file);
    for (const theme of ['light', 'dark']) {
      assert.equal((rendered.match(new RegExp(`class="d2-diagram-${theme}"`, 'g')) ?? []).length, diagrams.length, page.file);
    }
    assert.equal((rendered.match(/<figcaption id="[^"]+-caption"/g) ?? []).length, diagrams.length, page.file);
  }
  assert.ok(total > 0, 'No D2 diagrams found');
});

test('flow and topology diagrams do not regress into unreadable horizontal strips', () => {
  for (const page of pages) {
    const diagrams = fences(page.source, 'd2');
    if (!diagrams.length) continue;
    const rendered = html(page);
    for (const theme of ['light', 'dark']) {
      const svgs = [...rendered.matchAll(new RegExp(`class="d2-diagram-${theme}"[^>]*>\\s*(<svg\\b[^>]*>)`, 'g'))];
      assert.equal(svgs.length, diagrams.length, page.file);
      for (const [index, diagram] of diagrams.entries()) {
        // Sequence width depends on participant count; preserve its message order.
        if (/^shape:\s*sequence_diagram\s*$/m.test(diagram[1])) continue;
        const viewBox = /\bviewBox="([^"]+)"/.exec(svgs[index][1]);
        assert.ok(viewBox, `${page.file}: diagram ${index + 1}, ${theme}`);
        const [, , width, height] = viewBox[1].split(/\s+/).map(Number);
        assert.ok(width > 0 && height > 0, page.file);
        assert.ok(width <= 1200, `${page.file}: diagram ${index + 1}, ${theme} is ${width}px wide; choose a compact layout or split the view`);
      }
    }
  }
});

test('specialized docs-kit fences render components, not raw YAML code blocks', () => {
  for (const language of ['code-walkthrough', 'terminal-session', 'code-diff', 'protocol-exchange', 'span-waterfall']) {
    let count = 0;
    for (const page of pages) {
      const blocks = fences(page.source, language);
      if (!blocks.length) continue;
      count += blocks.length;
      const rendered = html(page);
      assert.equal((rendered.match(new RegExp(`<figure class="${language}\\b`, 'g')) ?? []).length, blocks.length, page.file);
      assert.ok(!rendered.includes(`data-language="${language}"`), page.file);
    }
    assert.ok(count > 0, `Missing example for ${language}`);
  }
});

test('diagram icons are embedded, with no runtime dependency on the icon catalog', () => {
  let embedded = 0;
  for (const page of pages) {
    if (!fences(page.source, 'd2').length) continue;
    for (const image of html(page).matchAll(/<image\b[^>]*>/g)) {
      const href = /(?:xlink:)?href="([^"]+)"/.exec(image[0]);
      assert.ok(href, page.file);
      assert.ok(href[1].startsWith('data:image/'), `${page.file}: ${href[1]}`);
      embedded++;
    }
  }
  assert.ok(embedded > 0, 'No embedded icons found');
});

test('static export ships no D2/WASM compiler', () => {
  assert.ok(existsSync(path.join(root, 'out')), 'Run npm run build first');
  assert.deepEqual(files(path.join(root, 'out')).filter((file) => /\.wasm$/.test(file)), []);
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(!pkg.dependencies.mermaid);
  const componentMap = readFileSync(path.join(root, 'src/components/mdx.tsx'), 'utf8');
  assert.doesNotMatch(componentMap, /from ['"]@vanhiep99w\/docs-kit\/(?:d2|code-walkthrough|code-diff)['"]/);
});

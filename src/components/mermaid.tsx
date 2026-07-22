'use client';

import { useEffect, useId, useRef } from 'react';

export function MermaidDiagram({ chart }: { chart: string }) {
  const reactId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramId = `mermaid-${reactId.replace(/:/g, '')}`;

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'strict',
      });

      const { svg } = await mermaid.render(diagramId, chart);
      if (!cancelled && containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [chart, diagramId]);

  return (
    <div
      ref={containerRef}
      className="my-6 flex justify-center overflow-x-auto rounded-xl border bg-fd-card p-4"
      role="img"
      aria-label="Sơ đồ Mermaid"
    />
  );
}

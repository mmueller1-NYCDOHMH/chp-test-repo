'use client';

/**
 * FILE: MarkdownRenderer.jsx
 *
 * Renders a markdown string using react-markdown.
 * Used inside FlyoutShell to display editable content from /content/flyouts/*.md
 *
 * Non-developers: edit the .md files in /content/flyouts/ — no code changes needed.
 *
 * WHY DYNAMIC IMPORT:
 * react-markdown is ~40 kB gzipped and only needed inside flyouts and category
 * info cards — never on initial page load. Dynamically importing it splits it
 * into a separate chunk so the initial JS bundle stays lean. The loading: null
 * means nothing flashes while it loads; the flyout itself has a loading state.
 */

import dynamic from 'next/dynamic';

const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false,
  loading: () => null,
});

const components = {
  h1: ({ children }) => <h1 className="text-xl font-bold text-gray-900 mt-2 mb-3">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold text-gray-900 mt-5 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-1">{children}</h3>,
  p:  ({ children }) => <p className="text-gray-700 leading-relaxed mb-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-gray-700">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-gray-700">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a:  ({ href, children }) => (
    <a href={href} className="text-blue-700 underline hover:opacity-70" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-gray-200" />,
};

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  // Normalize arrays to a markdown string (each item becomes a paragraph)
  const contentString = Array.isArray(content) ? content.join('\n\n') : String(content);

  return (
    <div className="text-sm">
      <ReactMarkdown components={components}>{contentString}</ReactMarkdown>
    </div>
  );
}

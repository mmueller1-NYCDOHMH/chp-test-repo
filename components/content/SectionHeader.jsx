'use client';

import { useState, useCallback } from 'react';

export default function SectionHeader({ title = 'Section', subtitle, sectionId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const url = new URL(window.location.href);
    url.hash = sectionId ?? '';
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [sectionId]);

  return (
    <div className="pt-2 mb-4 border-t border-gray-100">
      <div className="group flex items-center gap-2">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>

        {sectionId && (
          <button
            onClick={handleCopy}
            aria-label={`Copy link to ${title} section`}
            title="Copy section link"
            // Visible by default below sm: touch devices have no reliable hover
            // state, so a hover-only reveal would make this unreachable for
            // touch users. From sm: up (mouse/trackpad assumed) it reverts to
            // the quieter hover/focus-reveal pattern.
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-100 p-1 -m-1 rounded text-gray-400 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </button>
        )}
      </div>

      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
}

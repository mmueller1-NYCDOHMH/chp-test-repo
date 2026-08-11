import Link from 'next/link';

/**
 * Breadcrumb trail.
 * Accepts an array of { label, href? } items — the last item is the current
 * page and renders as plain text; all others render as links.
 *
 * Example: [{ label: 'Home', href: '/' }, { label: 'Harlem' }]
 */
export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 mb-6">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;

        return (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true" className="text-gray-500">/</span>}

            {isLast || !item.href ? (
              <span className="text-gray-700 font-medium">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-blue-700 transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

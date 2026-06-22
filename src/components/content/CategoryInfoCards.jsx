/**
 * FILE: CategoryInfoCards.jsx
 *
 * PURPOSE:
 * Renders a row of informational cards below a category header.
 * Replaces the "About [Category]" flyout pattern with inline content.
 *
 * DESCRIPTION:
 * Each card has a short title and a body populated from a .md file in
 * /content/category-cards/. Cards are arranged in a responsive grid,
 * visually consistent with the stat tiles in the overview hero section.
 *
 * CONFIG SHAPE (in section config):
 *   {
 *     type: 'categoryInfoCards',
 *     props: {
 *       cards: [
 *         { title: "What's included", contentKey: 'chronic-conditions/what-is-included' },
 *         { title: 'Why it matters',  contentKey: 'chronic-conditions/why-it-matters' },
 *         { title: 'Data notes',      contentKey: 'chronic-conditions/data-notes' },
 *       ]
 *     }
 *   }
 *
 * To edit card text: open the matching .md file in /content/category-cards/.
 * To add a card: create a new .md file and add an entry to the `cards` array.
 * No component code changes needed for either.
 *
 * NOTES:
 * - Server component — content is read at render time via getCategoryCardContent
 * - Uses MarkdownRenderer (client component) for the card body
 */

import { getCategoryCardContent } from '@/lib/utils/getCategoryCardContent';
import MarkdownRenderer from '@/components/content/MarkdownRenderer';

function InfoCard({ title, content }) {
  if (!content) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-2 min-w-0">
      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
        {title}
      </p>
      <div className="text-sm text-gray-600 leading-relaxed">
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
}

export default function CategoryInfoCards({ cards = [] }) {
  const resolved = cards.map((card) => ({
    key:     card.contentKey,
    title:   card.title,
    content: getCategoryCardContent(card.contentKey),
  }));

  const visible = resolved.filter(c => c.content);
  if (!visible.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {visible.map(card => (
        <InfoCard key={card.key} title={card.title} content={card.content} />
      ))}
    </div>
  );
}

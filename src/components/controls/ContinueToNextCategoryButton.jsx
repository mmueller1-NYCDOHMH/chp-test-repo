'use client';

/**
 * FILE: ContinueToNextCategoryButton.jsx
 *
 * PURPOSE:
 * EXPERIMENTAL — mobile pseudo-page navigation (see MobileCategoryContext.jsx).
 *
 * DESCRIPTION:
 * Rendered by CHPBuilder.jsx immediately after the last section of each
 * category. On mobile, while its own category is the one currently paged
 * into view, it shows a "Continue to {next category}" CTA so users
 * reaching the bottom of a category know there's more to see instead of
 * hitting a dead end. Tapping it advances pagedCategoryId — the same
 * context TopicNav's tabs use — which triggers MobileCategoryPager to
 * swap visible sections and MobileCategoryContext's own effect to scroll
 * to the next category's header.
 *
 * Renders nothing on desktop, on the last category (no next category),
 * or once a different category becomes active (avoids a dangling CTA
 * lingering after the user has already moved on via a tab tap).
 *
 * REVERT: delete this file and remove its usage in CHPBuilder.jsx.
 */
import { useMobileCategory } from '@/lib/context/MobileCategoryContext';

export default function ContinueToNextCategoryButton({ categoryId, nextCategoryId, nextLabel }) {
  const { isMobile, pagedCategoryId, setPagedCategoryId } = useMobileCategory();

  if (!isMobile || !nextCategoryId) return null;
  if (pagedCategoryId !== categoryId) return null;

  return (
    <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
      <p className="text-sm text-gray-500">You&rsquo;ve reached the end of this section</p>
      <button
        type="button"
        onClick={() => setPagedCategoryId(nextCategoryId)}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand text-white text-sm font-medium shadow-sm active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Continue to {nextLabel}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4 shrink-0">
          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 0 1 1.414 0l5 5a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414-1.414L13.586 11H4a1 1 0 1 1 0-2h9.586l-3.293-3.293a1 1 0 0 1 0-1.414Z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}

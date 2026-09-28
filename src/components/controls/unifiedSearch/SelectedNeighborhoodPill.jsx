/**
 * FILE: SelectedNeighborhoodPill.jsx
 *
 * Shown when a neighborhood is active and the user isn't editing. Mirrors
 * ComparisonNeighborhoodSelector's ComparisonPill, using the app's brand
 * color (bg-brand-tint / text-brand) instead of the comparison rust
 * palette. Keeps the "/" hint visible so the keyboard shortcut still reads
 * as available even while collapsed.
 *
 * Pin icon + chevron added so this reads as a "current location, tap to
 * change" control at a glance rather than just a colored label — matters
 * most now that this pill is also mounted directly in PageLayout's mobile
 * chrome (see PageLayout.jsx), not just inside the sidebar/bottom sheet
 * where "Find neighborhood" text above it already supplied that context.
 * Same pin path used by TopicNav's map icon / Sidebar's neighborhood tab,
 * for visual consistency with the rest of the app's "change location" cues.
 * Part of the 2026-09-04 split of UnifiedSearch.jsx.
 */
export default function SelectedNeighborhoodPill({ neighborhood, onEdit }) {
  return (
    <button
      onClick={onEdit}
      aria-label={`Viewing ${neighborhood.name}. Click to change neighborhood.`}
      aria-keyshortcuts="/"
      className="w-full flex items-center gap-2 bg-brand-tint border border-brand rounded-lg pl-3 pr-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <svg className="w-3.5 h-3.5 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
      <span className="flex-1 text-sm font-medium text-brand truncate">
        {neighborhood.name}
      </span>
      <svg className="w-3.5 h-3.5 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
      <kbd className="hidden sm:inline text-xs text-gray-600 border border-gray-200 rounded px-1 py-0.5 font-mono leading-none pointer-events-none select-none">
        /
      </kbd>
    </button>
  );
}

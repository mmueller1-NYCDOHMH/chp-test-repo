'use client';

/**
 * FILE: VerticalResizeGrip.jsx
 *
 * Horizontal "pull" grip placed under a resizable flyout block (map, mini
 * bar chart) — 2026-11-19. Same visual language as the flyout's left-edge
 * width grip in FlyoutShell.jsx (white pill, three dots), rotated.
 * Keyboard-operable splitter: role="separator", ↑/↓, Home/End.
 * Props come from useVerticalResize().gripProps, plus a `label`.
 */
export default function VerticalResizeGrip({ label, isResizing, valueNow, valueMin, valueMax, handlers, className = '' }) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      aria-valuenow={valueNow}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      {...handlers}
      data-export-exclude
      className={`group flex items-center justify-center h-4 w-full cursor-row-resize touch-none select-none focus-visible:outline-none ${className}`}
    >
      <span
        aria-hidden="true"
        className={`flex items-center justify-center gap-1 h-3 w-14 rounded-full border shadow-sm transition-colors duration-150 ${
          isResizing
            ? 'bg-brand-tint border-brand'
            : 'bg-white border-gray-400 group-hover:bg-gray-100 group-hover:border-gray-500 group-focus-visible:ring-2 group-focus-visible:ring-blue-500'
        }`}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className={`block w-1 h-1 rounded-full ${isResizing ? 'bg-brand' : 'bg-gray-500 group-hover:bg-gray-700'}`}
          />
        ))}
      </span>
    </div>
  );
}

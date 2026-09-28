'use client';

/**
 * FILE: CompareToCityToggle.jsx
 *
 * PURPOSE:
 * The "Compare to city" switch, extracted 2026-09-28 so every section that
 * shares one toggle across several charts (At a Glance pyramids, the
 * premature-death cause + cancer cards) renders the identical control.
 * Purely presentational — the parent owns the state.
 *
 * PROPS:
 *   checked  — boolean
 *   onChange — (next: boolean) => void
 */

export default function CompareToCityToggle({ checked, onChange }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-sm font-semibold text-gray-800 select-none">
        Compare to city
      </span>
      <button
        type="button"
        role="switch"
        aria-label="Compare to city" /* A11Y: accessible name matches visible label (WCAG 2.5.3) */
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
          checked ? 'bg-[var(--color-brand)] border-[var(--color-brand)]' : 'bg-gray-200 border-gray-400'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

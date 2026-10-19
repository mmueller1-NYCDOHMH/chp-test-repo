'use client';

/**
 * FILE: ChartNoteButton.jsx
 *
 * Self-contained "?" button + NotesModal (2026-09-30). For charts that don't
 * own NotesModal state themselves — e.g. ComparisonPyramidChart, which also
 * renders on the server-rendered At a Glance hero. Same button styling as
 * the standard card footer's "?".
 *
 * PROPS: title, note, sourceClean?, sourceUrl?, description?
 * Renders nothing when there's nothing to show.
 */

import { useState } from 'react';
import NotesModal from './NotesModal';
import IconHint from './IconHint';

export default function ChartNoteButton({ title, note = null, sourceClean = '', sourceUrl = null, description = null }) {
  const [open, setOpen] = useState(false);
  if (!note && !description && !sourceUrl) return null;

  return (
    <>
      <IconHint label="About this data" className="inline-flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`About this data: ${title}`}
          aria-haspopup="dialog"
          className="flex w-9 h-9 shrink-0 items-center justify-center rounded-md border border-brand text-brand hover:text-white hover:bg-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-xs font-semibold"
        >
          ?
        </button>
      </IconHint>
      <NotesModal
        open={open}
        title={title}
        sourceClean={sourceClean}
        sourceUrl={sourceUrl}
        description={description}
        note={note}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

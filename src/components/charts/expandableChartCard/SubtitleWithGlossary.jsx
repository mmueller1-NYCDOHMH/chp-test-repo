/**
 * FILE: SubtitleWithGlossary.jsx
 *
 * Renders indicator subtitle text with glossary terms turned into
 * interactive GlossaryTerm tooltips. Used on ExpandableChartCard's compact
 * subtitle line and in ExpandedChartModal's header (part of the
 * 2026-09-04 split of ExpandableChartCard.jsx).
 */

import GlossaryTerm from '@/components/content/GlossaryTerm';
import { parseGlossaryTerms } from '@/lib/glossary';

export default function SubtitleWithGlossary({ text }) {
  if (!text) return null;
  const segments = parseGlossaryTerms(text);
  return (
    <>
      {segments.map((seg, i) =>
        typeof seg === 'string'
          ? <span key={i}>{seg}</span>
          : <GlossaryTerm key={i} term={seg.term} definition={seg.definition} />
      )}
    </>
  );
}

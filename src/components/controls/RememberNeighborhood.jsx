'use client';

/**
 * FILE: RememberNeighborhood.jsx
 *
 * PURPOSE:
 * Renders nothing. Records the neighborhood being viewed so other pages can
 * link back to it by name — see lib/utils/lastNeighborhood.js.
 */

import { useEffect } from 'react';
import { rememberNeighborhood } from '@/lib/utils/lastNeighborhood';

export default function RememberNeighborhood({ id, name }) {
  useEffect(() => {
    rememberNeighborhood({ id, name });
  }, [id, name]);

  return null;
}

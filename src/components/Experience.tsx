'use client';

import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import VideoLanding from './VideoLanding';
import Deck from './Deck';
import { sections } from './Sections';
import { useMounted } from '@/lib/useMounted';

/**
 * Gate → deck.
 *
 * The gate is rendered ONLY after mount. An adversarial review verified an
 * earlier build shipped an opaque `fixed inset-0 z-50` overlay into the static
 * HTML whose only dismissal path was an onClick — so a 404'd JS chunk on shared
 * hosting, or a proxy stripping scripts, left every visitor on a black page they
 * could not get past, with the content beneath also inlined at `opacity:0`. Now
 * the server emits a plain, readable, scrollable document and the theatre is
 * layered on only once JS is definitely alive.
 *
 * There is deliberately NO "seen it already" skip. The film is the brand moment
 * and this is a single-page site, so the gate only appears on a genuine page
 * load. A sessionStorage skip meant that after entering once, every subsequent
 * reload went straight past the landing — which read as the video being broken.
 */
export default function Experience() {
  const mounted = useMounted();
  const [gate, setGate] = useState(true);

  return (
    <>
      <AnimatePresence>
        {mounted && gate && <VideoLanding key="gate" onDone={() => setGate(false)} />}
      </AnimatePresence>

      {/* Deck input stays disabled while the gate is up, or a scroll would
          advance the deck invisibly behind the still-visible landing. */}
      <Deck sections={sections} enabled={mounted && !gate} />
    </>
  );
}

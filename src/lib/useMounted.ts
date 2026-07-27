'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

/**
 * useLayoutEffect on the client, useEffect on the server (where it would warn).
 * Layout timing matters here: it runs BEFORE paint, so components that swap from
 * a plain visible render to an animated one never flash.
 */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * False during SSR and the first render, true immediately after mount.
 *
 * Every entrance animation on this site is gated on this. Motion serialises its
 * `initial`/`animate` target into the server HTML as an inline style — so an
 * un-gated `initial={{opacity:0}}` ships `style="opacity:0"` into the static
 * export, and any failure to hydrate (a 404'd chunk on shared hosting, a proxy
 * stripping scripts) leaves that content permanently invisible. An adversarial
 * review caught exactly that shipping in an earlier build.
 *
 * Rule for this codebase: render plain and visible until mounted, then animate.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useIsomorphicLayoutEffect(() => setMounted(true), []);
  return mounted;
}

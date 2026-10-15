'use client';

import { waLink } from '@/lib/config';

/**
 * The one door, as a plain link.
 *
 * Client component only for the counter ping: wa.me is off-site, so without it
 * there is no way to know the button is ever used. Same fire-and-forget beacon
 * as the window on /choice (see nginx.conf, `location ~ ^/e/`). It cannot delay
 * or block the navigation, and the link works identically if it fails or if JS
 * never arrives.
 */
export default function WhatsApp({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={waLink}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => navigator.sendBeacon?.('/e/whatsapp')}
    >
      {children}
    </a>
  );
}

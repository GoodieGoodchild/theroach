import Link from 'next/link';
import { brand } from '@/lib/config';
import WhatsApp from './WhatsApp';

/**
 * The same way around on every page.
 *
 * The site used to have no navigation at all: a film, then a deck you could
 * only move through in order, then a street of unlabelled windows. The client's
 * verdict was "too mysterious", and this is most of the answer — you can always
 * see what is here and get to it in one tap.
 *
 * Desktop: a sticky bar. Phone: the bar keeps the mark and the WhatsApp button,
 * and the sections move to a tab bar under the thumb, the way an app does it.
 *
 * Server-rendered and CSS-only. Nothing here waits for JS.
 */

const NAV = [
  { href: '/#guide', label: 'Things to do', short: 'Guide', icon: 'compass' },
  { href: '/#culture', label: '420 culture', short: 'Culture', icon: 'leaf' },
  { href: '/blog/', label: 'Journal', short: 'Journal', icon: 'book' },
  { href: '/potcast/', label: 'PotCast', short: 'PotCast', icon: 'mic' },
  { href: '/#club', label: 'The club', short: 'Club', icon: 'circle' },
] as const;

type IconName = (typeof NAV)[number]['icon'];

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2 5-5 2 2-5z" />
      </>
    ),
    leaf: (
      <>
        <path d="M12 21v-7" />
        <path d="M12 14c-3-1-6-4-6.5-8 3 .5 5.5 3 6.5 6" />
        <path d="M12 14c3-1 6-4 6.5-8-3 .5-5.5 3-6.5 6" />
        <path d="M12 12c-1.500-2.500-1.500-6 0-9 1.500 3 1.500 6.500 0 9" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.500C6.500 4.500 9.500 4.500 12 6v13c-2.500-1.500-5.500-1.500-8-.5z" />
        <path d="M20 5.500C17.500 4.500 14.500 4.500 12 6v13c2.500-1.500 5.500-1.500 8-.5z" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5.500 11.500a6.500 6.500 0 0 0 13 0M12 18v3" />
      </>
    ),
    circle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

export default function SiteHeader() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b hairline bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3 outline-none" aria-label="The Roach — home">
            {/* The client's own wordmark, never redrawn. */}
            <img
              src="/img/wordmark-640.webp"
              alt="The Roach"
              width={640}
              height={145}
              className="h-8 w-auto select-none sm:h-9"
              draggable={false}
            />
          </Link>

          <nav aria-label="Main" className="ml-auto hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="font-display text-[13px] tracking-[0.08em] text-bone/75 outline-none transition-colors hover:text-gold-lit focus-visible:text-gold-lit"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <span
              className="rounded-full border border-gold/35 px-2.5 py-1 font-display text-[11px] tracking-[0.1em] text-gold"
              title={`Adults only — strictly ${brand.minimumAge}+`}
            >
              {brand.minimumAge}+
            </span>
            <WhatsApp className="rounded-full bg-gold px-4 py-2 whitespace-nowrap font-display text-[13px] font-medium tracking-[0.04em] text-ink outline-none transition-colors hover:bg-gold-lit focus-visible:ring-2 focus-visible:ring-gold-lit focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
              WhatsApp<span className="hidden sm:inline"> us</span>
            </WhatsApp>
          </div>
        </div>
      </header>

      {/* Phone tab bar. Fixed under the thumb; the footer pads itself to clear it. */}
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-ink/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                className="flex flex-col items-center gap-1 py-2.5 text-bone/65 outline-none transition-colors hover:text-gold-lit focus-visible:text-gold-lit"
              >
                <Icon name={n.icon} />
                <span className="font-display text-[10px] tracking-[0.06em]">{n.short}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

import Link from 'next/link';
import { brand } from '@/lib/config';

const LINKS = [
  { href: '/#guide', label: 'Things to do' },
  { href: '/#culture', label: '420 culture' },
  { href: '/blog/', label: 'The Daily Roach' },
  { href: '/potcast/', label: 'PotCast' },
  { href: '/story/', label: 'Our story' },
  { href: '/choice/', label: 'The street' },
];

/**
 * Shared footer. Carries the compliance line on every page it appears on — it
 * has to be readable without following a link.
 *
 * `pb-28` below `lg` clears the phone tab bar in SiteHeader.
 */
export default function SiteFooter() {
  return (
    <footer className="border-t hairline px-5 pt-14 pb-28 sm:px-8 lg:pb-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-4">
          <img
            src="/img/badge-320.webp"
            alt=""
            width={320}
            height={320}
            className="w-16 select-none"
            loading="lazy"
            draggable={false}
          />
          <p className="text-[15px] leading-relaxed text-bone/70">
            {brand.name} — {brand.strapline.toLowerCase()}.
            <br />
            {brand.town}, Garden Route, South Africa.
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-3">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="text-[15px] text-bone/75 outline-none transition-colors hover:text-gold-lit focus-visible:text-gold-lit"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <ul className="space-y-3 text-[15px]">
          <li>
            <a
              href={brand.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-bone/75 outline-none transition-colors hover:text-gold-lit focus-visible:text-gold-lit"
            >
              Instagram
            </a>
          </li>
          <li>
            <a
              href={`mailto:${brand.email}`}
              className="text-bone/75 outline-none transition-colors hover:text-gold-lit focus-visible:text-gold-lit"
            >
              {brand.email}
            </a>
          </li>
        </ul>
      </div>

      <p className="mx-auto mt-12 max-w-6xl text-[13px] leading-relaxed text-bone/65">
        The Roach is a private adult collective. Nothing is offered for sale on this website.
        Strictly {brand.minimumAge}+. Enjoyed in private, as the law intends.
      </p>
    </footer>
  );
}

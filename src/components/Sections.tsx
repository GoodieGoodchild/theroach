'use client';

import { motion, useReducedMotion } from 'motion/react';
import { brand, waLink } from '@/lib/config';
import { useMounted } from '@/lib/useMounted';
import type { Section } from './Deck';

/**
 * Children rise and settle in sequence once their section blooms in.
 * Renders plain until mounted — see useMounted for why that is not optional.
 */
function Stagger({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  if (reduce || !mounted) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.25 + delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <Stagger>
      <span className="font-display text-[11px] font-light tracking-[0.5em] text-gold uppercase">
        {children}
      </span>
    </Stagger>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <Stagger delay={0.08}>
      <h2 className="foil mt-6 font-display text-3xl font-extralight tracking-wide sm:text-5xl">
        {children}
      </h2>
    </Stagger>
  );
}

function Rule() {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  if (reduce || !mounted) return <div className="rule-gold mx-auto mt-8 w-40" />;
  return (
    <motion.div
      className="rule-gold mx-auto mt-8 w-40"
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 1.1, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}

function Body({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <Stagger delay={0.22 + delay}>
      <p className="text-base font-light leading-relaxed text-bone/75 sm:text-lg">{children}</p>
    </Stagger>
  );
}

/**
 * The story. This copy IS the site — fifteen years, the organic standard, what
 * the name means, and the private-collective framing that keeps the whole thing
 * the right side of the line. No prices, no products, no shopfront language.
 */
export const sections: Section[] = [
  {
    id: 'open',
    node: (
      <div className="text-center">
        <Kicker>Knysna · Garden Route · South Africa</Kicker>
        <Stagger delay={0.08}>
          <h1 className="foil mt-7 font-display text-4xl font-extralight tracking-wide sm:text-7xl">
            Made to be passed on.
          </h1>
        </Stagger>
        <Rule />
        {/* SEO: the page has to say what it IS. It previously never used the word
            "cannabis" anywhere in the body — only "the plant" — so it could not
            rank for the one phrase the domain's whole history is built on
            ("Cannabis Club in Knysna", still how Google's index describes it).
            Naming the category is not an offer to sell; it is what makes the
            page defensible AND findable. Keep these nouns. */}
        <Body>
          The Roach is a private cannabis collective in Knysna, on South Africa’s Garden
          Route. Fifteen years of quiet, organic craft. No shortcuts. No poison. No noise.
        </Body>
      </div>
    ),
  },
  {
    id: 'roots',
    node: (
      <div className="text-center">
        <Kicker>01 · The roots</Kicker>
        <Title>Long before the name, there was a garden.</Title>
        <Rule />
        <div className="mt-8 space-y-5">
          <Body>
            Fifteen-odd years ago, in the wet green quiet outside Knysna, somebody planted something
            and refused to spray it. That refusal became a habit. The habit became a standard. The
            standard became The Roach.
          </Body>
          <Body delay={0.08}>Don’t panic — it’s organic. It always has been.</Body>
        </div>
      </div>
    ),
  },
  {
    id: 'craft',
    node: (
      <div className="text-center">
        <Kicker>02 · The craft</Kicker>
        <Title>We grow the way the forest grows. Slowly.</Title>
        <Rule />
        <div className="mt-8 space-y-5">
          <Body>
            Small batches. Living soil. Hands, not machines. Cured until it’s ready — not until it’s
            Friday.
          </Body>
          <Body delay={0.08}>
            Most of what we do takes longer than it needs to. That’s how you know it’s ours.
          </Body>
        </div>
      </div>
    ),
  },
  {
    id: 'name',
    node: (
      <div className="text-center">
        <Kicker>03 · The name</Kicker>
        <Title>Named after the part that gets passed.</Title>
        <Rule />
        <div className="mt-8 space-y-5">
          <Body>
            A roach is what’s left when a joint has done its work — the stub at the end, the proof
            that it went around the circle.
          </Body>
          <Body delay={0.08}>
            We didn’t name ourselves after the plant. We named ourselves after the sharing.
          </Body>
        </div>
        <Stagger delay={0.42}>
          <p className="font-serif mt-10 text-2xl font-light italic text-gold-lit/90 sm:text-3xl">
            “Proof that it went around.”
          </p>
        </Stagger>
      </div>
    ),
  },
  {
    id: 'collective',
    node: (
      <div className="text-center">
        <Kicker>04 · The collective</Kicker>
        <Title>Not a shop. A circle.</Title>
        <Rule />
        <div className="mt-8 space-y-5">
          <Body>
            The Roach is a private cannabis club in the old sense of the word — a collective of
            adults in Knysna who take the plant seriously and take the stigma apart. Education
            over hype. Craft over volume. Garden Route grown, Western Cape born.
          </Body>
          <Body delay={0.08}>
            Membership is by introduction. Nothing is sold here, and nothing ever has a price on
            it. If you know, you know. If you don’t — ask.
          </Body>
        </div>
      </div>
    ),
  },
  {
    id: 'line',
    node: (
      <div className="text-center">
        <Kicker>The line</Kicker>
        <Title>The circle is one message wide.</Title>
        <Rule />
        <Body>
          No storefront. No catalogue. Just a conversation — where it’s always been, person to
          person.
        </Body>

        <Stagger delay={0.4}>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative mt-12 inline-flex items-center gap-4 rounded-full border border-gold/50 bg-ink-2 px-10 py-5 outline-none transition-colors duration-500 hover:border-gold focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <span
              aria-hidden
              className="ember absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(closest-side, transparent 60%, rgba(255,122,46,0.14) 82%, transparent)',
              }}
            />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="relative text-gold">
              <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5v-.5c-.1-.1-.7-1.5-.9-2.1-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1.1 2.8 1.2 3c.1.2 2.1 3.2 5 4.4.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Z" />
            </svg>
            <span className="relative font-display text-sm font-light tracking-[0.35em] text-gold-lit uppercase">
              Open WhatsApp
            </span>
          </a>
        </Stagger>

        <Stagger delay={0.5}>
          <div className="mt-14 flex flex-col items-center gap-5">
            <img
              src="/img/badge-320.webp"
              alt="The Roach — crafted for the collective"
              width={320}
              height={320}
              className="w-20 select-none opacity-90"
              loading="lazy"
              draggable={false}
            />
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              <a
                href={brand.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-[11px] tracking-[0.3em] text-bone/60 uppercase outline-none transition-colors hover:text-gold focus-visible:text-gold"
              >
                Instagram
              </a>
              <span className="h-1 w-1 rounded-full bg-gold/40" aria-hidden />
              <a
                href={`mailto:${brand.email}`}
                className="font-display text-[11px] tracking-[0.3em] text-bone/60 lowercase outline-none transition-colors hover:text-gold focus-visible:text-gold"
              >
                {brand.email}
              </a>
              <span className="h-1 w-1 rounded-full bg-gold/40" aria-hidden />
              <span className="font-display text-[11px] tracking-[0.3em] text-bone/60 uppercase">
                {brand.town} · Garden Route
              </span>
            </div>
            <p className="max-w-md text-xs font-light leading-relaxed text-bone/65">
              The Roach is a private adult collective. Nothing is offered for sale on this website.
              Strictly {brand.minimumAge}+. Enjoyed in private, as the law intends.
            </p>
          </div>
        </Stagger>
      </div>
    ),
  },
];

import Link from 'next/link';
import { brand } from '@/lib/config';
import { publishedPosts } from '@/lib/blog';
import { publishedEpisodes, show } from '@/lib/potcast';
import { CALENDAR, ETIQUETTE, GLOSSARY, LAW, THINGS, TOWNS } from '@/lib/guide';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import HeroFilm from '@/components/site/HeroFilm';
import ThingsToDo from '@/components/site/ThingsToDo';
import WhatsApp from '@/components/site/WhatsApp';

/**
 * Home — the guide.
 *
 * This page used to be a film you had to get past and a deck you could only
 * read in order. The client's verdict was "too mysterious": a visitor could not
 * tell what The Roach was or what there was to do here. So the home page now
 * says what it is in the first sentence, and then gives people things to do:
 * a guide to the Garden Route, how 420 culture works on this coast, the journal,
 * the podcast, and how the club works.
 *
 * The film and the story deck are not gone — they live at /story/.
 *
 * Deliberately a plain, scrolling, server-rendered document. Nothing animates
 * in, so nothing can ship hidden (README → "Progressive enhancement").
 *
 * COPY RULES STILL APPLY, and matter more now that there is more copy: no
 * price, buy, order, menu, delivery, stock or shop — in ANY sense, including
 * the innocent ones a travel guide reaches for. See README → "Copy rules".
 */

const btnGold =
  'inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 font-display text-[15px] font-medium tracking-[0.02em] text-ink outline-none transition-colors hover:bg-gold-lit focus-visible:ring-2 focus-visible:ring-gold-lit focus-visible:ring-offset-2 focus-visible:ring-offset-ink';
const btnLine =
  'inline-flex items-center justify-center rounded-full border border-gold/50 px-6 py-3 font-display text-[15px] tracking-[0.02em] text-gold-lit outline-none transition-colors hover:border-gold-lit focus-visible:border-gold-lit';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-[11px] tracking-[0.2em] text-gold uppercase sm:text-[12px] sm:tracking-[0.28em]">
      {children}
    </p>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-4 font-display text-[32px] leading-[1.15] font-light text-bone sm:text-[44px]">
      {children}
    </h2>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-bone/80">{children}</p>;
}

export default function Page() {
  const posts = publishedPosts().slice(0, 2);
  const episode = publishedEpisodes()[0];

  return (
    <>
      <SiteHeader />

      <main>
        {/* ── What this is, in one screen ─────────────────────────────────── */}
        <section className="px-5 pt-8 pb-16 sm:px-8 sm:pt-14 lg:pb-24">
          <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
            {/* Text first in the DOM, so on a phone the first screen says what
                this is. The film sits beside it on a wide screen, below it on a
                narrow one. */}
            <div>
              <Eyebrow>
                {brand.town} · Garden Route · South Africa
              </Eyebrow>
              {/* SEO: the h1 names what the entity IS — "cannabis club", Knysna,
                  Garden Route — the phrase the domain's history is built on.
                  Keep those nouns. */}
              <h1 className="mt-5 font-display text-[38px] leading-[1.1] font-light text-bone sm:text-[56px]">
                Knysna’s <span className="foil">cannabis club</span>, and a local’s guide to the
                Garden Route.
              </h1>
              <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-bone/80 sm:text-[19px]">
                The Roach is a private, members-only cannabis collective in Knysna. Fifteen years of
                slow, organic growing. This is where we share the rest of it: what to do on this
                coast, how 420 culture works here, and how to find us.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#guide" className={btnGold}>
                  Things to do
                </a>
                <a href="#club" className={btnLine}>
                  How the club works
                </a>
              </div>

              <dl className="mt-10 grid gap-x-8 gap-y-5 border-t hairline pt-7 sm:grid-cols-3">
                {[
                  ['What', 'A private cannabis club for adults, 18+'],
                  ['Where', 'Knysna, in the middle of the Garden Route'],
                  ['How', 'By introduction. It starts with a WhatsApp'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-display text-[12px] tracking-[0.22em] text-gold uppercase">
                      {k}
                    </dt>
                    <dd className="mt-1.5 text-[16px] leading-snug text-bone/85">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <HeroFilm />
          </div>
        </section>

        {/* ── Four ways in ────────────────────────────────────────────────── */}
        <section className="px-5 sm:px-8" aria-label="Explore">
          <ul className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                href: '#guide',
                kicker: `${THINGS.length} places · ${TOWNS.length} towns`,
                title: 'Things to do',
                body: 'Forests, lagoons, markets and long walks, from Mossel Bay to Tsitsikamma.',
              },
              {
                href: '#culture',
                kicker: 'The law · the manners · the words',
                title: '420 culture',
                body: 'What is legal, what is not, and how a circle behaves on this coast.',
              },
              {
                href: '/blog/',
                kicker: 'Journal',
                title: 'The Daily Roach',
                body: 'Notes from the circle: the craft, the culture, the days that don’t go to plan.',
              },
              {
                href: '/potcast/',
                kicker: 'Podcast · weekly',
                title: 'PotCast',
                body: 'Bra met ’n Bek. Late-night thoughts, real conversations, raw truth.',
              },
            ].map((d) => (
              <li key={d.href} className="flex">
                <Link href={d.href} className="card flex w-full flex-col p-6 outline-none">
                  <span className="text-[13px] text-gold">{d.kicker}</span>
                  <span className="mt-3 font-display text-[24px] font-normal text-bone">
                    {d.title}
                  </span>
                  <span className="mt-2 text-[16px] leading-relaxed text-bone/75">{d.body}</span>
                  <span aria-hidden className="mt-auto pt-5 text-[20px] text-gold-lit">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Things to do ────────────────────────────────────────────────── */}
        <section id="guide" className="anchor px-5 pt-24 sm:px-8 lg:pt-32">
          <div className="mx-auto max-w-6xl">
            <Eyebrow>The guide</Eyebrow>
            <H2>Things to do on the Garden Route</H2>
            <Lead>
              {THINGS.length} places we would send a friend, west to east along the N2. None of
              them is a place to light up. That part is for home. These are the places worth being
              in afterwards, or instead.
            </Lead>

            <div className="mt-12">
              <ThingsToDo />
            </div>

            <h3 className="mt-20 font-display text-[24px] font-normal text-bone">
              Through the year
            </h3>
            <ul className="mt-6 grid gap-x-8 gap-y-7 border-t hairline pt-7 sm:grid-cols-2 lg:grid-cols-4">
              {CALENDAR.map((c) => (
                <li key={c.what}>
                  <p className="font-display text-[12px] tracking-[0.22em] text-gold uppercase">
                    {c.when}
                  </p>
                  <p className="mt-2 font-display text-[18px] text-bone">{c.what}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-bone/70">{c.note}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── 420 culture ─────────────────────────────────────────────────── */}
        <section
          id="culture"
          className="anchor mt-24 border-y hairline bg-forest px-5 py-20 sm:px-8 lg:mt-32 lg:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <Eyebrow>The culture</Eyebrow>
            <H2>420 culture on the Garden Route</H2>
            <Lead>
              People have grown dagga in these hills for a very long time, and mostly kept quiet
              about it. The law changed in 2018. The manners did not need to. Here is how weed
              works on this coast, said plainly.
            </Lead>

            <h3 className="mt-14 font-display text-[24px] font-normal text-bone">
              The law, in plain words
            </h3>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {LAW.map((l) => (
                <li key={l.title} className="card p-6">
                  <p
                    className={`font-display text-[12px] tracking-[0.22em] uppercase ${
                      l.verdict === 'yes' ? 'text-moss' : 'text-ember'
                    }`}
                  >
                    {l.verdict === 'yes' ? '✓ Legal' : '✕ Not legal'}
                  </p>
                  <p className="mt-3 font-display text-[19px] text-bone">{l.title}</p>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-bone/75">{l.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-3xl text-[14px] leading-relaxed text-bone/65">
              There is no legal retail trade in recreational cannabis in South Africa, which is why
              a club like ours is private and members-only. This is a plain-language summary, not
              legal advice.
            </p>

            <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-20">
              <div>
                <h3 className="font-display text-[24px] font-normal text-bone">
                  How a circle behaves
                </h3>
                <ol className="mt-6 space-y-6">
                  {ETIQUETTE.map((e, n) => (
                    <li key={e.rule} className="flex gap-5">
                      <span className="font-serif text-[30px] leading-none text-gold italic">
                        {n + 1}
                      </span>
                      <div>
                        <p className="font-display text-[18px] text-bone">{e.rule}</p>
                        <p className="mt-1.5 text-[16px] leading-relaxed text-bone/75">{e.why}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h3 className="font-display text-[24px] font-normal text-bone">
                  The words you’ll hear
                </h3>
                <dl className="mt-6 divide-y divide-gold/15 border-y border-gold/15">
                  {GLOSSARY.map((g) => (
                    <div key={g.word} className="grid grid-cols-[6.5rem_1fr] gap-4 py-4">
                      <dt className="font-serif text-[22px] leading-tight text-gold-lit italic">
                        {g.word}
                      </dt>
                      <dd className="text-[16px] leading-relaxed text-bone/75">{g.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div className="mt-16 flex flex-col items-start gap-5 border-t hairline pt-10 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-serif max-w-xl text-[24px] leading-snug text-bone/90 italic">
                We didn’t name ourselves after the plant. We named ourselves after the sharing.
              </p>
              <Link href="/story/" className={btnLine}>
                Watch our story
              </Link>
            </div>
          </div>
        </section>

        {/* ── From the circle: journal + podcast ──────────────────────────── */}
        <section className="px-5 pt-24 sm:px-8 lg:pt-32">
          <div className="mx-auto max-w-6xl">
            <Eyebrow>From the circle</Eyebrow>
            <H2>Read it, or listen to it</H2>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {posts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}/`}
                  className="card flex flex-col overflow-hidden outline-none"
                >
                  {p.image && (
                    <img
                      src={p.image}
                      alt=""
                      width={1600}
                      height={1200}
                      loading="lazy"
                      className="h-48 w-full object-cover"
                    />
                  )}
                  <span className="flex flex-1 flex-col p-6">
                    <span className="text-[13px] text-gold">
                      The Daily Roach ·{' '}
                      {new Date(p.date).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="mt-3 font-display text-[20px] leading-snug text-bone">
                      {p.title}
                    </span>
                    <span className="mt-2.5 text-[15px] leading-relaxed text-bone/75">
                      {p.blurb}
                    </span>
                  </span>
                </Link>
              ))}

              <Link
                href={episode ? `/potcast/${episode.slug}/` : '/potcast/'}
                className="card flex flex-col p-6 outline-none"
              >
                <span className="text-[13px] text-gold">
                  {show.name} · {episode ? `Episode ${episode.number}` : 'Coming soon'}
                </span>
                <span className="font-serif mt-6 text-[30px] leading-tight text-gold-lit italic">
                  {episode ? episode.title : show.tagline}
                </span>
                <span className="mt-4 text-[15px] leading-relaxed text-bone/75">
                  {episode ? episode.blurb : show.strap}
                </span>
                <span className="mt-auto pt-6 text-[14px] text-bone/65">
                  {show.tagline}. {show.strap}
                </span>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/blog/" className={btnLine}>
                All journal entries
              </Link>
              <Link href="/potcast/" className={btnLine}>
                All episodes
              </Link>
            </div>
          </div>
        </section>

        {/* ── The club ────────────────────────────────────────────────────── */}
        <section id="club" className="anchor px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <Eyebrow>The club</Eyebrow>
            <H2>Not a counter. A circle.</H2>
            <Lead>
              Most people meet good weed by accident: a friend of a friend, no idea where it came
              from or what went on it. A collective is the opposite of that accident. You know the
              grower. You know the soil. You can ask what happened between the seed and your hand,
              and get a straight answer.
            </Lead>

            <ol className="mt-12 grid gap-4 lg:grid-cols-3">
              {[
                [
                  'Say hello',
                  'One WhatsApp message. A person answers, not a form. Tell us who you are.',
                ],
                [
                  'Get introduced',
                  'Membership is by introduction, and for adults only. Strictly 18 and over, no exceptions.',
                ],
                [
                  'Join the circle',
                  'From there it is private, person to person, the way it has always been. Nothing happens on this website.',
                ],
              ].map(([t, b], n) => (
                <li key={t} className="card p-7">
                  <span className="font-serif text-[40px] leading-none text-gold italic">
                    {n + 1}
                  </span>
                  <p className="mt-4 font-display text-[21px] text-bone">{t}</p>
                  <p className="mt-2.5 text-[16px] leading-relaxed text-bone/75">{b}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <WhatsApp className={btnGold}>Say hello on WhatsApp</WhatsApp>
              <p className="text-[15px] text-bone/70">
                Or write to{' '}
                <a
                  href={`mailto:${brand.email}`}
                  className="text-gold-lit underline underline-offset-4 outline-none hover:text-gold focus-visible:text-gold"
                >
                  {brand.email}
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

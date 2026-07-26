// Public marketing landing page, built to the "Kickoff Landing" design handoff.
//
// Renders OUTSIDE the app shell (`components/Layout`) — it has its own sticky header, its own
// white/#f7f8f7 scale, and no acting-user chrome. See `App.tsx` for the route split.
//
// Two deliberate departures from the prototype, both noted in the handoff as the implementer's
// call:
//   1. The prototype is desktop-only (`min-width:1080px`). A public marketing page can't be, so
//      every section stacks down to mobile. Desktop renders exactly as designed.
//   2. The CTAs all route to the real auth pages — see SIGN_UP_TO / SIGN_IN_TO below.

import { Link } from "react-router-dom";

const SIGN_UP_TO = "/signup";
const SIGN_IN_TO = "/login";

// Creative Commons photography hot-linked from Wikimedia Commons, carried over from the
// prototype. Replace with licensed photography before this page goes public.
const PHOTO = {
  hero: "https://commons.wikimedia.org/wiki/Special:FilePath/Boys%20playing%20soccer%20on%20the%20street%20in%20Chefchaouen%20Morocco.jpg?width=1100",
  step1:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Can%20you%20score%20a%20goal%2C%20kiddo%3F.jpg?width=1000",
  step2:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Team%20Morocco%20at%202026%20FIFA%20World%20Cup%20by%20YantsImages.jpg?width=1000",
  step3:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Street%20Football%20Morocco.jpg?width=1000",
  soccer:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Street%20Football%20Morocco.jpg?width=900",
  tennis:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Wickford%20Tennis%20Club.jpg?width=800",
  paddle:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Kith%20Ivy%20padel%20court%20in%20Vanderbilt%20Hall%2C%20September%202025.jpg?width=900",
};

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#do", label: "What you can do" },
  { href: "#sports", label: "Sports" },
  { href: "#voices", label: "Player stories" },
];

const HERO_AVATARS = [
  { initials: "RC", bg: "#147A49" },
  { initials: "ML", bg: "#111111" },
  { initials: "DO", bg: "#8a8f8a" },
  { initials: "JT", bg: "#0f6a3f" },
];

const STATS = [
  { value: "20k+", label: "Active players" },
  { value: "40", label: "Cities" },
  { value: "8,500", label: "Matches made" },
  { value: "4.9★", label: "Avg rating" },
];

const FEATURES = [
  {
    icon: "🥅",
    title: "Find opponents",
    desc: "Post your team's open slot and match against another squad at your level.",
  },
  {
    icon: "👥",
    title: "Join a team",
    desc: "Browse rosters recruiting near you and apply to become a regular.",
  },
  {
    icon: "📅",
    title: "Post availability",
    desc: "Set when and where you're free — captains find and invite you.",
  },
  {
    icon: "⚡",
    title: "Grab a sub spot",
    desc: "One player short? Fill last-minute guest spots in a single tap.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Post or browse",
    desc: "Say when you're free, or scroll open matches, teams and sub spots near you.",
    img: PHOTO.step1,
    alt: "A player lining up a shot on goal",
  },
  {
    n: "2",
    title: "Get matched",
    desc: "Accept a request or apply. Both sides confirm and the match locks in.",
    img: PHOTO.step2,
    alt: "A team lined up together before a match",
  },
  {
    n: "3",
    title: "Show up & play",
    desc: "Meet at the venue, play, then rate each other to keep the community reliable.",
    img: PHOTO.step3,
    alt: "Players in a street football match",
  },
];

const SPORTS = [
  { icon: "⚽", title: "Soccer", desc: "5-a-side to full 11s, casual to competitive leagues." },
  { icon: "🎾", title: "Tennis", desc: "Singles and doubles, matched by NTRP level." },
  { icon: "🎾", title: "Paddle", desc: "Find a fourth or a rival pair for your next set." },
];

const QUOTES = [
  {
    body: "Moved to Austin knowing no one. Had a regular 7-a-side within a week.",
    name: "Marcus D.",
    meta: "Soccer · Austin",
    initials: "MD",
    bg: "#147A49",
  },
  {
    body: "Our team was always a player short. Now we fill the spot in minutes.",
    name: "Priya S.",
    meta: "Captain · Dallas",
    initials: "PS",
    bg: "#111111",
  },
  {
    body: "The ratings mean people actually show up. No more ghosted matches.",
    name: "Leo V.",
    meta: "Paddle · Miami",
    initials: "LV",
    bg: "#0f6a3f",
  },
];

const FOOTER_COLS = [
  { heading: "Product", links: ["How it works", "Discover", "Teams", "Availability"] },
  { heading: "Sports", links: ["Soccer", "Tennis", "Paddle"] },
  { heading: "Company", links: ["About", "Contact", "Terms", "Privacy"] },
];

// --- small building blocks ----------------------------------------------------

const CONTAINER = "mx-auto w-full max-w-[1180px] px-8";

function Wordmark({ size = "lg" }: { size?: "lg" | "sm" }) {
  const chip =
    size === "lg"
      ? "h-[34px] w-[34px] rounded-[9px] text-[20px]"
      : "h-[30px] w-[30px] rounded-[9px] text-[18px]";
  const word = size === "lg" ? "text-xl" : "text-lg";
  return (
    <div className="flex flex-none items-center gap-[11px]">
      <div
        className={`${chip} flex items-center justify-center bg-brand font-display leading-none text-white`}
      >
        K
      </div>
      <div className={`${word} font-display tracking-[0.01em]`}>Kickoff</div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[13px] font-extrabold uppercase tracking-[.08em] text-brand">
      {children}
    </div>
  );
}

/** Centered eyebrow + H2 block that opens most sections. */
function SectionHeading({
  eyebrow,
  title,
  className = "",
}: {
  eyebrow: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={`mx-auto text-center ${className}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="m-0 text-[30px] font-extrabold leading-[1.08] tracking-[-0.025em] sm:text-[40px]">
        {title}
      </h2>
    </div>
  );
}

function Avatar({
  initials,
  bg,
  size,
  className = "",
}: {
  initials: string;
  bg: string;
  size: number;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-none items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.34) }}
    >
      {initials}
    </div>
  );
}

/** The tinted rounded square behind every emoji icon on this page. */
function IconChip({ children, size }: { children: React.ReactNode; size: 44 | 46 }) {
  return (
    <div
      className="flex flex-none items-center justify-center rounded-xl bg-landing-tint"
      style={{ width: size, height: size, fontSize: size === 46 ? 22 : 21 }}
    >
      {children}
    </div>
  );
}

function Photo({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
}

// --- sections -----------------------------------------------------------------

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-landing-line bg-white/[.86] backdrop-blur-[12px]">
      <div className={`${CONTAINER} flex h-[70px] items-center gap-[30px]`}>
        <Wordmark />
        <nav className="hidden items-center gap-7 text-sm font-semibold text-landing-body lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-inherit hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to={SIGN_IN_TO}
            className="rounded-btn px-4 py-2.5 text-sm font-bold text-landing-body hover:bg-landing-hover hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            to={SIGN_UP_TO}
            className="inline-flex items-center gap-[7px] rounded-btn bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-btn-brand transition duration-150 hover:-translate-y-px hover:brightness-[1.06] hover:text-white"
          >
            Sign up
            <span className="-mt-px text-[15px] leading-none">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      className={`${CONTAINER} grid grid-cols-1 items-center gap-14 pb-[30px] pt-[76px] lg:grid-cols-[1.06fr_.94fr]`}
    >
      <div>
        <div className="mb-[22px] inline-flex items-center gap-2 rounded-full bg-landing-tint px-[13px] py-1.5 text-[12.5px] font-bold text-brand">
          <span className="h-[7px] w-[7px] rounded-full bg-brand" />
          Soccer · Tennis · Paddle
        </div>
        <h1 className="m-0 mb-5 text-[40px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[52px] lg:text-[60px]">
          Find your next
          <br />
          match. Instantly.
        </h1>
        <p className="m-0 mb-8 max-w-[490px] text-[19px] leading-[1.5] text-landing-body">
          Kickoff connects you with opponents, teams, and last-minute sub spots near you. Post when
          you're free, get matched, show up and play.
        </p>
        <div className="mb-[34px] flex flex-wrap gap-3">
          <Link
            to={SIGN_UP_TO}
            className="inline-flex items-center gap-[9px] rounded-cta bg-brand px-7 py-4 text-base font-bold text-white shadow-btn-brand-lg transition duration-150 hover:-translate-y-0.5 hover:brightness-[1.06] hover:text-white"
          >
            Get started — it's free
            <span className="text-[17px] leading-none">→</span>
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-2.5 rounded-cta border border-landing-line-strong bg-white px-6 py-4 text-base font-bold text-ink transition duration-150 hover:border-landing-line-hover hover:bg-landing-hover-soft hover:text-ink"
          >
            <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-landing-tint text-[10px] text-brand">
              ▶
            </span>
            See how it works
          </a>
        </div>
        <div className="flex items-center gap-[15px]">
          <div className="flex">
            {HERO_AVATARS.map((a) => (
              <Avatar
                key={a.initials}
                initials={a.initials}
                bg={a.bg}
                size={38}
                className="-ml-2.5 border-[2.5px] border-white"
              />
            ))}
          </div>
          <div className="text-[13.5px] leading-[1.35] text-landing-body">
            <b className="text-ink">20,000+ players</b>
            <br />
            matched across 40 cities
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="aspect-[4/5] overflow-hidden rounded-photo shadow-hero">
          <Photo src={PHOTO.hero} alt="Players in a street football match in Chefchaouen, Morocco" />
        </div>
        <div className="absolute left-0 top-11 flex animate-floaty items-center gap-[11px] rounded-[14px] bg-white px-4 py-[13px] shadow-float-card lg:-left-[26px]">
          <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-brand text-base font-extrabold text-white">
            ⚽
          </div>
          <div>
            <div className="text-[13px] font-extrabold">Match confirmed</div>
            <div className="text-[11.5px] text-muted">Sat 6:00 PM · Zilker Park</div>
          </div>
        </div>
        <div
          className="absolute bottom-[50px] right-0 animate-floaty rounded-[14px] bg-white px-4 py-[13px] shadow-float-card lg:-right-[22px]"
          style={{ animationDelay: "1.4s" }}
        >
          <div className="mb-[5px] text-[11.5px] font-semibold text-muted">Looking for a sub</div>
          <div className="flex items-center gap-2">
            <Avatar initials="RC" bg="#111111" size={26} />
            <div className="text-[13px] font-bold">1 spot left →</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className={`${CONTAINER} pb-[52px] pt-5`}>
      <div className="flex flex-wrap items-center justify-center gap-x-11 gap-y-6 border-y border-landing-divider py-[22px]">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-[30px] font-extrabold tracking-[-0.02em]">{s.value}</div>
            <div className="text-[13px] font-semibold text-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhatYouCanDo() {
  return (
    <section id="do" className={`${CONTAINER} pb-5 pt-10`}>
      <SectionHeading
        eyebrow="One app, four ways to play"
        title="However you want to get on the court, Kickoff has a match for it."
        className="mb-11 max-w-[640px]"
      />
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-feature border border-landing-line bg-white px-[22px] pb-6 pt-[26px] transition-shadow duration-200 hover:shadow-card-hover"
          >
            <div className="mb-[18px]">
              <IconChip size={46}>{f.icon}</IconChip>
            </div>
            <div className="mb-2 text-[17px] font-extrabold">{f.title}</div>
            <div className="text-sm leading-[1.5] text-muted">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="mt-[70px] bg-landing-band">
      <div className={`${CONTAINER} py-[78px]`}>
        <SectionHeading
          eyebrow="How it works"
          title="From open slot to kickoff in three steps."
          className="mb-[54px] max-w-[600px]"
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="overflow-hidden rounded-step border border-landing-line bg-white"
            >
              <div className="aspect-[16/11]">
                <Photo src={s.img} alt={s.alt} />
              </div>
              <div className="p-6">
                <div className="mb-[11px] flex items-center gap-[11px]">
                  <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white">
                    {s.n}
                  </div>
                  <div className="text-[18px] font-extrabold">{s.title}</div>
                </div>
                <div className="text-[14.5px] leading-[1.55] text-muted">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BuiltForYourSport() {
  return (
    <section id="sports" className={`${CONTAINER} py-20`}>
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <Eyebrow>Built for your sport</Eyebrow>
          <h2 className="m-0 mb-[18px] text-[30px] font-extrabold leading-[1.1] tracking-[-0.025em] sm:text-[38px]">
            Three sports. One community that actually shows up.
          </h2>
          <p className="m-0 mb-[26px] text-[16.5px] leading-[1.55] text-landing-body">
            Skill levels, ratings, and no-show tracking keep every match competitive and reliable —
            whether you play elevens on grass or doubles on a paddle court.
          </p>
          <div className="flex flex-col gap-3.5">
            {SPORTS.map((s) => (
              <div key={s.title} className="flex items-center gap-3.5">
                <IconChip size={44}>{s.icon}</IconChip>
                <div>
                  <div className="text-[15.5px] font-extrabold">{s.title}</div>
                  <div className="text-[13.5px] text-muted">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 grid-rows-[200px_200px] gap-4">
          <div className="row-span-2 overflow-hidden rounded-feature">
            <Photo src={PHOTO.soccer} alt="A street football match" />
          </div>
          <div className="overflow-hidden rounded-feature">
            <Photo src={PHOTO.tennis} alt="A tennis club court" />
          </div>
          <div className="overflow-hidden rounded-feature">
            <Photo src={PHOTO.paddle} alt="An indoor padel court" />
          </div>
        </div>
      </div>
    </section>
  );
}

function PlayerStories() {
  return (
    <section id="voices" className="bg-landing-band">
      <div className={`${CONTAINER} py-[78px]`}>
        <SectionHeading
          eyebrow="Player stories"
          title="New city, new team, same game."
          className="mb-12 max-w-[600px]"
        />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {QUOTES.map((q) => (
            <div
              key={q.name}
              className="rounded-feature border border-landing-line bg-white p-7"
            >
              <div className="mb-3.5 text-[15px] tracking-[2px] text-brand">★★★★★</div>
              <div className="mb-[22px] text-[15.5px] leading-[1.6] text-landing-quote">
                "{q.body}"
              </div>
              <div className="flex items-center gap-3">
                <Avatar initials={q.initials} bg={q.bg} size={42} />
                <div>
                  <div className="text-[14.5px] font-extrabold">{q.name}</div>
                  <div className="text-[13px] text-muted">{q.meta}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={`${CONTAINER} py-20`}>
      <div className="relative overflow-hidden rounded-band bg-brand px-6 py-14 text-center sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-cta-stripe" />
        <h2 className="relative m-0 mb-4 text-[32px] font-extrabold leading-[1.06] tracking-[-0.025em] text-white sm:text-[44px]">
          Your next game is one tap away.
        </h2>
        <p className="relative mx-auto mb-8 max-w-[520px] text-lg text-white/85">
          Join Kickoff free and get matched to a game this week.
        </p>
        <div className="relative flex flex-wrap justify-center gap-3">
          <Link
            to={SIGN_UP_TO}
            className="inline-flex items-center gap-[9px] rounded-cta bg-white px-[30px] py-4 text-base font-extrabold text-brand shadow-cta-white transition duration-150 hover:-translate-y-0.5 hover:text-brand"
          >
            Sign up free
            <span className="text-[17px] leading-none">→</span>
          </Link>
          <Link
            to={SIGN_IN_TO}
            className="rounded-cta border-[1.5px] border-white/55 bg-white/10 px-[26px] py-4 text-base font-bold text-white transition duration-150 hover:bg-white/20 hover:text-white"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-landing-line">
      <div className={`${CONTAINER} flex flex-wrap items-start justify-between gap-10 py-[46px]`}>
        <div className="max-w-[280px]">
          <div className="mb-3.5">
            <Wordmark size="sm" />
          </div>
          <div className="text-[13.5px] leading-[1.5] text-muted">
            Find opponents, teams and sub spots for soccer, tennis and paddle.
          </div>
        </div>
        <div className="flex flex-wrap gap-x-16 gap-y-8">
          {FOOTER_COLS.map((c) => (
            <div key={c.heading}>
              <div className="mb-3.5 text-xs font-extrabold uppercase tracking-[.06em] text-faint">
                {c.heading}
              </div>
              <div className="flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <a key={l} href="#" className="text-sm font-medium text-landing-body hover:text-ink">
                    {l}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-landing-divider">
        <div className={`${CONTAINER} py-5 text-[13px] text-faint`}>
          © 2026 Kickoff. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <TrustStrip />
      <WhatYouCanDo />
      <HowItWorks />
      <BuiltForYourSport />
      <PlayerStories />
      <FinalCta />
      <Footer />
    </div>
  );
}

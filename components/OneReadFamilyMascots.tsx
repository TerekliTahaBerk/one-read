import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

type MascotProps = {
  name: string;
  description: string;
  index: number;
  href?: string;
  children: ReactNode;
};

const mascotStyle = (index: number) =>
  ({
    "--family-arrival-delay": `${520 + index * 130}ms`,
    "--family-object-delay": `${760 + index * 130}ms`,
    "--family-idle-delay": `${index * -1.3}s`,
  }) as CSSProperties;

function Mascot({
  name,
  description,
  index,
  href,
  children,
}: MascotProps) {
  const content = (
    <>
      <div className="family-mascot-figure mx-auto h-[8.75rem] w-[8.75rem] sm:h-[9.25rem] sm:w-[9.25rem]">
        {children}
      </div>
      <h3 className="mt-3 font-serif text-[1.05rem] font-medium leading-tight tracking-[-0.01em] text-ink">
        {name}
      </h3>
      <p className="mt-1 font-sans text-[11.5px] leading-[1.45] text-fog sm:text-[12px]">
        {description}
      </p>
    </>
  );

  const className =
    "family-mascot rounded-2xl py-2 text-center transition-opacity duration-200";

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${name} — ${description}`}
        className={`${className} focus-ring group hover:opacity-75`}
        style={mascotStyle(index)}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={className} style={mascotStyle(index)}>
      {content}
    </div>
  );
}

function CharacterSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 160 160"
      className="h-full w-full overflow-visible"
    >
      <g
        fill="none"
        stroke="#1A1A1A"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}

function Face({ lookX = 0, lookY = 0 }: { lookX?: number; lookY?: number }) {
  return (
    <g className="mascot-eyes">
      <ellipse cx="66" cy="75" rx="11" ry="14" fill="#FFFFFF" strokeWidth="1.5" />
      <ellipse cx="91" cy="75" rx="11" ry="14" fill="#FFFFFF" strokeWidth="1.5" />
      <circle className="mascot-pupil" cx={68 + lookX} cy={78 + lookY} r="3.8" fill="#1A1A1A" stroke="none" />
      <circle className="mascot-pupil" cx={89 + lookX} cy={78 + lookY} r="3.8" fill="#1A1A1A" stroke="none" />
    </g>
  );
}

export function OneArticleMascotArt() {
  return (
    <CharacterSvg>
      <path d="M53 103c-7 13-9 23-9 35M44 138l-9 1" strokeWidth="3" />
      <path d="M102 106c-7 11-15 20-24 29" strokeWidth="3" />
      <path className="article-foot-tap" d="M78 135l7 5" strokeWidth="3" />
      <path d="M48 93C34 88 32 72 41 63c-5-12 5-23 18-21 5-13 20-16 29-7 12-7 25 1 24 15 12 4 16 18 8 27 7 11 0 25-13 27-7 12-23 13-32 4-11 7-25 0-27-15Z" fill="#1A1A1A" strokeWidth="2.5" />
      <Face lookX={-1.5} lookY={2} />
      <path className="article-arm-left" d="M49 91c-8 3-13 9-16 17" strokeWidth="3" />
      <path className="article-arm-right" d="M107 92c-12 4-20 11-25 22" strokeWidth="3" />
      <g className="family-object">
        <path d="M24 100l22-7 10 31-22 7Z" fill="#DCEAF5" strokeWidth="2.5" />
        <path d="M46 93l-4 8 10-3M33 108l13-4M36 115l12-4M38 122l10-3" strokeWidth="1.8" />
      </g>
    </CharacterSvg>
  );
}

export function OneFilmMascotArt() {
  return (
    <CharacterSvg>
      <path d="M55 106c-6 13-7 23-6 34M101 105c9 8 17 14 27 17M49 140l-9 2M128 122l4 8" strokeWidth="3" />
      <path className="film-arms" d="M51 54c-3-12 2-22 12-29M108 53c2-13-2-23-12-31" strokeWidth="3" />
      <path d="M46 103c-12-6-14-21-6-30-7-10 0-23 12-24 1-14 15-21 27-14 10-10 27-5 30 9 14 0 21 15 13 26 9 10 4 26-9 30-4 13-20 18-31 10-10 9-27 5-31-8Z" fill="#1A1A1A" strokeWidth="2.5" />
      <Face lookY={-2} />
      <g className="family-object">
        <path d="M56 17h47v24H56Z" fill="#E8DFF0" strokeWidth="2.5" />
        <path className="film-clapper-top" d="M54 10l47-5 2 11-47 5Z" fill="#E8DFF0" strokeWidth="2.5" />
        <path d="M65 9l7 9M81 7l7 9M68 23v12M84 23v12" strokeWidth="1.8" />
      </g>
      <g className="film-action-lines" strokeWidth="2">
        <path d="M47 6l-5-5" />
        <path d="M108 4l4-6" />
        <path d="M113 13l7-1" />
      </g>
    </CharacterSvg>
  );
}

function GoalMascot() {
  return (
    <CharacterSvg>
      <path d="M54 104c-9 12-13 22-13 34M102 106c7 5 13 10 18 15M41 138l-9 1M120 121l8 2" strokeWidth="3" />
      <path d="M47 83c-12 2-19 10-21 21 7 0 13 3 17 9M109 87c8 3 14 9 18 18" strokeWidth="3" />
      <path d="M44 100c-11-8-10-24-1-32-5-12 4-24 17-24 4-13 20-18 30-9 12-7 27 1 27 15 12 5 15 20 6 29 5 13-5 26-19 26-8 10-24 10-32 1-11 6-24-1-28-6Z" fill="#1A1A1A" strokeWidth="2.5" />
      <Face lookX={2} lookY={2} />
      <g className="family-object">
        <circle cx="130" cy="127" r="17" fill="#DCECDC" strokeWidth="2.5" />
        <path d="m130 118 7 5-3 8h-8l-3-8 7-5ZM117 123l6 1M137 123l8-3M124 131l-3 8M135 131l3 7" strokeWidth="1.8" />
      </g>
    </CharacterSvg>
  );
}

function NewsMascot() {
  return (
    <CharacterSvg>
      <path d="M57 105c-3 13-2 24 1 34M101 105c5 12 8 23 8 34M58 139l-8 4M109 139l8 3" strokeWidth="3" />
      <path d="M48 88c-12-7-17-18-13-29M35 59l-8-4M35 59l-2-9M109 90c8 0 14-4 19-12" strokeWidth="3" />
      <path d="M46 102c-13-7-14-23-5-32-6-12 3-24 16-24 3-14 18-20 29-12 11-8 27-1 28 13 13 3 18 18 10 28 7 12-1 26-15 28-6 12-23 14-32 4-11 7-25 1-31-5Z" fill="#1A1A1A" strokeWidth="2.5" />
      <Face lookX={2} />
      <g className="family-object">
        <ellipse cx="132" cy="68" rx="9" ry="12" fill="#F3E6B8" strokeWidth="2.5" />
        <path d="M130 80l-5 16M129 85l-8-3M124 66h16M127 61h10" strokeWidth="2.5" />
      </g>
    </CharacterSvg>
  );
}

export function OneReadFamilyMascots() {
  return (
    <section
      id="family"
      aria-labelledby="family-heading"
      className="mt-12 w-full scroll-mt-8 border-t border-line/80 pt-9 text-center sm:mt-14 sm:pt-10"
    >
      <h2
        id="family-heading"
        className="font-serif text-[1.8rem] font-medium leading-tight tracking-[-0.02em] text-ink sm:text-[2.15rem]"
      >
        Meet the OneRead family.
      </h2>
      <p className="mx-auto mt-3 max-w-[46ch] font-sans text-[14px] leading-[1.65] text-ash sm:text-[15px]">
        Each one does a single job quietly, then gets out of the way.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-9 sm:mt-10 sm:grid-cols-4 sm:gap-x-4">
        <Mascot name="OneArticle" description="Weekday article brief" index={0} href="/article">
          <OneArticleMascotArt />
        </Mascot>
        <Mascot name="OneFilm" description="Saturday film note" index={1} href="/film">
          <OneFilmMascotArt />
        </Mascot>
        <Mascot
          name="OneGoal"
          description="Coming soon — register interest"
          index={2}
          href="/waitlist?product=onegoal"
        >
          <GoalMascot />
        </Mascot>
        <Mascot
          name="OneNews"
          description="Coming soon — register interest"
          index={3}
          href="/waitlist?product=onenews"
        >
          <NewsMascot />
        </Mascot>
      </div>
    </section>
  );
}

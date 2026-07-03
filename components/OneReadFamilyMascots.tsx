import type { CSSProperties, ReactNode } from "react";

type MascotProps = {
  name: string;
  description: string;
  index: number;
  children: ReactNode;
};

const mascotStyle = (index: number) =>
  ({
    "--family-arrival-delay": `${520 + index * 130}ms`,
    "--family-object-delay": `${760 + index * 130}ms`,
    "--family-idle-delay": `${index * -1.3}s`,
  }) as CSSProperties;

function Mascot({ name, description, index, children }: MascotProps) {
  return (
    <div className="family-mascot text-center" style={mascotStyle(index)}>
      <div className="family-mascot-figure mx-auto h-[8.75rem] w-[8.75rem] sm:h-[9.25rem] sm:w-[9.25rem]">
        {children}
      </div>
      <h3 className="mt-3 font-serif text-[1.05rem] font-medium leading-tight tracking-[-0.01em] text-ink">
        {name}
      </h3>
      <p className="mt-1 font-sans text-[11.5px] leading-[1.45] text-fog sm:text-[12px]">
        {description}
      </p>
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
        <path d="M51 105c-8 14-10 24-12 34M105 106c8 13 11 23 14 33M39 139l-8 3M119 139l8 2" strokeWidth="3" />
        {children}
      </g>
    </svg>
  );
}

function Face() {
  return (
    <g className="mascot-eyes">
      <ellipse cx="66" cy="75" rx="11" ry="14" fill="#FFFFFF" strokeWidth="1.5" />
      <ellipse cx="91" cy="75" rx="11" ry="14" fill="#FFFFFF" strokeWidth="1.5" />
      <circle cx="68" cy="78" r="3.8" fill="#1A1A1A" stroke="none" />
      <circle cx="89" cy="78" r="3.8" fill="#1A1A1A" stroke="none" />
    </g>
  );
}

function ArticleMascot() {
  return (
    <CharacterSvg>
      <path d="M48 93C34 88 32 72 41 63c-5-12 5-23 18-21 5-13 20-16 29-7 12-7 25 1 24 15 12 4 16 18 8 27 7 11 0 25-13 27-7 12-23 13-32 4-11 7-25 0-27-15Z" fill="#1A1A1A" strokeWidth="2.5" />
      <Face />
      <path d="M48 91c-10 4-17 10-22 19M109 92c8 4 15 10 19 18" strokeWidth="3" />
      <g className="family-object">
        <path d="M26 95l23-4 6 32-23 4Z" fill="#DCEAF5" strokeWidth="2.5" />
        <path d="M49 91l-5 7 11-2M34 104l13-2M36 111l12-2M37 118l10-2" strokeWidth="1.8" />
      </g>
    </CharacterSvg>
  );
}

function FilmMascot() {
  return (
    <CharacterSvg>
      <path d="M46 103c-12-6-14-21-6-30-7-10 0-23 12-24 1-14 15-21 27-14 10-10 27-5 30 9 14 0 21 15 13 26 9 10 4 26-9 30-4 13-20 18-31 10-10 9-27 5-31-8Z" fill="#1A1A1A" strokeWidth="2.5" />
      <Face />
      <path d="M47 91c-10 4-17 11-22 19M108 92c8 4 15 9 20 17" strokeWidth="3" />
      <g className="family-object">
        <path d="M24 99h31v24H24Z" fill="#E8DFF0" strokeWidth="2.5" />
        <path d="M22 92l31-6 3 11-31 6Z" fill="#E8DFF0" strokeWidth="2.5" />
        <path d="M29 91l7 8M40 89l7 8M31 105v12M42 105v12" strokeWidth="1.8" />
      </g>
    </CharacterSvg>
  );
}

function GoalMascot() {
  return (
    <CharacterSvg>
      <path d="M44 100c-11-8-10-24-1-32-5-12 4-24 17-24 4-13 20-18 30-9 12-7 27 1 27 15 12 5 15 20 6 29 5 13-5 26-19 26-8 10-24 10-32 1-11 6-24-1-28-6Z" fill="#1A1A1A" strokeWidth="2.5" />
      <Face />
      <path d="M47 91c-10 4-16 10-21 18M109 91c9 4 16 10 21 18" strokeWidth="3" />
      <g className="family-object">
        <circle cx="29" cy="108" r="17" fill="#DCECDC" strokeWidth="2.5" />
        <path d="m29 99 7 5-3 8h-8l-3-8 7-5ZM16 104l6 1M36 104l8-3M23 112l-3 8M34 112l3 7" strokeWidth="1.8" />
      </g>
    </CharacterSvg>
  );
}

function NewsMascot() {
  return (
    <CharacterSvg>
      <path d="M46 102c-13-7-14-23-5-32-6-12 3-24 16-24 3-14 18-20 29-12 11-8 27-1 28 13 13 3 18 18 10 28 7 12-1 26-15 28-6 12-23 14-32 4-11 7-25 1-31-5Z" fill="#1A1A1A" strokeWidth="2.5" />
      <Face />
      <path d="M47 91c-10 4-16 10-21 19M108 91c9 4 16 10 21 18" strokeWidth="3" />
      <g className="family-object">
        <ellipse cx="29" cy="101" rx="9" ry="12" fill="#F3E6B8" strokeWidth="2.5" />
        <path d="M31 113l5 15M27 117l8-3M21 99h16M24 94h10" strokeWidth="2.5" />
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
        <Mascot name="OneArticle" description="Weekday article brief" index={0}>
          <ArticleMascot />
        </Mascot>
        <Mascot name="OneFilm" description="Saturday film note" index={1}>
          <FilmMascot />
        </Mascot>
        <Mascot name="OneGoal" description="Coming soon" index={2}>
          <GoalMascot />
        </Mascot>
        <Mascot name="OneNews" description="Coming soon" index={3}>
          <NewsMascot />
        </Mascot>
      </div>
    </section>
  );
}

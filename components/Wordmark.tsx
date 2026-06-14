export function Wordmark() {
  return (
    <a
      href="/"
      className="group inline-flex items-center justify-center select-none focus-ring rounded-full px-3 py-1"
      aria-label="One Read — home"
    >
      <span
        className="
          font-serif italic font-medium
          text-[12.5px] sm:text-[13px]
          tracking-wordmark uppercase
          text-ink/85
          transition-colors duration-300
          group-hover:text-ink
        "
      >
        One&nbsp;·&nbsp;Read
      </span>
    </a>
  );
}

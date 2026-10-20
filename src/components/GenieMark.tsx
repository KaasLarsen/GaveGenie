type GenieMarkProps = {
  className?: string;
  title?: string;
};

/** White/line-drawn genie mark — stroke inherits `currentColor`. */
export function GenieMark({ className, title }: GenieMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {/* Turban */}
      <path
        d="M22 18c0-5.5 4.2-10 10-10s10 4.5 10 10c0 1.2-.2 2.3-.6 3.4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M26 16.5c1.2-1.8 3.2-3 6-3 2.6 0 4.5 1.1 5.8 2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="9.5" r="1.6" stroke="currentColor" strokeWidth="1.5" />
      {/* Face */}
      <path
        d="M24 22.5c1.2 6.5 4.2 9.5 8 9.5s6.8-3 8-9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M28.2 26.2c.4.15.9.25 1.5.25M34.3 26.2c.5 0 1-.1 1.5-.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M30.2 29.2c.5.35 1.2.55 1.8.55s1.3-.2 1.8-.55"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      {/* Shoulders / arms crossed */}
      <path
        d="M18 36c3.5-3.5 8-5 14-5s10.5 1.5 14 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M22 38.5c2.8 2.2 6.2 3.5 10 3.5s7.2-1.3 10-3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M26.5 37.5 32 41.2l5.5-3.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lamp / wrist cuff hint */}
      <path
        d="M24.5 40.5c-.8 1.2-1 2.4-.6 3.4M39.5 40.5c.8 1.2 1 2.4.6 3.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Smoke / genie trail */}
      <path
        d="M28 44.5c-4 2.5-6.5 5.5-5.5 9 1.2 4 5.5 5.5 9.5 4.2 3.2-1 5.2-3.5 4.8-6.2-.3-2.2-2.2-3.5-4.3-3.2-1.6.2-2.8 1.2-3 2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M36.5 52.5c1.8 1.5 2.8 3.5 2.2 5.5-.8 2.6-3.5 3.8-6 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

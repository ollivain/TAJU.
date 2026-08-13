/**
 * The four glyphs the design draws by hand. They inherit `currentColor`, so the
 * active/inactive treatment lives with the rest of the styling in globals.css.
 */

interface IconProps {
  className?: string;
}

export function BookmarkIcon({ filled = false, className }: IconProps & { filled?: boolean }) {
  return (
    <svg
      className={className}
      width="14"
      height="17"
      viewBox="0 0 15 17"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1.4 1.3h12.2v14.2L7.5 11.2 1.4 15.5z" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ strong = false, className }: IconProps & { strong?: boolean }) {
  return (
    <svg
      className={className}
      width="17"
      height="14"
      viewBox="0 0 18 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={strong ? 2.5 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1.4 7.4 6.2 12.2 16.4 1.6" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="29"
      height="14"
      viewBox="0 0 29 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M.9 7h26.6M21.2 1.2 27.5 7l-6.3 5.8" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="6.6" cy="6.6" r="5.1" />
      <path d="M10.5 10.5 15 15" />
    </svg>
  );
}

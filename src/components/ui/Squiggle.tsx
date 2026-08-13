interface SquiggleProps {
  /** Stroke width in CSS pixels; stays constant however wide the rule stretches. */
  weight?: number;
  opacity?: number;
  className?: string;
}

const PATH =
  "M0 3.4C26 2.2 44 4.6 68 3.5 92 2.4 108 1.8 132 3.2 156 4.6 176 4.9 198 3.3 218 1.9 226 2.4 240 3.1";

/** The hand-drawn rule that separates sections instead of a border or a card. */
export function Squiggle({ weight = 1, opacity = 0.4, className }: SquiggleProps) {
  return (
    <svg
      className={className ? `squiggle ${className}` : "squiggle"}
      viewBox="0 0 240 6"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={weight}
        strokeLinecap="round"
        opacity={opacity}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

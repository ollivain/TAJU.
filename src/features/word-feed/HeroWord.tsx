import { useLayoutEffect, useRef } from "react";

const PROBE_SIZE = 100;
const ONE_LINE_MAX = 74;
const ONE_LINE_MIN = 40;
const TWO_LINE_MAX = 56;
const TWO_LINE_MIN = 38;
/**
 * Fit against a slightly narrower box than the measure. Without the slack a word
 * that mathematically just fits still wraps once rounding and hinting are applied.
 */
const FIT_SLACK = 0.957;

/** Width of the headword rendered at PROBE_SIZE, measured with the real font. */
const measureAtProbeSize = (heading: HTMLElement, word: string): number => {
  const probe = document.createElement("span");
  probe.className = "hero-word hero-word--probe";
  probe.textContent = word;
  heading.parentElement?.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
};

/**
 * Picks a display size for one headword. Ordinary words fill the measure on a
 * single line; a long compound keeps a display-sized setting and takes a second
 * line instead of shrinking to fit, which is why the sizes never scale globally.
 *
 * Fitting is the primary defence against an awkward break: if the word fits, it
 * never has to wrap and no hyphenation is needed at all. When it does wrap, the
 * break is left to the browser's own `hyphens: auto` dictionary for `lang="fi"`,
 * because Finnish compounds cannot be hyphenated correctly by rule of thumb.
 */
const fitHeroSize = (heading: HTMLElement, word: string): number | null => {
  const available = heading.clientWidth;
  const measured = measureAtProbeSize(heading, word);
  if (available <= 0 || measured <= 20) return null;

  const singleLine = ((available * FIT_SLACK) / measured) * PROBE_SIZE;
  if (singleLine >= ONE_LINE_MIN) return Math.min(ONE_LINE_MAX, singleLine);
  return Math.max(TWO_LINE_MIN, Math.min(TWO_LINE_MAX, singleLine * 1.7));
};

interface HeroWordProps {
  /** Already capitalised for display. */
  word: string;
}

export function HeroWord({ word }: HeroWordProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    let cancelled = false;
    const fit = () => {
      const size = fitHeroSize(heading, word);
      if (size === null) heading.style.removeProperty("--hero-size");
      else heading.style.setProperty("--hero-size", `${size.toFixed(1)}px`);
    };

    fit();

    // Observe the container, not the heading: its own height changes as we fit.
    const observer = new ResizeObserver(fit);
    observer.observe(heading.parentElement ?? heading);
    // Web fonts change the metrics, so remeasure once they are in.
    void document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [word]);

  // The headword is rendered verbatim: no injected soft hyphens, so the visible
  // text and the accessible name are the same clean word.
  return (
    <h1 ref={headingRef} className="hero-word" lang="fi">
      {word}
    </h1>
  );
}

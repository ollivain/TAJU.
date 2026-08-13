/**
 * Displacement filter that gives the display headings their slightly rough,
 * printed edge. Mounted once in the shell; referenced from CSS as url(#taju-rough).
 */
export function RoughEdgeDefs() {
  return (
    <svg className="rough-defs" aria-hidden="true" focusable="false">
      <defs>
        <filter
          id="taju-rough"
          x="-6%"
          y="-14%"
          width="112%"
          height="128%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.055 0.075"
            numOctaves="4"
            seed="9"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="3.2"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

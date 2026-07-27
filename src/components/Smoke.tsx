/**
 * CSS smoke — blurred radial wisps drifting up from a fixed origin.
 * Configs are HARDCODED, not random: Math.random() at render time causes
 * SSR/hydration mismatches. Determinism is the feature.
 */
const WISPS = [
  { size: 26, left: -6, delay: 0, dur: 7.5, drift: 18, peak: 0.4 },
  { size: 18, left: 2, delay: 1.6, dur: 8.5, drift: -14, peak: 0.32 },
  { size: 32, left: -14, delay: 3.1, dur: 9.5, drift: 26, peak: 0.28 },
  { size: 14, left: 8, delay: 4.4, dur: 7, drift: -22, peak: 0.36 },
  { size: 22, left: -2, delay: 5.8, dur: 8, drift: 12, peak: 0.3 },
];

export default function Smoke({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute ${className}`}>
      {WISPS.map((w, i) => (
        <span
          key={i}
          className="wisp"
          style={
            {
              width: w.size,
              height: w.size * 1.4,
              left: w.left,
              bottom: 0,
              '--wisp-delay': `${w.delay}s`,
              '--wisp-dur': `${w.dur}s`,
              '--wisp-drift': `${w.drift}px`,
              '--wisp-peak': w.peak,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

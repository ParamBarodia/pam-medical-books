// PageFlipEngine — a tiny page-turn motion engine for the Archive Viewer.
//
// Rejected libraries: StPageFlip (jQuery-shaped, ~30KB, prebuilt 3D),
// Framer Motion's AnimatePresence (overkill — only one transition), and
// GSAP (paid licence for commercial use).
//
// What it does:
//   • Drives the existing CSS .is-peeling animation on the current page.
//   • Tweens the global --grain-bend custom property up during the turn,
//     so the body::after coarse grain catches more light along the fold.
//   • Honors prefers-reduced-motion (instant swap, no peel).
//   • Different durations for user-driven (1100ms — savor) and
//     auto-advance (820ms — quicker, doesn't intrude on reading) turns.
//
// What it DOES NOT do (yet):
//   • Drive the clip-path itself — that lives in global.css. The engine
//     just toggles classes; CSS owns the motion. This keeps the engine
//     under 60 lines and makes the motion editable without JS changes.
//
// Used by: components.jsx Hero.

// Auto and manual share the same duration today — the CSS keyframes for
// .is-peeling are fixed at 1100ms. Splitting them would require driving
// the CSS animation-duration from JS, which is a future improvement once
// the design has settled. The 'mode' parameter is kept so call sites can
// express intent without needing to know the timing detail.
const DEFAULTS = {
  durationAuto:   1100,
  durationManual: 1100,
  grainPeak:      0.62,
};

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Sets the global --grain-bend CSS var. Uses requestAnimationFrame to
// drive a custom ease so the grain "breathes" with the page turn:
//   0 → peak at the mid-point → 0 at the end.
function tweenGrain(peak, duration) {
  if (typeof document === 'undefined') return () => {};
  const root = document.documentElement;
  const t0 = performance.now();
  let raf;
  const tick = (now) => {
    const t = Math.min(1, (now - t0) / duration);
    // sine bell: 0 → 1 → 0
    const eased = Math.sin(Math.PI * t);
    root.style.setProperty('--grain-bend', String(eased * peak));
    if (t < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      root.style.setProperty('--grain-bend', '0');
    }
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    root.style.setProperty('--grain-bend', '0');
  };
}

export function pageFlip({ mode = 'auto', onMid, onEnd, grainPeak } = {}) {
  const opts = { ...DEFAULTS, grainPeak: grainPeak ?? DEFAULTS.grainPeak };
  const duration = mode === 'manual' ? opts.durationManual : opts.durationAuto;
  // Reduced-motion: skip the peel entirely, just call onMid then onEnd.
  if (prefersReducedMotion()) {
    onMid?.();
    setTimeout(() => onEnd?.(), 20);
    return { cancel() {} };
  }
  const stopGrain = tweenGrain(opts.grainPeak, duration);
  // Content swap happens at ~50% — the peel reveals the underlying page
  // by then, so the next chapter has settled before the fold finishes.
  const midT = setTimeout(() => onMid?.(), duration * 0.5);
  const endT = setTimeout(() => onEnd?.(), duration);
  return {
    cancel() {
      clearTimeout(midT);
      clearTimeout(endT);
      stopGrain();
    },
    duration,
  };
}

"use client";

import { createElement, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/*
  The hero's blueprint: the championship drafted as line work in the margin
  of the page.

  Nothing here sits under text or the student tiles. The section gets a
  faint drafting grid, and each sketch is laid out by flexbox in the empty
  run of space beside a line of content, so it can never collide with it:

    International  ⟶ a code window       (Build)
    Skill          ⟶ podium and trophy   (the win)
    Championship   ⟶ a puzzle cube       (Solve)
    2026           ⟶ rocket to a globe   (Lead, and "International")
    the buttons    ⟶ a play card         (Create)

  All strokes, no fills, in the site's purple and teal. On load they draw
  themselves on in one top-to-bottom sweep; reduced-motion users get the
  finished sheet.
*/

const SHAPES = {
  path: motion.path,
  circle: motion.circle,
  ellipse: motion.ellipse,
  rect: motion.rect,
  line: motion.line,
  polyline: motion.polyline,
  polygon: motion.polygon,
} as const;

type Shape = keyof typeof SHAPES;

type DrawProps<S extends Shape> = ComponentProps<S> & {
  as: S;
  /** Seconds before this stroke starts drawing. */
  delay?: number;
  /** Seconds the stroke takes to draw. */
  dur?: number;
  still: boolean;
};

/** One stroke of the sketch, drawn on from nothing unless motion is off. */
function Draw<S extends Shape>({ as, delay = 0, dur = 0.8, still, ...rest }: DrawProps<S>) {
  if (still) return createElement(as, rest);
  const M = SHAPES[as] as React.ComponentType<Record<string, unknown>>;
  return (
    <M
      {...rest}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{
        pathLength: { delay, duration: dur, ease: [0.4, 0, 0.2, 1] },
        opacity: { delay, duration: 0.2 },
      }}
    />
  );
}

/** A four-point sparkle that pops in once the stroke it decorates is drawn. */
function Sparkle({ x, y, r, delay, still }: { x: number; y: number; r: number; delay: number; still: boolean }) {
  const d = `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`;
  const cls = "fill-accent-yellow stroke-none";
  if (still) return <path d={d} className={cls} />;
  return (
    <motion.path
      d={d}
      className={cls}
      style={{ transformOrigin: `${x}px ${y}px`, transformBox: "fill-box" }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: "spring", stiffness: 380, damping: 14 }}
    />
  );
}

/*
  Whether to hold motion still. `useReducedMotion` is null on the server and
  true on a reduced-motion client's first render, so branching on it
  directly hydrates a different tree than was served. Reading a "hydrated"
  flag through useSyncExternalStore keeps the first client render identical
  to the server's, then flips to the still version. The hero shares it for
  the same reason.
*/
const noop = () => () => {};
export function useStill() {
  const reduce = useReducedMotion();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated && reduce === true;
}

/**
 * One sketch, filling its slot's height and hugging its left edge.
 * `stroke` is in viewBox units, chosen per sketch so it renders near 1.5px.
 */
function Sheet({ viewBox, stroke, children }: { viewBox: string; stroke: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox={viewBox}
      preserveAspectRatio="xMinYMid meet"
      className="absolute inset-0 h-full w-full overflow-visible"
    >
      <g
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary"
        style={{ strokeOpacity: 0.32 }}
      >
        {children}
      </g>
    </svg>
  );
}

/** The drafting grid under the whole section. */
export function SketchGrid() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 -z-10 h-full w-full">
      <defs>
        <pattern id="isc-grid-minor" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" className="stroke-primary" strokeWidth="0.6" strokeOpacity="0.09" />
        </pattern>
        <pattern id="isc-grid-major" width="240" height="240" patternUnits="userSpaceOnUse">
          <path d="M240 0H0V240" fill="none" className="stroke-primary" strokeWidth="0.9" strokeOpacity="0.13" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#isc-grid-minor)" />
      <rect width="100%" height="100%" fill="url(#isc-grid-major)" />
    </svg>
  );
}

/** Build: a code window. */
export function SketchCode() {
  const still = useStill();
  return (
    <Sheet viewBox="0 0 120 60" stroke={2}>
      <Draw as="rect" still={still} delay={0.2} dur={0.9} x={1} y={1} width={118} height={58} rx={8} />
      <Draw as="line" still={still} delay={0.6} dur={0.4} x1={1} y1={16} x2={119} y2={16} />
      <Draw as="circle" still={still} delay={0.8} dur={0.3} cx={10} cy={8.5} r={2.2} />
      <Draw as="circle" still={still} delay={0.85} dur={0.3} cx={18} cy={8.5} r={2.2} />
      <Draw as="circle" still={still} delay={0.9} dur={0.3} cx={26} cy={8.5} r={2.2} />
      <Draw as="polyline" still={still} delay={0.95} dur={0.45} points="44,27 32,38 44,49" className="stroke-accent-teal" />
      <Draw as="polyline" still={still} delay={1.05} dur={0.45} points="76,27 88,38 76,49" className="stroke-accent-teal" />
      <Draw as="line" still={still} delay={1.15} dur={0.4} x1={66} y1={24} x2={54} y2={52} />
    </Sheet>
  );
}

/** The win: a three-step podium with the trophy on the top step. */
export function SketchPodium() {
  const still = useStill();
  return (
    <Sheet viewBox="0 0 300 100" stroke={1.9}>
      {/* ground, as a construction line */}
      <Draw as="line" still={still} delay={0.45} dur={1} x1={0} y1={98} x2={300} y2={98} strokeDasharray="5 7" />
      {/* second place */}
      <Draw as="polyline" still={still} delay={0.55} dur={0.7} points="20,98 20,55 100,55 100,98" />
      <Draw as="polyline" still={still} delay={0.85} dur={0.4} points="20,55 32,47 112,47 100,55" />
      {/* first place */}
      <Draw as="polyline" still={still} delay={0.65} dur={0.8} points="100,98 100,40 190,40 190,98" />
      <Draw as="polyline" still={still} delay={0.95} dur={0.4} points="100,40 112,32 202,32 190,40" />
      <Draw as="line" still={still} delay={1.05} dur={0.3} x1={202} y1={32} x2={202} y2={60} />
      {/* third place */}
      <Draw as="polyline" still={still} delay={0.75} dur={0.6} points="190,98 190,68 270,68 270,98" />
      <Draw as="polyline" still={still} delay={1.0} dur={0.4} points="190,68 202,60 282,60 270,68" />
      <Draw as="line" still={still} delay={1.1} dur={0.3} x1={282} y1={60} x2={282} y2={88} />
      {/* trophy */}
      <g className="stroke-accent-teal">
        <Draw as="path" still={still} delay={1.2} dur={0.8} d="M130 4h30v14c0 9-6 16-15 16s-15-7-15-16z" />
        <Draw as="path" still={still} delay={1.45} dur={0.4} d="M130 8c-6 0-9 4-7 10 1.5 5 5 6 8 6" />
        <Draw as="path" still={still} delay={1.5} dur={0.4} d="M160 8c6 0 9 4 7 10-1.5 5-5 6-8 6" />
        <Draw as="line" still={still} delay={1.65} dur={0.25} x1={145} y1={34} x2={145} y2={38} />
        <Draw as="line" still={still} delay={1.72} dur={0.3} x1={136} y1={40} x2={154} y2={40} />
      </g>
      <Sparkle x={120} y={8} r={5} delay={1.9} still={still} />
      <Sparkle x={174} y={3} r={7} delay={2.0} still={still} />
      <Sparkle x={170} y={25} r={3.5} delay={2.1} still={still} />
    </Sheet>
  );
}

/** Solve: an isometric puzzle cube, three by three on every face. */
export function SketchCube() {
  const still = useStill();
  const grid = [
    // top face
    "29,19.7 68,42.3",
    "42,12.3 81,34.7",
    "29,34.7 68,12.3",
    "42,42.3 81,19.7",
    // left face
    "16,42.3 55,65",
    "16,57.7 55,80",
    "29,34.7 29,80.3",
    "42,42.3 42,87.7",
    // right face
    "55,65 94,42.3",
    "55,80 94,57.7",
    "68,42.3 68,87.7",
    "81,34.7 81,80.3",
  ];
  return (
    <Sheet viewBox="0 0 110 100" stroke={2.4}>
      <Draw as="polygon" still={still} delay={0.9} dur={1} points="55,5 94,27 94,73 55,95 16,73 16,27" />
      <Draw as="polyline" still={still} delay={1.3} dur={0.6} points="16,27 55,50 94,27" />
      <Draw as="line" still={still} delay={1.4} dur={0.4} x1={55} y1={50} x2={55} y2={95} />
      {grid.map((pts, i) => (
        <Draw
          key={pts}
          as="polyline"
          still={still}
          delay={1.5 + i * 0.06}
          dur={0.5}
          points={pts}
          className="stroke-accent-teal"
        />
      ))}
    </Sheet>
  );
}

/** Lead: a rocket on a dashed trajectory, bound for a wireframe globe. */
export function SketchRocket() {
  const still = useStill();
  const G = { x: 365, y: 50, r: 42 };
  const lat = [-0.72, -0.36, 0.36, 0.72].map((k) => ({
    cy: G.y + G.r * k,
    rx: Math.sqrt(1 - k * k) * G.r,
    ry: Math.sqrt(1 - k * k) * G.r * 0.24,
  }));
  return (
    <Sheet viewBox="0 0 420 100" stroke={1.9}>
      {/* trajectory */}
      <Draw
        as="path"
        still={still}
        delay={1.1}
        dur={1.4}
        d="M6 82C60 82 92 64 140 56S250 40 322 50"
        strokeDasharray="4 9"
        className="stroke-accent-teal"
      />
      {/* the rocket, nose toward the globe */}
      <g transform="translate(112 42) rotate(68) scale(0.62)">
        <Draw as="path" still={still} delay={1.45} dur={0.8} d="M0 0c0-30 12-52 30-64 18 12 30 34 30 64v18H0z" />
        <Draw as="circle" still={still} delay={1.75} dur={0.4} cx={30} cy={-24} r={8} className="stroke-accent-teal" />
        <Draw as="path" still={still} delay={1.85} dur={0.4} d="M0 4l-14 20v14l14-10" />
        <Draw as="path" still={still} delay={1.9} dur={0.4} d="M60 4l14 20v14l-14-10" />
        <Draw as="path" still={still} delay={2.0} dur={0.4} d="M18 18l6 18 6-10 6 10 6-18" className="stroke-accent-yellow" />
      </g>
      {/* the globe */}
      <Draw as="circle" still={still} delay={1.4} dur={1.2} cx={G.x} cy={G.y} r={G.r} />
      <Draw as="ellipse" still={still} delay={1.6} dur={1} cx={G.x} cy={G.y} rx={G.r * 0.3} ry={G.r} />
      <Draw as="ellipse" still={still} delay={1.7} dur={1} cx={G.x} cy={G.y} rx={G.r * 0.68} ry={G.r} />
      <Draw as="line" still={still} delay={1.5} dur={0.7} x1={G.x} y1={G.y - G.r} x2={G.x} y2={G.y + G.r} />
      <Draw as="line" still={still} delay={1.8} dur={0.7} x1={G.x - G.r} y1={G.y} x2={G.x + G.r} y2={G.y} />
      {lat.map((l, i) => (
        <Draw key={l.cy} as="ellipse" still={still} delay={1.85 + i * 0.08} dur={0.8} cx={G.x} cy={l.cy} rx={l.rx} ry={l.ry} />
      ))}
      {/* a few vertices lit: the places the students come from */}
      <Draw as="circle" still={still} delay={2.3} dur={0.3} cx={G.x - G.r * 0.68} cy={G.y} r={2.4} className="stroke-accent-teal" />
      <Draw as="circle" still={still} delay={2.36} dur={0.3} cx={G.x + G.r * 0.3} cy={G.y - G.r * 0.36} r={2.4} className="stroke-accent-teal" />
      <Draw as="circle" still={still} delay={2.42} dur={0.3} cx={G.x - G.r * 0.3} cy={G.y + G.r * 0.36} r={2.4} className="stroke-accent-teal" />
      {/* orbit ring */}
      <Draw
        as="ellipse"
        still={still}
        delay={2.2}
        dur={1.1}
        cx={G.x}
        cy={G.y}
        rx={G.r * 1.32}
        ry={G.r * 0.34}
        transform={`rotate(-18 ${G.x} ${G.y})`}
        strokeDasharray="8 10"
        className="stroke-accent-teal"
      />
      <Sparkle x={G.x + G.r * 1.1} y={G.y - G.r * 1.05} r={6} delay={2.6} still={still} />
    </Sheet>
  );
}

/** Create: a play card. */
export function SketchPlay() {
  const still = useStill();
  return (
    <Sheet viewBox="0 0 90 60" stroke={1.6}>
      <Draw as="rect" still={still} delay={1.9} dur={0.8} x={1} y={1} width={88} height={58} rx={10} />
      <Draw as="polygon" still={still} delay={2.3} dur={0.5} points="36,17 58,30 36,43" className="stroke-accent-pink" />
      <Draw as="line" still={still} delay={2.45} dur={0.4} x1={14} y1={50} x2={76} y2={50} strokeDasharray="2 5" />
    </Sheet>
  );
}

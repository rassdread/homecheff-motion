"use client";

import { UNIVERSE_BRAND } from "@/lib/universe-home-config";
import { UNIVERSE_GLOBE_SPHERICAL_CLASS } from "@/lib/universe-public-landing";

type UniverseGlobeProps = {
  reducedMotion?: boolean;
  size?: "hero" | "compact";
};

/** Stylized equirectangular land masses — HomeCheff green on blue ocean */
function GlobeMapStrip() {
  return (
    <svg viewBox="0 0 720 180" className="h-full w-[200%] min-w-[200%]" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="globe-ocean-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={UNIVERSE_BRAND.blue} />
          <stop offset="55%" stopColor="#0a5a8a" />
          <stop offset="100%" stopColor="#043a5c" />
        </linearGradient>
      </defs>
      <rect width="720" height="180" fill="#0a5a8a" />
      <rect width="720" height="180" fill="url(#globe-ocean-gradient)" opacity="0.85" />

      {/* Americas */}
      <path
        d="M72 48 C88 38 102 42 108 58 C112 72 104 88 96 102 C88 118 78 128 68 120 C58 108 54 88 58 68 C62 54 66 50 72 48 Z
           M88 108 C96 118 98 132 92 142 C86 152 78 148 74 136 C70 122 78 112 88 108 Z"
        fill={UNIVERSE_BRAND.green}
        opacity="0.92"
      />
      {/* Europe + Africa */}
      <path
        d="M318 42 C334 36 348 44 352 58 C356 72 348 82 340 88 C332 94 322 90 318 78 C314 64 310 50 318 42 Z
           M328 88 C340 92 348 108 346 128 C344 148 332 158 320 152 C308 144 304 120 312 100 C318 90 322 86 328 88 Z"
        fill="#0a8a6f"
        opacity="0.9"
      />
      {/* Asia */}
      <path
        d="M388 36 C428 28 468 38 492 52 C512 64 520 78 508 92 C496 104 468 108 442 100 C416 92 392 78 384 62 C380 50 382 42 388 36 Z
           M448 92 C468 98 478 112 472 128 C466 142 450 148 436 138 C422 128 424 108 436 98 C440 94 444 92 448 92 Z"
        fill={UNIVERSE_BRAND.green}
        opacity="0.88"
      />
      {/* Australia + islands */}
      <path
        d="M548 118 C568 112 588 118 596 128 C604 138 594 148 578 148 C562 148 548 138 544 128 C542 122 544 120 548 118 Z
           M620 68 C632 64 642 70 644 78 C646 86 638 92 628 90 C618 88 614 78 618 70 C619 68 620 68 620 68 Z"
        fill="#0a8a6f"
        opacity="0.85"
      />
      {/* Secondary land (repeat segment for seamless scroll) */}
      <g transform="translate(360,0)">
        <path
          d="M72 48 C88 38 102 42 108 58 C112 72 104 88 96 102 C88 118 78 128 68 120 C58 108 54 88 58 68 C62 54 66 50 72 48 Z"
          fill={UNIVERSE_BRAND.green}
          opacity="0.92"
        />
        <path
          d="M318 42 C334 36 348 44 352 58 C356 72 348 82 340 88 C332 94 322 90 318 78 C314 64 310 50 318 42 Z"
          fill="#0a8a6f"
          opacity="0.9"
        />
        <path
          d="M388 36 C428 28 468 38 492 52 C512 64 520 78 508 92 C496 104 468 108 442 100 C416 92 392 78 384 62 C380 50 382 42 388 36 Z"
          fill={UNIVERSE_BRAND.green}
          opacity="0.88"
        />
      </g>

      {/* Latitude lines */}
      {[36, 72, 108, 144].map((y) => (
        <line key={`lat-${y}`} x1="0" y1={y} x2="720" y2={y} className="universe-globe-latitude" />
      ))}
      {/* Longitude lines */}
      {[0, 90, 180, 270, 360, 450, 540, 630, 720].map((x) => (
        <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2="180" className="universe-globe-longitude" />
      ))}
    </svg>
  );
}

export function UniverseGlobe({ reducedMotion = false, size = "hero" }: UniverseGlobeProps) {
  const dim = size === "hero" ? "min(48vw, 460px)" : "168px";

  return (
    <div
      className={`${UNIVERSE_GLOBE_SPHERICAL_CLASS} relative flex items-center justify-center`}
      style={{ width: dim, height: dim, aspectRatio: "1 / 1" }}
      role="img"
      aria-label="HomeCheff world globe"
    >
      {/* 1. Outer atmosphere glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: "112%",
          height: "112%",
          background: `radial-gradient(circle, ${UNIVERSE_BRAND.blue}66 0%, ${UNIVERSE_BRAND.green}44 38%, transparent 74%)`,
          animation: reducedMotion ? undefined : "universe-glow-pulse 7s ease-in-out infinite",
        }}
      />

      {/* Spherical body — strict 1:1 circle */}
      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: "92%",
          height: "92%",
          aspectRatio: "1 / 1",
          animation: reducedMotion ? undefined : "universe-float 8s ease-in-out infinite",
          boxShadow: `0 0 48px ${UNIVERSE_BRAND.blue}88, 0 0 80px ${UNIVERSE_BRAND.green}44, inset 0 -12px 32px rgba(0,0,0,0.35)`,
        }}
      >
        {/* 2. Ocean base */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 32% 28%, #2aa8d8 0%, ${UNIVERSE_BRAND.blue} 32%, #0a5a8a 58%, #032840 100%)`,
          }}
        />

        {/* 3. Rotating world map layer */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div
            className={`absolute inset-y-0 left-0 flex h-full ${reducedMotion ? "" : "universe-globe-map-layer"}`}
            style={{ width: "200%" }}
          >
            <GlobeMapStrip />
          </div>
        </div>

        {/* Curved grid overlay for spherical feel */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 200" aria-hidden>
          {[28, 52, 76, 100, 124, 148, 172].map((y) => (
            <ellipse
              key={`curve-${y}`}
              cx="100"
              cy="100"
              rx={98}
              ry={Math.abs(100 - y) * 0.85 + 8}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.5"
              transform={`rotate(-12 100 100)`}
              style={{ transformOrigin: "center" }}
            />
          ))}
          {[40, 70, 100, 130, 160].map((x) => (
            <ellipse
              key={`meridian-${x}`}
              cx="100"
              cy="100"
              rx={Math.abs(100 - x) * 0.55 + 12}
              ry={98}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="0.45"
            />
          ))}
        </svg>

        {/* 4. Cloud / haze layer */}
        <div
          className="absolute inset-0 rounded-full opacity-40 mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 38% 32%, rgba(255,255,255,0.38) 0%, transparent 42%),
              radial-gradient(circle at 62% 58%, rgba(255,255,255,0.22) 0%, transparent 38%)`,
            animation: reducedMotion ? undefined : "universe-cloud-drift 14s ease-in-out infinite",
          }}
        />

        {/* 5. Ecosystem route layer */}
        {!reducedMotion && (
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 200" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => {
              const angle = (i * 72 * Math.PI) / 180;
              const x2 = 100 + Math.cos(angle) * 82;
              const y2 = 100 + Math.sin(angle) * 82;
              return (
                <line
                  key={i}
                  x1="100"
                  y1="100"
                  x2={x2}
                  y2={y2}
                  stroke={i % 2 === 0 ? UNIVERSE_BRAND.green : "#ffffff"}
                  strokeWidth="0.7"
                  strokeDasharray="4 7"
                  opacity="0.5"
                  style={{ animation: `universe-energy-pulse ${3.5 + i * 0.4}s ease-in-out infinite` }}
                />
              );
            })}
          </svg>
        )}

        {/* 6. Surface light points */}
        {[
          { x: "34%", y: "40%" },
          { x: "56%", y: "34%" },
          { x: "70%", y: "56%" },
          { x: "44%", y: "66%" },
          { x: "62%", y: "48%" },
        ].map((pt, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: pt.x,
              top: pt.y,
              width: i === 0 ? 3 : 2,
              height: i === 0 ? 3 : 2,
              animation: reducedMotion ? undefined : `universe-glow-pulse ${2 + i * 0.5}s ease-in-out infinite`,
            }}
          />
        ))}

        {/* 7. Light glass reflection — subtle, not dominant */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 26% 20%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 16%, transparent 38%)`,
          }}
        />

        {/* 8. Shadow terminator edge */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(108deg, transparent 38%, rgba(0,0,0,0.38) 72%, rgba(0,0,0,0.62) 100%)`,
          }}
        />

        {/* Atmosphere rim */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `inset 0 0 24px rgba(255,255,255,0.12), inset 0 -10px 28px rgba(0,0,0,0.28)`,
            border: "1.5px solid rgba(255,255,255,0.28)",
          }}
        />
      </div>
    </div>
  );
}

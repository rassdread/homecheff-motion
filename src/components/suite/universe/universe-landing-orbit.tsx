"use client";

type Props = {
  accentColor?: string;
  className?: string;
};

/** Subtle orbit motif for service landing pages — matches homepage universe without clutter. */
export function UniverseLandingOrbit({ accentColor = "#0067B1", className = "" }: Props) {
  return (
    <div
      className={`pointer-events-none absolute right-0 top-8 hidden opacity-70 lg:block ${className}`}
      aria-hidden="true"
      data-testid="universe-landing-orbit"
    >
      <div className="relative h-48 w-48 sm:h-56 sm:w-56">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)`,
            animation: "universe-glow-pulse 3s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-[18%] rounded-full border border-white/15"
          style={{ animation: "universe-orbit-spin 12s linear infinite" }}
        />
        <div
          className="absolute left-1/2 top-[12%] h-3 w-3 -translate-x-1/2 rounded-full"
          style={{ backgroundColor: accentColor, boxShadow: `0 0 12px ${accentColor}` }}
        />
        <div
          className="absolute bottom-[15%] right-[18%] h-2.5 w-2.5 rounded-full bg-[#006D52]"
          style={{ boxShadow: "0 0 10px rgba(0,109,82,0.6)" }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full shadow-lg"
          style={{
            background: "radial-gradient(circle at 34% 28%, #0078c8 0%, #005994 42%, #013a66 100%)",
          }}
        />
      </div>
    </div>
  );
}

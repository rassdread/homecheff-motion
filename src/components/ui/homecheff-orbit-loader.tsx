"use client";

import { useActiveTranslator } from "@/i18n/client";

export type HomeCheffOrbitLoaderState =
  | "analyzing"
  | "preparing_plan"
  | "generating"
  | "preparing_motion"
  | "exporting"
  | "loading"
  | "opening_project"
  | "hydrating"
  | "converting"
  | "opening_motion"
  | "opening_publish"
  | "opening_studio"
  | "preparing_scene"
  | "rendering"
  | "route_transition";

type Props = {
  state?: HomeCheffOrbitLoaderState;
  message?: string;
  size?: "sm" | "md" | "lg" | "fullscreen";
  className?: string;
};

const STATE_MESSAGE_KEYS: Record<HomeCheffOrbitLoaderState, string> = {
  analyzing: "platform.orbit.analyzing",
  preparing_plan: "platform.orbit.preparingPlan",
  generating: "platform.orbit.generating",
  preparing_motion: "platform.orbit.preparingMotion",
  exporting: "platform.orbit.exporting",
  loading: "platform.orbit.loading",
  opening_project: "platform.orbit.openingProject",
  hydrating: "platform.orbit.hydrating",
  converting: "platform.orbit.converting",
  opening_motion: "platform.orbit.openingMotion",
  opening_publish: "platform.orbit.openingPublish",
  opening_studio: "platform.orbit.openingStudio",
  preparing_scene: "platform.orbit.preparingScene",
  rendering: "platform.orbit.rendering",
  route_transition: "platform.orbit.routeTransition",
};

const SIZE_PX = { sm: 56, md: 88, lg: 120, fullscreen: 140 } as const;

export function HomeCheffOrbitLoader({
  state = "loading",
  message,
  size = "md",
  className = "",
}: Props) {
  const t = useActiveTranslator();
  const dim = SIZE_PX[size];
  const label = message ?? t(STATE_MESSAGE_KEYS[state] as never);
  const fullscreen = size === "fullscreen";

  const orbit = (
    <>
      <div
        className="relative flex items-center justify-center"
        style={{ width: dim, height: dim }}
      >
        <div
          className="absolute inset-0 rounded-full opacity-80"
          style={{
            background:
              "radial-gradient(circle, rgba(0,103,177,0.35) 0%, rgba(0,103,177,0.08) 55%, transparent 72%)",
            animation: "homecheff-orbit-glow 2.4s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full border border-[#0067B1]/25"
          style={{
            width: "92%",
            height: "92%",
            animation: "homecheff-orbit-ring 3s linear infinite",
          }}
        />
        <div
          className="absolute rounded-full border border-dashed border-[#006D52]/40"
          style={{
            width: "78%",
            height: "78%",
            animation: "homecheff-orbit-ring-reverse 4.5s linear infinite",
          }}
        />
        <div
          className="relative overflow-hidden rounded-full shadow-lg"
          style={{
            width: "58%",
            height: "58%",
            background:
              "radial-gradient(circle at 34% 28%, #0078c8 0%, #005994 42%, #013a66 100%)",
            boxShadow: "0 0 24px rgba(0,103,177,0.45), inset 0 -8px 20px rgba(0,0,0,0.35)",
          }}
        >
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
              animation: "homecheff-orbit-shimmer 2s ease-in-out infinite",
            }}
          />
        </div>
        <span
          className="absolute rounded-full bg-[#006D52]"
          style={{
            width: size === "sm" ? 6 : 8,
            height: size === "sm" ? 6 : 8,
            top: "8%",
            left: "50%",
            transform: "translateX(-50%)",
            animation: "homecheff-orbit-planet-a 2.8s linear infinite",
            boxShadow: "0 0 8px rgba(0,109,82,0.6)",
          }}
        />
        <span
          className="absolute rounded-full bg-[#0067B1]"
          style={{
            width: size === "sm" ? 5 : 7,
            height: size === "sm" ? 5 : 7,
            bottom: "12%",
            right: "10%",
            animation: "homecheff-orbit-planet-b 3.6s linear infinite",
            boxShadow: "0 0 8px rgba(0,103,177,0.6)",
          }}
        />
      </div>
      <p
        className={`max-w-xs text-center font-medium ${fullscreen ? "text-base text-white" : "text-sm text-zinc-800"}`}
      >
        {label}
      </p>
    </>
  );

  if (fullscreen) {
    return (
      <div
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[#041428]/95 backdrop-blur-md ${className}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
        data-testid="homecheff-orbit-loader"
        data-orbit-state={state}
        data-orbit-size={size}
      >
        {orbit}
        <style jsx>{ORBIT_KEYFRAMES}</style>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="homecheff-orbit-loader"
      data-orbit-state={state}
      data-orbit-size={size}
    >
      {orbit}
      <style jsx>{ORBIT_KEYFRAMES}</style>
    </div>
  );
}

const ORBIT_KEYFRAMES = `
  @keyframes homecheff-orbit-glow {
    0%, 100% { transform: scale(1); opacity: 0.75; }
    50% { transform: scale(1.06); opacity: 1; }
  }
  @keyframes homecheff-orbit-ring {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes homecheff-orbit-ring-reverse {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }
  @keyframes homecheff-orbit-shimmer {
    0%, 100% { transform: translateX(-100%); }
    50% { transform: translateX(100%); }
  }
  @keyframes homecheff-orbit-planet-a {
    from { transform: translateX(-50%) rotate(0deg) translateY(0); }
    to { transform: translateX(-50%) rotate(360deg) translateY(0); }
  }
  @keyframes homecheff-orbit-planet-b {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(-6px, -4px); }
    50% { transform: translate(-10px, 2px); }
    75% { transform: translate(-4px, 6px); }
  }
`;

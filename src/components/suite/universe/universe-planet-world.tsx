"use client";

import type { UniversePlanetId } from "@/lib/universe-home-config";

type UniversePlanetWorldProps = {
  id: UniversePlanetId;
  active: boolean;
  reducedMotion?: boolean;
  accent: string;
};

export function UniversePlanetWorld({
  id,
  active,
  reducedMotion = false,
  accent,
}: UniversePlanetWorldProps) {
  const orbitSpeed = active ? "8s" : "18s";
  const opacity = active ? 1 : 0.55;

  const elements = (() => {
    switch (id) {
      case "editor":
        return [
          { kind: "rect", angle: 0, color: "#fff" },
          { kind: "circle", angle: 72, color: accent },
          { kind: "rect", angle: 144, color: "#a8d4ff" },
          { kind: "char", angle: 216, color: accent },
          { kind: "rect", angle: 288, color: "#ffe4b5" },
        ];
      case "studio":
        return [
          { kind: "scene", angle: 0, color: accent },
          { kind: "pin", angle: 90, color: "#fff" },
          { kind: "scene", angle: 180, color: "#006D52" },
          { kind: "char", angle: 270, color: accent },
        ];
      case "motion":
        return [
          { kind: "trail", angle: 0 },
          { kind: "dot", angle: 120, color: accent },
          { kind: "trail", angle: 200 },
          { kind: "dot", angle: 300, color: "#fff" },
        ];
      case "publish":
        return [
          { kind: "frame", angle: 0, color: accent },
          { kind: "sub", angle: 100, color: "#fff" },
          { kind: "frame", angle: 200, color: "#006D52" },
          { kind: "export", angle: 290, color: accent },
        ];
      case "library":
        return [
          { kind: "stack", angle: 0, color: accent },
          { kind: "stack", angle: 90, color: "#0067B1" },
          { kind: "archive", angle: 180, color: "#fff" },
          { kind: "stack", angle: 270, color: accent },
        ];
    }
  })();

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {id === "motion" && active && !reducedMotion && (
        <svg className="absolute inset-[-20%] h-[140%] w-[140%]" viewBox="0 0 100 100">
          <path
            d="M20 50 Q50 20 80 50"
            fill="none"
            stroke={accent}
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.7"
            style={{ animation: "universe-motion-trail 2s ease-in-out infinite" }}
          />
        </svg>
      )}

      {elements.map((el, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2"
          style={{
            ["--world-orbit" as string]: `${active ? 44 + i * 4 : 32 + i * 3}px`,
            animation: reducedMotion
              ? undefined
              : `universe-world-orbit ${orbitSpeed} linear infinite`,
            animationDelay: `${i * 0.4}s`,
            opacity,
            transformOrigin: "center center",
          }}
        >
          {el.kind === "rect" && (
            <div
              className="h-3 w-4 rounded-sm border border-white/30 shadow-sm"
              style={{ background: `${el.color}99`, transform: "translate(-50%, -50%)" }}
            />
          )}
          {el.kind === "circle" && (
            <div
              className="h-3 w-3 rounded-full border border-white/25"
              style={{ background: `${el.color}aa`, transform: "translate(-50%, -50%)" }}
            />
          )}
          {el.kind === "char" && (
            <div
              className="flex h-4 w-3 flex-col items-center rounded-full border border-white/20"
              style={{ background: `${el.color}77`, transform: "translate(-50%, -50%)" }}
            >
              <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-white/70" />
            </div>
          )}
          {el.kind === "scene" && (
            <div
              className="h-3.5 w-5 rounded border border-white/25"
              style={{ background: `${el.color}88`, transform: "translate(-50%, -50%)" }}
            />
          )}
          {el.kind === "pin" && (
            <div
              className="h-2 w-2 rotate-45 rounded-sm"
              style={{ background: el.color, transform: "translate(-50%, -50%)" }}
            />
          )}
          {el.kind === "dot" && (
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: el.color, transform: "translate(-50%, -50%)" }}
            />
          )}
          {el.kind === "frame" && (
            <div
              className="h-3 w-4 rounded-sm border-2 border-white/30"
              style={{ background: `${el.color}66`, transform: "translate(-50%, -50%)" }}
            />
          )}
          {el.kind === "sub" && (
            <div
              className="h-1 w-5 rounded-full bg-white/60"
              style={{ transform: "translate(-50%, -50%)" }}
            />
          )}
          {el.kind === "export" && (
            <div
              className="h-2.5 w-2.5 rotate-45 border border-white/40"
              style={{ background: `${el.color}88`, transform: "translate(-50%, -50%)" }}
            />
          )}
          {el.kind === "stack" && (
            <div className="relative" style={{ transform: "translate(-50%, -50%)" }}>
              {[0, 1].map((s) => (
                <div
                  key={s}
                  className="absolute h-2.5 w-3.5 rounded-sm border border-white/20"
                  style={{
                    background: `${el.color}${s === 0 ? "aa" : "66"}`,
                    left: s * 3,
                    top: s * -2,
                  }}
                />
              ))}
            </div>
          )}
          {el.kind === "archive" && (
            <div
              className="h-3 w-4 rounded-t-lg border border-white/25"
              style={{ background: `${el.color}77`, transform: "translate(-50%, -50%)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

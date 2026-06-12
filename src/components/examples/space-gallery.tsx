"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HomeCheffPreviewModal } from "@/components/ui/homecheff-preview-modal";
import { useActiveTranslator } from "@/i18n/client";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { HomeCheffExample } from "@/lib/homecheff-examples";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  examples: HomeCheffExample[];
};

/** Constellation node on a slowly drifting orbit */
function constellationPosition(index: number, total: number, active: boolean, orbitPhase: number) {
  const baseAngle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  const angle = baseAngle + orbitPhase * 0.15;
  const radiusX = 36 + (index % 4) * 5;
  const radiusY = 26 + (index % 3) * 7;
  const x = 50 + Math.cos(angle) * radiusX;
  const y = 50 + Math.sin(angle) * radiusY;
  const depth = (Math.sin(angle + orbitPhase) + 1) / 2;
  const scale = active ? 1.14 : 0.88 + depth * 0.16;
  const z = Math.round(8 + depth * 24 + (active ? 40 : 0));
  const floatDelay = index * 0.65;
  return { x, y, scale, z, floatDelay, depth };
}

export function SpaceGallery({ examples }: Props) {
  const t = useActiveTranslator();
  const reducedMotion = useReducedMotion();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [orbitPhase, setOrbitPhase] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      setOrbitPhase(frame * 0.008);
    }, 80);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const positions = useMemo(
    () => examples.map((ex, i) => constellationPosition(i, examples.length, hoveredId === ex.id, orbitPhase)),
    [examples, hoveredId, orbitPhase]
  );

  const closePreview = useCallback(() => setPreviewIndex(null), []);
  const previewItem = previewIndex !== null ? examples[previewIndex] : null;

  if (examples.length === 0) return null;

  return (
    <>
      <div
        className="relative mx-auto mt-10 aspect-[16/10] w-full max-w-3xl overflow-visible"
        data-testid="space-gallery"
      >
        <div
          className="pointer-events-none absolute inset-[-8%] rounded-[45%] border border-white/[0.07] bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-sky-500/[0.05] shadow-[inset_0_0_80px_rgba(0,109,82,0.08)]"
          aria-hidden
          style={{
            animation: reducedMotion ? undefined : "space-orbit-drift 48s linear infinite",
          }}
        />
        {examples.map((ex, i) => {
          const pos = positions[i]!;
          const active = hoveredId === ex.id;
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => setPreviewIndex(i)}
              onMouseEnter={() => setHoveredId(ex.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`absolute w-[9.5rem] rounded-2xl border p-2.5 text-left backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-500 sm:w-[10.5rem] ${
                active
                  ? "border-emerald-300/60 bg-white/18 shadow-[0_16px_48px_rgba(0,109,82,0.45)]"
                  : "border-white/20 bg-white/8 shadow-[0_8px_28px_rgba(0,0,0,0.3)]"
              } ${studioVisual.cardGlass}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                zIndex: pos.z,
                transform: `translate(-50%, -50%) scale(${pos.scale})`,
                opacity: 0.82 + pos.depth * 0.18,
                animation: reducedMotion ? undefined : `space-orbit-float ${8 + pos.floatDelay}s ease-in-out infinite`,
              }}
            >
              {ex.mediaKind === "video" ?
                <video
                  src={ex.thumbnailUrl}
                  muted
                  playsInline
                  loop
                  className="h-20 w-full rounded-lg object-contain bg-black/30"
                />
              : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ex.thumbnailUrl} alt="" className="h-20 w-full rounded-lg object-contain bg-black/20" />
              )}
              <p className="mt-2 text-xs font-semibold text-white">{ex.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[10px] text-white/65">{ex.description}</p>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-white/50">{t("examples.gallery.hint" as never)}</p>

      <HomeCheffPreviewModal
        open={previewIndex !== null}
        title={previewItem?.title ?? ""}
        onClose={closePreview}
        hasPrev={previewIndex !== null && previewIndex > 0}
        hasNext={previewIndex !== null && previewIndex < examples.length - 1}
        onPrev={() => setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
        onNext={() => setPreviewIndex((i) => (i !== null && i < examples.length - 1 ? i + 1 : i))}
        indexLabel={previewIndex !== null ? `${previewIndex + 1} / ${examples.length}` : undefined}
      >
        {previewItem ?
          <>
            <p className="mb-3 max-w-prose text-center text-sm text-white/75">{previewItem.description}</p>
            {previewItem.mediaKind === "video" ?
              <video
                src={previewItem.thumbnailUrl}
                controls
                className="max-h-[min(60vh,520px)] w-full object-contain"
              />
            : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewItem.thumbnailUrl}
                alt=""
                className="max-h-[min(60vh,520px)] w-full object-contain"
              />
            )}
          </>
        : null}
      </HomeCheffPreviewModal>

      <style jsx>{`
        @keyframes space-orbit-float {
          0%, 100% { transform: translate(-50%, -50%) scale(var(--sg-scale, 1)) translateY(0); }
          50% { transform: translate(-50%, -50%) scale(var(--sg-scale, 1)) translateY(-12px); }
        }
        @keyframes space-orbit-drift {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

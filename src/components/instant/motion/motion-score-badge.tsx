"use client";

import { characterIdentityStatusColor } from "@/lib/studio-character-identity-status";
import type { CharacterIdentityStatus } from "@/types/studio-character-consistency";

const CLASS: Record<ReturnType<typeof characterIdentityStatusColor>, string> = {
  green: "bg-emerald-100 text-emerald-900",
  yellow: "bg-amber-100 text-amber-900",
  orange: "bg-orange-100 text-orange-900",
  red: "bg-red-100 text-red-900",
  zinc: "bg-zinc-100 text-zinc-700",
};

type Props = {
  label: string;
  score: number | null;
  status?: CharacterIdentityStatus | null;
  warn?: boolean;
};

export function MotionScoreBadge({ label, score, status, warn }: Props) {
  const color = status ? characterIdentityStatusColor(status) : "zinc";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${CLASS[color]} ${warn ? "ring-2 ring-red-400 ring-offset-1" : ""}`}
    >
      <span className="text-[10px] font-medium uppercase opacity-80">{label}</span>
      <span>{score ?? "—"}</span>
    </span>
  );
}

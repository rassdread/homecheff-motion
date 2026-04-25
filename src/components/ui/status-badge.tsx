import type { AnimationStatus } from "@/types/animation";
import { getActiveTranslator } from "@/i18n";

type StatusBadgeProps = {
  status: AnimationStatus;
  className?: string;
};

const STATUS_STYLES: Record<AnimationStatus, string> = {
  idle: "border-zinc-200 bg-zinc-100 text-zinc-700",
  queued: "border-sky-200 bg-sky-100 text-sky-700",
  generating: "border-emerald-200 bg-emerald-100 text-emerald-700",
  rendering: "border-cyan-200 bg-cyan-100 text-cyan-700",
  completed: "border-green-200 bg-green-100 text-green-700",
  failed: "border-red-200 bg-red-100 text-red-700",
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const t = getActiveTranslator();

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]} ${className}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}

import { ReactNode } from "react";
import { studioVisual } from "@/lib/studio-visual-tokens";

export type AppCardVariant = "light" | "glass" | "elevated" | "legacy";

type AppCardProps = {
  children: ReactNode;
  className?: string;
  variant?: AppCardVariant;
  active?: boolean;
};

const VARIANT_CLASS: Record<AppCardVariant, string> = {
  light: studioVisual.cardLight,
  glass: studioVisual.cardGlass,
  elevated: studioVisual.cardElevated,
  legacy:
    "rounded-3xl border border-emerald-100 bg-white p-6 text-zinc-900 shadow-[0_16px_40px_-24px_rgba(16,185,129,0.4)]",
};

export function AppCard({
  children,
  className = "",
  variant = "light",
  active = false,
}: AppCardProps) {
  return (
    <section
      className={`${VARIANT_CLASS[variant]} ${active ? studioVisual.cardActive : ""} ${className}`}
    >
      {children}
    </section>
  );
}

"use client";

import type { ReactNode } from "react";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
};

export function StudioPageIntro({ title, description, eyebrow, actions, className = "" }: Props) {
  return (
    <header className={`studio-page-intro ${className}`.trim()} data-testid="studio-page-intro">
      {eyebrow ? (
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${studioVisual.eyebrowOnDark}`}>{eyebrow}</p>
      ) : null}
      <h1 className={`mt-3 text-4xl font-bold tracking-tight ${studioVisual.headingOnDark} sm:text-5xl`}>{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">{description}</p>
      {actions ? (
        <div className="mt-6 flex flex-wrap gap-3" data-testid="landing-primary-cta">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

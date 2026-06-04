"use client";

import type { ReactNode, RefObject } from "react";

type InstantWizardContentProps = {
  children: ReactNode;
  /** Scroll container for storyboard frame expand (wizard body). */
  contentRef?: RefObject<HTMLDivElement | null>;
};

export function InstantWizardContent({ children, contentRef }: InstantWizardContentProps) {
  return (
    <div
      ref={contentRef}
      className="min-h-[clamp(420px,58vh,720px)] flex-1 overflow-y-auto px-4 pb-4 pt-6 sm:px-6"
    >
      {children}
    </div>
  );
}

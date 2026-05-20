"use client";

import type { ReactNode } from "react";
import { InstantWizardNavButton } from "@/components/instant/instant-wizard-nav-button";

export type InstantWizardFooterProps = {
  backLabel?: string;
  onBack?: () => void;
  showBack?: boolean;
  /** Reserve back column on desktop when back is hidden (step 1). */
  backPlaceholder?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
  primaryLabel: ReactNode;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  /** Checkout step: stack buttons vertically on all breakpoints. */
  stackButtons?: boolean;
};

export function InstantWizardFooter({
  backLabel,
  onBack,
  showBack = false,
  backPlaceholder = false,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  stackButtons = false,
}: InstantWizardFooterProps) {
  const rowClass = stackButtons
    ? "flex flex-col gap-3"
    : "flex flex-col gap-3 sm:flex-row sm:items-stretch";

  return (
    <footer
      className="sticky bottom-0 z-10 shrink-0 border-t border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-6 min-h-[5.75rem] pb-[max(1rem,env(safe-area-inset-bottom))]"
      aria-label="Wizard navigation"
    >
      <div className={rowClass}>
        {showBack ? (
          <InstantWizardNavButton variant="back" onClick={onBack}>
            {backLabel}
          </InstantWizardNavButton>
        ) : backPlaceholder ? (
          <InstantWizardNavButton variant="back" placeholder />
        ) : null}
        {onSecondary && secondaryLabel ? (
          <InstantWizardNavButton
            variant="back"
            onClick={onSecondary}
            disabled={secondaryDisabled}
            className="!border-red-200 !text-red-800 hover:!bg-red-50"
          >
            {secondaryLabel}
          </InstantWizardNavButton>
        ) : null}
        <InstantWizardNavButton
          variant="primary"
          onClick={onPrimary}
          disabled={primaryDisabled}
        >
          {primaryLabel}
        </InstantWizardNavButton>
      </div>
    </footer>
  );
}

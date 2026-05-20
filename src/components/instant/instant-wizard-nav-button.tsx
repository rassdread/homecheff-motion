"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { GradientButton } from "@/components/ui/gradient-button";

type InstantWizardNavButtonProps = {
  variant: "back" | "primary";
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Keeps footer width stable when back is not shown (desktop row). */
  placeholder?: boolean;
  className?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
};

export function InstantWizardNavButton({
  variant,
  children,
  onClick,
  disabled,
  placeholder,
  className = "",
  type = "button",
}: InstantWizardNavButtonProps) {
  if (placeholder) {
    return (
      <div
        className={`hidden min-h-12 flex-1 sm:block ${className}`}
        aria-hidden
      />
    );
  }

  if (variant === "back") {
    return (
      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={`min-h-12 flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <GradientButton
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-12 w-full flex-1 py-3 ${className}`}
    >
      {children}
    </GradientButton>
  );
}

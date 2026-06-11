"use client";

import Link from "next/link";
import { ComponentPropsWithoutRef, ReactNode } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

export type GradientButtonVariant = "primary" | "secondary" | "danger";

type SharedProps = {
  children: ReactNode;
  className?: string;
  loading?: boolean;
  /** When `loading` is true, shown instead of the default generic loading label. */
  loadingLabel?: ReactNode;
  disabled?: boolean;
  variant?: GradientButtonVariant;
};

type LinkButtonProps = SharedProps & {
  href: string;
};

type NativeButtonProps = SharedProps &
  Omit<ComponentPropsWithoutRef<"button">, "children" | "className"> & {
    href?: undefined;
  };

type GradientButtonProps = LinkButtonProps | NativeButtonProps;

function getClasses(
  className: string,
  disabled: boolean,
  loading: boolean,
  variant: GradientButtonVariant
): string {
  const base =
    variant === "secondary"
      ? studioVisual.btnOutline
      : variant === "danger"
        ? studioVisual.btnDanger
        : studioVisual.btnGradientPrimary;
  return `${base} studio-btn-glow ${
    disabled || loading ? "cursor-not-allowed opacity-40" : ""
  } ${className}`;
}

export function GradientButton(props: GradientButtonProps) {
  const t = useActiveTranslator();
  const loading = props.loading ?? false;
  const disabled = props.disabled ?? false;
  const content = loading
    ? (props.loadingLabel ?? t("button.loading"))
    : props.children;
  const variant = props.variant ?? "primary";
  const classes = getClasses(props.className ?? "", disabled, loading, variant);

  if ("href" in props && props.href) {
    return (
      <Link
        href={props.href}
        aria-disabled={disabled || loading}
        className={classes}
      >
        {content}
      </Link>
    );
  }

  const {
    type = "button",
    loading: omitLoading,
    loadingLabel: omitLoadingLabel,
    children: omitChildren,
    className: omitClassName,
    disabled: omitDisabled,
    ...buttonProps
  } = props as NativeButtonProps;
  void omitLoading;
  void omitLoadingLabel;
  void omitChildren;
  void omitClassName;
  void omitDisabled;

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={disabled || loading}
      className={classes}
    >
      {content}
    </button>
  );
}

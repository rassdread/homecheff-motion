import Link from "next/link";
import { ComponentPropsWithoutRef, ReactNode } from "react";
import { getActiveTranslator } from "@/i18n";
import { brand } from "@/lib/brand";

type SharedProps = {
  children: ReactNode;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
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
  loading: boolean
): string {
  return `inline-flex items-center justify-center rounded-full bg-gradient-to-r ${brand.accentGradient} px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${
    disabled || loading ? "cursor-not-allowed opacity-40" : ""
  } ${className}`;
}

export function GradientButton(props: GradientButtonProps) {
  const t = getActiveTranslator();
  const loading = props.loading ?? false;
  const disabled = props.disabled ?? false;
  const content = loading ? t("button.loading") : props.children;
  const classes = getClasses(props.className ?? "", disabled, loading);

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

  const { type = "button", ...buttonProps } = props as NativeButtonProps;

  return (
    <button {...buttonProps} type={type} disabled={disabled || loading} className={classes}>
      {content}
    </button>
  );
}

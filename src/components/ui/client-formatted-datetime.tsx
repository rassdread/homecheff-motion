"use client";

import { useMounted } from "@/hooks/use-mounted";
import { useLocale } from "@/i18n/client";

type Props = {
  iso: string | Date;
  dateStyle?: "short" | "medium" | "long" | "full";
  timeStyle?: "short" | "medium" | "long" | "full";
  className?: string;
};

function formatIso(
  iso: string | Date,
  locale: string,
  dateStyle: Props["dateStyle"],
  timeStyle: Props["timeStyle"]
): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const loc = locale === "nl" ? "nl-NL" : "en-US";
  return new Intl.DateTimeFormat(loc, { dateStyle, timeStyle }).format(date);
}

/** Renders "—" on server/first paint; formats after mount to avoid React #418 text mismatches. */
export function ClientFormattedDateTime({
  iso,
  dateStyle = "medium",
  timeStyle = "short",
  className,
}: Props) {
  const mounted = useMounted();
  const [locale] = useLocale();
  const label = mounted ? formatIso(iso, locale, dateStyle, timeStyle) : "—";

  return (
    <span className={className} suppressHydrationWarning>
      {label}
    </span>
  );
}

/** Time-only formatter for polling labels (avoids hydration mismatch). */
export function ClientFormattedTime({
  ms,
  className,
}: {
  ms: number;
  className?: string;
}) {
  const mounted = useMounted();
  const [locale] = useLocale();
  const label = mounted
    ? formatIso(new Date(ms), locale, undefined, "short")
    : "—";

  return (
    <span className={className} suppressHydrationWarning>
      {label}
    </span>
  );
}

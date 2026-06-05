"use client";

type Props = {
  lines: Array<string | null | undefined>;
  className?: string;
};

/** Compact bundle-level count lines (stable when version dropdown changes). */
export function BundleCountLines({ lines, className = "text-xs text-zinc-600" }: Props) {
  const visible = lines.filter((line) => line && line.trim().length > 0);
  if (!visible.length) {
    return null;
  }
  return (
    <div className={`space-y-0.5 ${className}`.trim()}>
      {visible.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

export function Metric({
  label,
  value,
  hint,
  estimated,
  estimatedLabel,
}: {
  label: string;
  value: string;
  hint?: string;
  estimated?: boolean;
  estimatedLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
      <dt className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500">
        <span>{label}</span>
        {estimated && estimatedLabel ?
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold normal-case text-amber-900">
            {estimatedLabel}
          </span>
        : null}
      </dt>
      <dd className="mt-1 text-base font-semibold text-zinc-900">{value}</dd>
      {hint ?
        <p className="mt-1 text-[10px] text-amber-800">{hint}</p>
      : null}
    </div>
  );
}

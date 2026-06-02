"use client";

import { useActiveTranslator } from "@/i18n/client";

export type ProjectDetailQuickAction = {
  id: string;
  labelKey: string;
  hintKey: string;
  onClick?: () => void;
  href?: string;
  download?: string;
  disabled?: boolean;
  busy?: boolean;
  busyLabelKey?: string;
  visible?: boolean;
};

type ProjectDetailQuickActionsProps = {
  actions: ProjectDetailQuickAction[];
};

function ActionButton({
  action,
  label,
  hint,
}: {
  action: ProjectDetailQuickAction;
  label: string;
  hint: string;
}) {
  const baseClass =
    "flex w-full flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:opacity-60";

  const inner = (
    <>
      <span className="text-sm font-semibold text-zinc-900">{label}</span>
      <span className="text-xs leading-relaxed text-zinc-600">{hint}</span>
    </>
  );

  if (action.href) {
    return (
      <a
        href={action.href}
        download={action.download}
        className={baseClass}
        aria-disabled={action.disabled}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={baseClass}
      onClick={action.onClick}
      disabled={action.disabled || action.busy}
    >
      {inner}
    </button>
  );
}

export function ProjectDetailQuickActions({ actions }: ProjectDetailQuickActionsProps) {
  const t = useActiveTranslator();
  const visible = actions.filter((a) => a.visible !== false);
  if (visible.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5"
      aria-labelledby="project-detail-quick-actions-title"
    >
      <h2 id="project-detail-quick-actions-title" className="text-base font-semibold text-zinc-900">
        {t("projectDetail.quickActions.title")}
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {visible.map((action) => (
          <li key={action.id}>
            <ActionButton
              action={action}
              label={
                action.busy && action.busyLabelKey ?
                  t(action.busyLabelKey as never)
                : t(action.labelKey as never)
              }
              hint={t(action.hintKey as never)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

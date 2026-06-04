"use client";

import { useActiveTranslator } from "@/i18n/client";

type ProjectRerenderChoicesProps = {
  disabled?: boolean;
  quickBusy?: boolean;
  onQuickRerender: () => void;
  onOpenEditor: () => void;
};

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.5a1 1 0 0 1-1.437-.02L3.29 10.29a1 1 0 1 1 1.42-1.42l3.51 3.51 6.54-6.76a1 1 0 0 1 1.414-.006Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 9A8 8 0 0 0 5.6 6.6M4 15a8 8 0 0 0 14.4 2.4" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
      />
    </svg>
  );
}

function BenefitList({ keys }: { keys: string[] }) {
  const t = useActiveTranslator();
  return (
    <ul className="mt-3 space-y-1.5">
      {keys.map((key) => (
        <li key={key} className="flex items-start gap-2 text-xs text-zinc-700">
          <CheckIcon />
          <span>{t(key as never)}</span>
        </li>
      ))}
    </ul>
  );
}

function WhenList({ titleKey, itemKeys }: { titleKey: string; itemKeys: string[] }) {
  const t = useActiveTranslator();
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t(titleKey as never)}</p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-zinc-600">
        {itemKeys.map((key) => (
          <li key={key}>{t(key as never)}</li>
        ))}
      </ul>
    </div>
  );
}

export function ProjectRerenderChoices({
  disabled,
  quickBusy,
  onQuickRerender,
  onOpenEditor,
}: ProjectRerenderChoicesProps) {
  const t = useActiveTranslator();

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5"
      aria-labelledby="project-rerender-choices-title"
    >
      <h2 id="project-rerender-choices-title" className="text-base font-semibold text-zinc-900">
        {t("projectDetail.rerenderChoices.title")}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600">{t("projectDetail.rerenderChoices.subtitle")}</p>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <article className="flex flex-col rounded-2xl border-2 border-[#006D52]/25 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#006D52]/10 text-[#006D52]">
                <RefreshIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {t("projectDetail.rerenderChoices.quick.title")}
                </h3>
                <span className="mt-0.5 inline-block rounded-full bg-[#006D52]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#006D52]">
                  {t("projectDetail.rerenderChoices.quick.badge")}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700">
            {t("projectDetail.rerenderChoices.quick.description")}
          </p>
          <WhenList
            titleKey="projectDetail.rerenderChoices.whenTitle"
            itemKeys={[
              "projectDetail.rerenderChoices.quick.when1",
              "projectDetail.rerenderChoices.quick.when2",
              "projectDetail.rerenderChoices.quick.when3",
            ]}
          />
          <BenefitList
            keys={[
              "projectDetail.rerenderChoices.quick.benefit1",
              "projectDetail.rerenderChoices.quick.benefit2",
              "projectDetail.rerenderChoices.quick.benefit3",
              "projectDetail.rerenderChoices.quick.benefit4",
            ]}
          />
          <button
            type="button"
            onClick={onQuickRerender}
            disabled={disabled || quickBusy}
            className="mt-4 w-full rounded-xl bg-[#006D52] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#005a44] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {quickBusy ?
              t("instant.fullRerender.busy")
            : t("projectDetail.rerenderChoices.quick.cta")}
          </button>
        </article>

        <article className="flex flex-col rounded-2xl border-2 border-[#0067B1]/25 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0067B1]/10 text-[#0067B1]">
                <PencilIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {t("projectDetail.rerenderChoices.newVersion.title")}
                </h3>
                <span className="mt-0.5 inline-block rounded-full bg-[#0067B1]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0067B1]">
                  {t("projectDetail.rerenderChoices.newVersion.badge")}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700">
            {t("projectDetail.rerenderChoices.newVersion.description")}
          </p>
          <WhenList
            titleKey="projectDetail.rerenderChoices.whenTitle"
            itemKeys={[
              "projectDetail.rerenderChoices.newVersion.when1",
              "projectDetail.rerenderChoices.newVersion.when2",
              "projectDetail.rerenderChoices.newVersion.when3",
              "projectDetail.rerenderChoices.newVersion.when4",
            ]}
          />
          <BenefitList
            keys={[
              "projectDetail.rerenderChoices.newVersion.benefit1",
              "projectDetail.rerenderChoices.newVersion.benefit2",
              "projectDetail.rerenderChoices.newVersion.benefit3",
              "projectDetail.rerenderChoices.newVersion.benefit4",
              "projectDetail.rerenderChoices.newVersion.benefit5",
            ]}
          />
          <button
            type="button"
            onClick={onOpenEditor}
            disabled={disabled}
            className="mt-4 w-full rounded-xl bg-[#0067B1] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#005592] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("projectDetail.rerenderChoices.newVersion.cta")}
          </button>
        </article>
      </div>
    </section>
  );
}

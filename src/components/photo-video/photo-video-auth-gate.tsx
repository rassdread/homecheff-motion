"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { photoVideoDraftReturnTo } from "@/lib/photo-video/draft-storage";
import { trackPhotoVideoFunnelEvent } from "@/lib/photo-video/funnel-analytics";

export function PhotoVideoAuthGate({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useActiveTranslator();
  if (!open) return null;
  const next = encodeURIComponent(photoVideoDraftReturnTo(true));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="px4a-auth-gate-title"
      data-testid="px4a-auth-gate"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 id="px4a-auth-gate-title" className="text-xl font-bold text-zinc-900">
          {t("px4a.gate.title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">{t("px4a.gate.lead")}</p>
        <p className="mt-2 text-sm text-zinc-500">{t("px4a.gate.keep")}</p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href={`/signup?next=${next}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#006D52] px-4 text-sm font-semibold text-white"
            data-testid="px4a-gate-signup"
            onClick={() => trackPhotoVideoFunnelEvent("photo_video_signup_started")}
          >
            {t("px4a.gate.signup")}
          </Link>
          <Link
            href={`/login?next=${next}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-800"
            data-testid="px4a-gate-login"
          >
            {t("px4a.gate.login")}
          </Link>
          <button
            type="button"
            className="min-h-11 text-sm font-medium text-zinc-600 underline"
            onClick={onClose}
            data-testid="px4a-gate-dismiss"
          >
            {t("px4a.gate.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}

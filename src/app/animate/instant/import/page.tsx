"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import {
  applyMotionHandoffImport,
  resolveMotionHandoffExecutionPrefill,
} from "@/lib/apply-motion-handoff-import";
import { fetchMotionHandoffPayload } from "@/lib/studio-motion-handoff-client";
import { MotionHandoffExecutionConfirm } from "@/components/instant/motion/motion-handoff-execution-confirm";
import type { InstantMode } from "@/lib/instant-premium-mode-types";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { MotionHandoffExecutionPrefill } from "@/types/motion-handoff-execution-prefill";

function InstantImportContent() {
  const t = useActiveTranslator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useAuthSession();
  const storyboardId = searchParams.get("storyboardId")?.trim() ?? "";
  const [fetchError, setFetchError] = useState("");
  const [payload, setPayload] = useState<MotionHandoffPayload | null>(null);
  const [prefill, setPrefill] = useState<MotionHandoffExecutionPrefill | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const startedRef = useRef(false);

  const setupError = !session.resolved
    ? null
    : !session.user
      ? t("motion.handoff.error.authRequired")
      : !storyboardId
        ? t("motion.handoff.error.missingStoryboard")
        : null;

  const error = setupError ?? fetchError;

  useEffect(() => {
    if (!session.resolved || setupError || startedRef.current) {
      return;
    }

    startedRef.current = true;
    void (async () => {
      const res = await fetchMotionHandoffPayload(storyboardId);
      if (!res.ok) {
        const code = (res.data as { code?: string }).code;
        const msg = (res.data as { error?: string }).error;
        queueMicrotask(() => {
          if (code === "NO_SCENES") {
            setFetchError(t("motion.handoff.error.noScenes"));
          } else if (code === "NOT_FOUND" || code === "FORBIDDEN") {
            setFetchError(t("motion.handoff.error.notFound"));
          } else {
            setFetchError(msg ?? t("motion.handoff.error.loadFailed"));
          }
          startedRef.current = false;
        });
        return;
      }

      const resolvedPrefill = resolveMotionHandoffExecutionPrefill(res.data.payload);
      queueMicrotask(() => {
        setPayload(res.data.payload);
        setPrefill(resolvedPrefill);
      });
    })();
  }, [session.resolved, setupError, storyboardId, t]);

  const handleContinue = (instantMode: InstantMode) => {
    if (!payload || !prefill) {
      return;
    }
    setImportBusy(true);
    void (async () => {
      try {
        await applyMotionHandoffImport(payload, { instantMode, executionPrefill: prefill });
        router.replace("/animate/instant");
      } catch (e) {
        setImportBusy(false);
        setFetchError(
          e instanceof Error ? e.message : t("motion.handoff.error.importFailed")
        );
      }
    })();
  };

  return (
    <main className={`flex min-h-[50vh] flex-1 flex-col items-center justify-center px-6 py-16 ${brand.softGradientBg}`}>
      {error ? (
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900">{t("motion.handoff.error.title")}</h1>
          <p className="mt-3 text-sm text-red-700">{error}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/studio/storyboards"
              className="rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white"
            >
              {t("motion.handoff.backToStoryboards")}
            </Link>
            <Link
              href="/animate/instant"
              className="text-sm font-medium text-[#0067B1] hover:underline"
            >
              {t("motion.handoff.openMotion")}
            </Link>
          </div>
        </div>
      ) : payload && prefill ?
        <MotionHandoffExecutionConfirm
          storyboardId={storyboardId}
          storyboardTitle={payload.title}
          prefill={prefill}
          onContinue={handleContinue}
          busy={importBusy}
        />
      : (
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900">{t("motion.handoff.loadingTitle")}</h1>
          <p className="mt-3 text-sm text-zinc-600">{t("motion.handoff.loadingBody")}</p>
        </div>
      )}
    </main>
  );
}

export default function InstantMotionImportPage() {
  return (
    <Suspense fallback={null}>
      <InstantImportContent />
    </Suspense>
  );
}

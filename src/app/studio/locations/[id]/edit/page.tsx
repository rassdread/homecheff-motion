"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioLocationForm,
  studioLocationFormToCreatePayload,
  type StudioLocationFormValues,
} from "@/components/studio/studio-location-form";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import {
  fetchStudioLocation,
  updateStudioLocationApi,
} from "@/lib/studio-locations-client";
import type { StudioLocationDetail } from "@/types/studio-api";

export default function StudioLocationEditPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const t = useActiveTranslator();
  const router = useRouter();
  const session = useAuthSession();
  const [location, setLocation] = useState<StudioLocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    const res = await fetchStudioLocation(id);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.locations.error.loadFailed"));
      setLocation(null);
    } else {
      setLocation(res.data.location);
    }
    setLoading(false);
  }, [id, t]);

  useEffect(() => {
    if (!session.resolved || !session.user || !id) {
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [session.resolved, session.user, id, load]);

  const canModify =
    Boolean(session.user?.id && location && location.ownerId === session.user.id);

  const handleSubmit = async (values: StudioLocationFormValues) => {
    const payload = studioLocationFormToCreatePayload(values);
    const { referenceImageUrl, referenceStorageKey, ...identityPatch } = payload;
    const res = await updateStudioLocationApi(id, {
      ...identityPatch,
      ...(values.referenceImageUrl !== location?.referenceImageUrl
        ? { referenceImageUrl, referenceStorageKey }
        : {}),
    });
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.locations.error.saveFailed"));
    }
    router.push(`/studio/locations/${id}`);
  };

  return (
    <StudioAuthGate
      authTitleKey="studio.locations.authRequiredTitle"
      authBodyKey="studio.locations.authRequiredBody"
    >
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <Link
            href={`/studio/locations/${id}`}
            className="text-sm font-medium text-[#006D52] hover:underline"
          >
            ← {t("studio.locations.backToLocation")}
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">{t("studio.locations.editTitle")}</h1>

          {loading ? (
            <p className="mt-8 text-sm text-zinc-500">{t("button.loading")}</p>
          ) : error ? (
            <p className="mt-8 text-sm text-red-700">{error}</p>
          ) : !canModify ? (
            <p className="mt-8 text-sm text-red-700">{t("studio.locations.error.forbidden")}</p>
          ) : location ? (
            <div className="mt-8">
              <StudioLocationForm
                mode="edit"
                initial={location}
                submitLabel={t("studio.locations.saveChanges")}
                backHref={`/studio/locations/${id}`}
                onSubmit={handleSubmit}
              />
            </div>
          ) : null}
        </section>
      </main>
    </StudioAuthGate>
  );
}

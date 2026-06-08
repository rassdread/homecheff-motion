"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioLocationCategoryBadge } from "@/components/studio/studio-location-category-badge";
import { AppCard } from "@/components/ui/app-card";
import { StudioAssetUsagePanel } from "@/components/studio/studio-asset-usage-panel";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import {
  deleteStudioLocationApi,
  fetchStudioLocation,
} from "@/lib/studio-locations-client";
import type { StudioLocationDetail } from "@/types/studio-api";

type StudioLocationDetailViewProps = {
  locationId: string;
};

export function StudioLocationDetailView({ locationId }: StudioLocationDetailViewProps) {
  const t = useActiveTranslator();
  const router = useRouter();
  const session = useAuthSession();
  const [location, setLocation] = useState<StudioLocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetchStudioLocation(locationId);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.locations.error.loadFailed"));
      setLocation(null);
    } else {
      setLocation(res.data.location);
    }
    setLoading(false);
  }, [locationId, t]);

  useEffect(() => {
    if (!session.resolved || !session.user) {
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [session.resolved, session.user, load]);

  const canModify =
    Boolean(session.user?.id && location && location.ownerId === session.user.id);

  const handleDelete = async () => {
    if (!location || !window.confirm(t("studio.locations.deleteConfirm"))) {
      return;
    }
    setDeleting(true);
    const res = await deleteStudioLocationApi(location.id);
    setDeleting(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.locations.error.deleteFailed"));
      return;
    }
    router.push("/studio/locations");
  };

  return (
    <StudioAuthGate
      authTitleKey="studio.locations.authRequiredTitle"
      authBodyKey="studio.locations.authRequiredBody"
    >
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
          <Link
            href="/studio/locations"
            className="text-sm font-medium text-[#006D52] hover:underline"
          >
            ← {t("studio.locations.backToLibrary")}
          </Link>

          {loading ? (
            <p className="mt-8 text-sm text-zinc-500">{t("button.loading")}</p>
          ) : error && !location ? (
            <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : location ? (
            <>
              <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-zinc-900">{location.name}</h1>
                  <div className="mt-2">
                    <StudioLocationCategoryBadge category={location.category} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canModify ? (
                    <>
                      <Link
                        href={`/studio/locations/${location.id}/edit`}
                        className="rounded-full border border-[#0067B1]/40 px-4 py-2 text-sm font-semibold text-[#0067B1] hover:bg-[#0067B1]/5"
                      >
                        {t("studio.locations.action.edit")}
                      </Link>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => void handleDelete()}
                        className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting ? t("button.loading") : t("studio.locations.action.delete")}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <AppCard className="mt-8 overflow-hidden p-0">
                <div className="aspect-video w-full bg-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={location.referenceImageUrl}
                    alt={location.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              </AppCard>

              <AppCard className="mt-6 space-y-4 bg-white p-6">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("studio.locations.field.description")}
                  </h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">
                    {location.description || "—"}
                  </p>
                </div>
                <div className="grid gap-3 border-t border-zinc-100 pt-4 text-sm text-zinc-600 sm:grid-cols-2">
                  <p>
                    <span className="font-semibold text-zinc-700">
                      {t("studio.locations.meta.created")}:{" "}
                    </span>
                    <ClientFormattedDateTime iso={location.createdAt} />
                  </p>
                  <p>
                    <span className="font-semibold text-zinc-700">
                      {t("studio.locations.meta.updated")}:{" "}
                    </span>
                    <ClientFormattedDateTime iso={location.updatedAt} />
                  </p>
                </div>
                {location.ownerEmail ? (
                  <p className="text-xs text-zinc-500">
                    {t("studio.locations.meta.owner")}: {location.ownerEmail}
                  </p>
                ) : null}
              </AppCard>

              <StudioAssetUsagePanel kind="location" assetId={location.id} assetName={location.name} />
            </>
          ) : null}
        </section>
      </main>
    </StudioAuthGate>
  );
}

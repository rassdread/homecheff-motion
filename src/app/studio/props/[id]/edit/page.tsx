"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioPropForm, type StudioPropFormValues } from "@/components/studio/studio-prop-form";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import { fetchStudioProp, updateStudioPropApi } from "@/lib/studio-props-client";
import type { StudioPropDetail } from "@/types/studio-api";

export default function StudioPropEditPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const t = useActiveTranslator();
  const router = useRouter();
  const session = useAuthSession();
  const [prop, setProp] = useState<StudioPropDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    const res = await fetchStudioProp(id);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.props.error.loadFailed"));
      setProp(null);
    } else {
      setProp(res.data.prop);
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
    Boolean(session.user?.id && prop && prop.ownerId === session.user.id);

  const handleSubmit = async (values: StudioPropFormValues) => {
    const res = await updateStudioPropApi(id, {
      name: values.name,
      category: values.category,
      description: values.description,
      ...(values.referenceImageUrl !== prop?.referenceImageUrl
        ? {
            referenceImageUrl: values.referenceImageUrl,
            referenceStorageKey: values.referenceStorageKey,
          }
        : {}),
    });
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.props.error.saveFailed"));
    }
    router.push(`/studio/props/${id}`);
  };

  return (
    <StudioAuthGate
      authTitleKey="studio.props.authRequiredTitle"
      authBodyKey="studio.props.authRequiredBody"
    >
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <Link
            href={`/studio/props/${id}`}
            className="text-sm font-medium text-[#006D52] hover:underline"
          >
            ← {t("studio.props.backToProp")}
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">{t("studio.props.editTitle")}</h1>

          {loading ? (
            <p className="mt-8 text-sm text-zinc-500">{t("button.loading")}</p>
          ) : error ? (
            <p className="mt-8 text-sm text-red-700">{error}</p>
          ) : !canModify ? (
            <p className="mt-8 text-sm text-red-700">{t("studio.props.error.forbidden")}</p>
          ) : prop ? (
            <div className="mt-8">
              <StudioPropForm
                mode="edit"
                initial={prop}
                submitLabel={t("studio.props.saveChanges")}
                backHref={`/studio/props/${id}`}
                onSubmit={handleSubmit}
              />
            </div>
          ) : null}
        </section>
      </main>
    </StudioAuthGate>
  );
}

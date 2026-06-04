"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioCharacterForm,
  type StudioCharacterFormValues,
} from "@/components/studio/studio-character-form";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { createStudioCharacterApi } from "@/lib/studio-characters-client";

export default function StudioCharacterNewPage() {
  const t = useActiveTranslator();
  const router = useRouter();

  const handleSubmit = async (values: StudioCharacterFormValues) => {
    const res = await createStudioCharacterApi({
      name: values.name,
      role: values.role,
      description: values.description,
      personality: values.personality,
      referenceImageUrl: values.referenceImageUrl,
      referenceStorageKey: values.referenceStorageKey,
      voiceEnabled: values.voice.voiceEnabled,
      voiceProvider: values.voice.voiceProvider,
      voiceProfile: values.voice.voiceProfile,
      voiceLanguage: values.voice.voiceLanguage,
      voiceGender: values.voice.voiceGender,
      voiceDescription: values.voice.voiceDescription,
      voiceNotes: values.voice.voiceNotes,
      voiceLock: values.voice.voiceLock,
      voiceProfilesByLanguage: values.voice.voiceProfilesByLanguage,
    });
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.characters.error.saveFailed"));
    }
    router.push(`/studio/characters/${res.data.character.id}`);
  };

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <Link href="/studio/characters" className="text-sm font-medium text-[#006D52] hover:underline">
            ← {t("studio.characters.backToLibrary")}
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">{t("studio.characters.createTitle")}</h1>
          <div className="mt-8">
            <StudioCharacterForm
              mode="create"
              submitLabel={t("studio.characters.save")}
              backHref="/studio/characters"
              onSubmit={handleSubmit}
            />
          </div>
        </section>
      </main>
    </StudioAuthGate>
  );
}

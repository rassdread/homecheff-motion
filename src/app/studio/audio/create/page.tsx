import type { Metadata } from "next";
import { StudioAudioCreatePage } from "@/components/studio/studio-audio-create-page";

export const metadata: Metadata = {
  title: "Audio maken | HomeCheff Studio",
  description: "Stem, muziek of een geluidseffect voorbereiden met de bestaande Studio-generator.",
};

export default function StudioAudioCreateRoute() {
  return <StudioAudioCreatePage />;
}

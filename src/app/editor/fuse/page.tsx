import { redirect } from "next/navigation";
import { buildCharacterStudioHubHref } from "@/lib/character-studio-hub";

export default function EditorFuseRoutePage() {
  redirect(buildCharacterStudioHubHref());
}

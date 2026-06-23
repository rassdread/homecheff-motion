import { redirect } from "next/navigation";
import { buildCharacterStudioFlowHref } from "@/lib/character-studio-hub";

export default function EditorTransformRoutePage() {
  redirect(buildCharacterStudioFlowHref("mascot_transform"));
}

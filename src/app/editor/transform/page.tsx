import { redirect } from "next/navigation";

export default function EditorTransformRoutePage() {
  redirect("/editor/start?workflow=mascot_transform");
}

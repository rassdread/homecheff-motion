import { redirect } from "next/navigation";

export default function EditorFuseRoutePage() {
  redirect("/editor/start?workflow=combine");
}

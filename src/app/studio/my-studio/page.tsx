import { redirect } from "next/navigation";

/** Legacy route — consolidated into /studio home dashboard. */
export default function MyStudioPage() {
  redirect("/studio");
}

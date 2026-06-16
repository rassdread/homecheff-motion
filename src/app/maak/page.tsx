import { redirect } from "next/navigation";

/** Legacy alias — canonical homepage is `/`. */
export default function MaakPage() {
  redirect("/");
}

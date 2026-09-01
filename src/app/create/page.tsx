import { redirect } from "next/navigation";

/** Legacy create chooser — unified Studio home is canonical. */
export default function CreatePage() {
  redirect("/studio");
}

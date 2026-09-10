import type { Metadata } from "next";
import { QuickAdPage } from "@/components/quick-ad/quick-ad-page";

export const metadata: Metadata = {
  title: "Advertentie maken | HomeCheff Studio",
  description:
    "Maak van een foto en een korte beschrijving een verticale social advertentie.",
};

export default function StudioQuickAdRoute() {
  return <QuickAdPage />;
}

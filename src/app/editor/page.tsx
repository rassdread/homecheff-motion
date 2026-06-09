import { Suspense } from "react";
import { EditorProductPage } from "@/components/editor/editor-product-page";

export default function EditorRoutePage() {
  return (
    <Suspense fallback={null}>
      <EditorProductPage />
    </Suspense>
  );
}

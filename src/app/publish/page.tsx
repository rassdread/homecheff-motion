import { Suspense } from "react";
import { PublishProductPage } from "@/components/publish/publish-product-page";

export default function PublishRoutePage() {
  return (
    <Suspense fallback={null}>
      <PublishProductPage />
    </Suspense>
  );
}

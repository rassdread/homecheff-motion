import { Suspense } from "react";
import { PublishProductPage } from "@/components/publish/publish-product-page";

export default function PublishStartRoutePage() {
  return (
    <Suspense fallback={null}>
      <PublishProductPage />
    </Suspense>
  );
}

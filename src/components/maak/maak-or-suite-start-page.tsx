"use client";

import { MaakChoicePage } from "@/components/maak/maak-choice-page";
import { SuiteStartPage } from "@/components/suite/suite-start-page";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";

export function MaakOrSuiteStartPage() {
  if (isHomeCheffProductSuiteNavEnabled()) {
    return <SuiteStartPage />;
  }
  return <MaakChoicePage />;
}

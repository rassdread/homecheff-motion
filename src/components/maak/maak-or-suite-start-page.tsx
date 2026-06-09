"use client";

import { MaakChoicePage } from "@/components/maak/maak-choice-page";
import { UniverseHomePage } from "@/components/suite/universe/universe-home-page";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";

export function MaakOrSuiteStartPage() {
  if (isHomeCheffProductSuiteNavEnabled()) {
    return <UniverseHomePage />;
  }
  return <MaakChoicePage />;
}

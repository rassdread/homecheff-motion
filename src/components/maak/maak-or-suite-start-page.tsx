"use client";

import { MaakChoicePage } from "@/components/maak/maak-choice-page";
import { SuiteHomePage } from "@/components/suite/suite-home-page";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";

export function MaakOrSuiteStartPage() {
  if (isHomeCheffProductSuiteNavEnabled()) {
    return <SuiteHomePage />;
  }
  return <MaakChoicePage />;
}

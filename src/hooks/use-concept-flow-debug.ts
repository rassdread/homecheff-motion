"use client";

import { useEffect, useState } from "react";
import {
  getConceptFlowDebugSnapshot,
  subscribeConceptFlowDebug,
  type ConceptFlowDebugSnapshot,
} from "@/lib/concept-flow-debug-state";

export function useConceptFlowDebug(): ConceptFlowDebugSnapshot {
  const [, bump] = useState(0);
  useEffect(() => subscribeConceptFlowDebug(() => bump((n) => n + 1)), []);
  return getConceptFlowDebugSnapshot();
}

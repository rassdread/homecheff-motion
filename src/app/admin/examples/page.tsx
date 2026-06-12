"use client";

import { useState } from "react";
import { SpaceGallery } from "@/components/examples/space-gallery";
import { listAllExamples, listExamplesForService, type HomeCheffExampleService } from "@/lib/homecheff-examples";

const SERVICES: HomeCheffExampleService[] = ["home", "editor", "studio", "motion", "publish"];

export default function AdminExamplesPage() {
  const [service, setService] = useState<HomeCheffExampleService>("home");
  const examples = service === "home" ? listAllExamples() : listExamplesForService(service);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-zinc-900">Examples</h1>
      <div className="flex flex-wrap gap-2">
        {SERVICES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setService(s)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${service === s ? "bg-[#006D52] text-white" : "bg-zinc-100"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <ul className="space-y-2 text-sm">
        {examples.map((ex) => (
          <li key={ex.id} className="rounded-lg border border-zinc-200 p-3">
            <strong>{ex.title}</strong> — {ex.description} ({ex.tags.join(", ")})
          </li>
        ))}
      </ul>
      <SpaceGallery examples={examples} />
    </div>
  );
}

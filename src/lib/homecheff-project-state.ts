import type { HomeCheffProjectPackage, HomeCheffProjectType } from "@/types/homecheff-project-package";

export type HcProjectStateIndicator = {
  service: HomeCheffProjectType;
  available: boolean;
  labelKey: string;
};

const STATE_LABELS: Record<string, string> = {
  editor: "hcProject.state.editor",
  motion: "hcProject.state.motion",
  publish: "hcProject.state.publish",
  studio: "hcProject.state.studio",
  library: "hcProject.state.library",
};

export function resolveHcProjectStateIndicators(
  project: HomeCheffProjectPackage
): HcProjectStateIndicator[] {
  const services: HomeCheffProjectType[] = ["editor", "motion", "publish", "studio"];
  return services.map((service) => ({
    service,
    available: Boolean(project.servicePayload[service as keyof typeof project.servicePayload]),
    labelKey: STATE_LABELS[service] ?? "hcProject.state.unknown",
  }));
}

export function resolveHcProjectLastService(project: HomeCheffProjectPackage): HomeCheffProjectType {
  return project.targetService ?? project.projectType ?? "editor";
}

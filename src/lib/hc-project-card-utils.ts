import { isUntitledHcProjectName, readHcProjectWorkflowStatus } from "@/lib/hc-project-lifecycle";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export function shouldShowDefaultTitleReminder(project: HomeCheffProjectPackage): boolean {
  if (!isUntitledHcProjectName(project.title)) {
    return false;
  }
  if (project.handoffHistory.length > 0) {
    return true;
  }
  return readHcProjectWorkflowStatus(project) !== "concept";
}

export function formatHcProjectRelativeUpdatedAt(updatedAt: string, now = Date.now()): string {
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) {
    return updatedAt;
  }
  const diffMs = Math.max(0, now - timestamp);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return "just_now";
  }
  if (minutes < 60) {
    return `minutes_${minutes}`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `hours_${hours}`;
  }
  const days = Math.floor(hours / 24);
  return `days_${days}`;
}

export function hcProjectDuplicateTitle(title: string): string {
  return `${title.trim()} (kopie)`;
}

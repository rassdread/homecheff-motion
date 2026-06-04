/**
 * Reorder scene ids for drag-and-drop; returns new id order or null if invalid.
 */
export function reorderSceneIds(
  currentIds: string[],
  activeId: string,
  overId: string
): string[] | null {
  if (activeId === overId) {
    return [...currentIds];
  }
  const oldIndex = currentIds.indexOf(activeId);
  const newIndex = currentIds.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0) {
    return null;
  }
  const next = [...currentIds];
  const [removed] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, removed);
  return next;
}

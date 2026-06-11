/** @deprecated use listInstructionObjectsV2 from editor-instruction-object-v2 */
import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import { categoryLabelKey } from "@/lib/editor-instruction-actions";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorInstructionDetectedObject = {
  id: string;
  labelKey: string;
  label: string;
  layerId?: string;
  confidence: number;
};

export function listInstructionDetectedObjects(
  document: EditorCanvasDocument
): EditorInstructionDetectedObject[] {
  return listInstructionObjectsV2(document).map((obj) => ({
    id: obj.id,
    labelKey: categoryLabelKey(obj.category),
    label: obj.label,
    layerId: obj.layerId,
    confidence: obj.confidence,
  }));
}

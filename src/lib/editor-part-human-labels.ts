import type { EditorPartCategory, EditorCharacterExpression } from "@/types/homecheff-visual-editor";

/** Human-facing labels — never expose segmentation or hierarchy jargon in visual mode. */
const PART_LABELS: Record<EditorPartCategory, string> = {
  root: "Character",
  head: "Head",
  face: "Face",
  hair: "Hair",
  torso: "Body",
  left_arm: "Left Arm",
  right_arm: "Right Arm",
  left_hand: "Left Hand",
  right_hand: "Right Hand",
  legs: "Legs",
  clothing: "Clothing",
  accessory: "Accessory",
  logo: "Logo",
  globe: "Globe",
  tie: "Tie",
  prop: "Object",
  eyes: "Eyes",
  mouth: "Mouth",
  jacket: "Jacket",
  shirt: "Shirt",
  pants: "Pants",
  shoes: "Shoes",
  arms: "Arms",
  hands: "Hands",
  shadow: "Shadow",
  outline: "Face outline",
};

const EXPRESSION_LABELS: Record<EditorCharacterExpression, string> = {
  neutral: "Neutral",
  happy: "Happy",
  focused: "Focused",
  surprised: "Surprised",
  confident: "Confident",
};

export function humanPartLabel(category: EditorPartCategory, fallback?: string): string {
  return PART_LABELS[category] ?? fallback ?? "Object";
}

export function humanExpressionLabel(expression: EditorCharacterExpression): string {
  return EXPRESSION_LABELS[expression];
}

export function isTechnicalEditorTerm(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    lower.includes("segmentation") ||
    lower.includes("instance mask") ||
    lower.includes("hierarchy") ||
    lower.includes("onnx") ||
    lower.includes("bbox")
  );
}

export function sanitizeEditorUserLabel(label: string): string {
  if (isTechnicalEditorTerm(label)) {
    return "Object";
  }
  return label;
}

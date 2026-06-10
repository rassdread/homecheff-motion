"use client";

import { EditorCommandBar } from "@/components/editor/editor-command-bar";
import type { EditorV7ContextualSuggestion } from "@/types/homecheff-visual-editor";

type Props = {
  busy?: boolean;
  suggestions?: EditorV7ContextualSuggestion[];
  onSubmit: (prompt: string) => void;
};

export function EditorMagicEditBar({ busy, suggestions, onSubmit }: Props) {
  return (
    <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-1 shadow-md">
      <EditorCommandBar busy={busy} suggestions={suggestions} onSubmit={onSubmit} variant="magic" />
    </div>
  );
}

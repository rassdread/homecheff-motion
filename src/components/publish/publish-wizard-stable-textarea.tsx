"use client";

import type { TextareaHTMLAttributes } from "react";
import { useStableTextField } from "@/hooks/use-stable-text-field";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onDraftChange?: (value: string) => void;
  onCommit: (value: string) => void;
  debounceMs?: number;
  trackDiagnostics?: boolean;
};

export function PublishWizardStableTextarea({
  value,
  onDraftChange,
  onCommit,
  debounceMs,
  trackDiagnostics,
  className,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  ...rest
}: Props) {
  const { draft, onChange, onFocus, onBlur } = useStableTextField({
    value,
    onCommit,
    debounceMs,
    trackDiagnostics,
  });

  return (
    <textarea
      {...rest}
      value={draft}
      onChange={(e) => {
        onChange(e.target.value, e.target);
        onDraftChange?.(e.target.value);
      }}
      onFocus={(e) => {
        onFocus(e.target);
        onFocusProp?.(e);
      }}
      onBlur={(e) => {
        onBlur();
        onBlurProp?.(e);
      }}
      className={`hc-stable-field hc-wizard-stable-textarea ${className ?? ""}`.trim()}
    />
  );
}

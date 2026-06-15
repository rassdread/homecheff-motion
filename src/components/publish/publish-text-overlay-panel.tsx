"use client";

import { PublishMediaTabButton } from "@/components/publish/publish-media-tab-button";
import { PublishProductionSectionShell } from "@/components/publish/publish-production-section-shell";
import { PublishWizardStableTextarea } from "@/components/publish/publish-wizard-stable-textarea";
import { useActiveTranslator } from "@/i18n/client";
import { upsertTextOverlayItem } from "@/lib/publish-media-panel-state";
import {
  PUBLISH_TEXT_OVERLAY_KINDS,
  PUBLISH_TEXT_OVERLAY_PRESETS,
  type PublishTextOverlayItem,
  type PublishTextOverlaysConfig,
} from "@/types/publish-media-production";

type Props = {
  value: PublishTextOverlaysConfig;
  onChange: (next: PublishTextOverlaysConfig) => void;
};

export function PublishTextOverlayPanel({ value, onChange }: Props) {
  const t = useActiveTranslator();

  const selectKind = (kind: PublishTextOverlayItem["kind"]) => {
    const defaultText = t(`publish.media.textOverlay.default.${kind}` as never);
    const { items, activeId } = upsertTextOverlayItem(value.items, kind, defaultText);
    onChange({ items, activeItemId: activeId });
  };

  const patchItem = (id: string, patch: Partial<PublishTextOverlayItem>) => {
    onChange({
      ...value,
      items: value.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const removeItem = (id: string) => {
    onChange({
      items: value.items.filter((item) => item.id !== id),
      activeItemId: value.activeItemId === id ? undefined : value.activeItemId,
    });
  };

  const activeItem = value.items.find((item) => item.id === value.activeItemId) ?? value.items[0];

  return (
    <PublishProductionSectionShell
      titleKey="publish.media.textOverlay.title"
      summary={
        value.items.length > 0
          ? t("publish.media.textOverlay.activeCount" as never, { count: String(value.items.length) } as never)
          : undefined
      }
      emptyLabelKey={value.items.length === 0 ? "publish.media.textOverlay.noneSelected" : undefined}
      active={value.items.length > 0}
      testId="publish-text-overlay-panel"
    >
      <div role="tablist" aria-label={t("publish.media.textOverlay.title" as never)} className="flex flex-wrap gap-2">
        {PUBLISH_TEXT_OVERLAY_KINDS.map((kind) => {
          const active = value.items.some((item) => item.kind === kind);
          return (
            <PublishMediaTabButton
              key={kind}
              active={active || value.activeItemId === value.items.find((item) => item.kind === kind)?.id}
              testId={`publish-text-overlay-kind-${kind}`}
              onClick={() => selectKind(kind)}
            >
              {t(`publish.media.textOverlay.kind.${kind}` as never)}
            </PublishMediaTabButton>
          );
        })}
      </div>

      {value.items.length === 0 ?
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600" data-testid="publish-text-overlay-empty-state">
          {t("publish.media.textOverlay.emptyAdded" as never)}
        </p>
      : null}

      {activeItem ?
        <div data-testid="publish-text-overlay-editor" className="rounded-xl border border-zinc-200 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase text-zinc-500">
              {t(`publish.media.textOverlay.kind.${activeItem.kind}` as never)}
            </p>
            <button type="button" onClick={() => removeItem(activeItem.id)} className="text-xs font-semibold text-red-600">
              {t("publish.media.remove" as never)}
            </button>
          </div>
          <PublishWizardStableTextarea
            value={activeItem.text}
            rows={2}
            className="mt-2 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            onCommit={(text) => patchItem(activeItem.id, { text })}
          />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <select
              value={activeItem.position}
              onChange={(e) => patchItem(activeItem.id, { position: e.target.value as PublishTextOverlayItem["position"] })}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            >
              <option value="top">{t("publish.media.position.top" as never)}</option>
              <option value="middle">{t("publish.media.position.middle" as never)}</option>
              <option value="bottom">{t("publish.media.position.bottom" as never)}</option>
            </select>
            <select
              value={activeItem.preset}
              onChange={(e) => patchItem(activeItem.id, { preset: e.target.value as PublishTextOverlayItem["preset"] })}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            >
              {PUBLISH_TEXT_OVERLAY_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {t(`publish.media.textOverlay.preset.${preset}` as never)}
                </option>
              ))}
            </select>
          </div>
        </div>
      : null}

      {value.items.length > 1 ?
        <ul className="space-y-2">
          {value.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onChange({ ...value, activeItemId: item.id })}
                className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                  value.activeItemId === item.id || (!value.activeItemId && item.id === activeItem?.id)
                    ? "border-[#0067B1] bg-[#0067B1]/10 font-semibold text-[#0067B1]"
                    : "border-zinc-200 text-zinc-600"
                }`}
              >
                {t(`publish.media.textOverlay.kind.${item.kind}` as never)} — {item.text}
              </button>
            </li>
          ))}
        </ul>
      : null}
    </PublishProductionSectionShell>
  );
}

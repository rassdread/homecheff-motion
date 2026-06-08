"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { StudioWorkspaceCharacterIdentityBuilder } from "@/components/studio/studio-workspace-character-identity-builder";
import { StudioWorkspaceLocationIdentityBuilder } from "@/components/studio/studio-workspace-location-identity-builder";
import { StudioWorkspacePropIdentityBuilder } from "@/components/studio/studio-workspace-prop-identity-builder";
import { StudioWorkspaceWorldIdentityBuilder } from "@/components/studio/studio-workspace-world-identity-builder";
import {
  StudioWorkspaceAssetCreateSheet,
  type WorkspaceAssetCreateKind,
} from "@/components/studio/studio-workspace-asset-create-sheet";
import {
  StudioWorkspaceAssetPicker,
  type WorkspaceAssetPickerItem,
} from "@/components/studio/studio-workspace-asset-picker";
import { useActiveTranslator } from "@/i18n/client";
import { updateStudioLocationApi } from "@/lib/studio-locations-client";
import { updateStudioSceneApi } from "@/lib/studio-storyboards-client";
import type { StudioSceneUpdateInput } from "@/lib/studio-scene-validation";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { StudioToolId } from "@/lib/studio-tool-id";

type AssetTab = "characters" | "locations" | "props" | "worlds";

type Props = {
  tab: AssetTab;
  storyboardId: string;
  scene: StudioSceneDetail | null;
  sceneIndex: number;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  canModify: boolean;
  onSceneUpdated: (scene: StudioSceneDetail) => void;
  onAssetsChanged: () => void;
  onCharacterUpdated?: (character: StudioCharacterListItem) => void;
  onLocationUpdated?: (location: StudioLocationListItem) => void;
  onPropUpdated?: (prop: StudioPropListItem) => void;
  onWorldUpdated?: (world: StudioWorldProfileListItem) => void;
  onSwitchTool?: (tool: StudioToolId) => void;
  storyLanguage?: string;
  storyVoiceProfile?: string | null;
  storyboard?: StudioStoryboardDetail | null;
  memory?: StudioProjectMemorySnapshot | null;
  isAdmin?: boolean;
};

function collectSceneWorlds(scene: StudioSceneDetail) {
  const map = new Map<string, { id: string; name: string }>();
  for (const character of scene.characters) {
    if (character.worldProfile) {
      map.set(character.worldProfile.id, character.worldProfile);
    }
  }
  if (scene.location?.worldProfile) {
    map.set(scene.location.worldProfile.id, scene.location.worldProfile);
  }
  for (const prop of scene.props) {
    if (prop.worldProfile) {
      map.set(prop.worldProfile.id, prop.worldProfile);
    }
  }
  return [...map.values()];
}

export function StudioWorkspaceSceneAssetsPanel({
  tab,
  storyboardId,
  scene,
  sceneIndex,
  characters,
  locations,
  props,
  worlds,
  canModify,
  onSceneUpdated,
  onAssetsChanged,
  onCharacterUpdated,
  onLocationUpdated,
  onPropUpdated,
  onWorldUpdated,
  onSwitchTool,
  storyLanguage = "en",
  storyVoiceProfile,
  storyboard,
  memory,
  isAdmin = false,
}: Props) {
  const t = useActiveTranslator();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createKind, setCreateKind] = useState<WorkspaceAssetCreateKind | null>(null);

  const saveScenePatch = useCallback(
    async (patch: StudioSceneUpdateInput) => {
      if (!scene || !canModify) {
        return;
      }
      setBusy(true);
      setError("");
      const res = await updateStudioSceneApi(storyboardId, scene.id, patch);
      setBusy(false);
      if (!res.ok) {
        setError(t("studio.workspace.assets.saveFailed"));
        return;
      }
      onSceneUpdated(res.data.scene);
    },
    [scene, canModify, storyboardId, onSceneUpdated, t]
  );

  const linkCharacter = (characterId: string) => {
    if (!scene) {
      return;
    }
    const ids = scene.characters.map((c) => c.id);
    if (ids.includes(characterId)) {
      return;
    }
    void saveScenePatch({ characterIds: [...ids, characterId] });
  };

  const unlinkCharacter = (characterId: string) => {
    if (!scene) {
      return;
    }
    void saveScenePatch({
      characterIds: scene.characters.map((c) => c.id).filter((id) => id !== characterId),
    });
  };

  const linkProp = (propId: string) => {
    if (!scene) {
      return;
    }
    const ids = scene.props.map((p) => p.id);
    if (ids.includes(propId)) {
      return;
    }
    void saveScenePatch({ propIds: [...ids, propId] });
  };

  const unlinkProp = (propId: string) => {
    if (!scene) {
      return;
    }
    void saveScenePatch({
      propIds: scene.props.map((p) => p.id).filter((id) => id !== propId),
    });
  };

  const linkLocation = (locationId: string) => {
    void saveScenePatch({ locationId });
  };

  const clearLocation = () => {
    void saveScenePatch({ locationId: null });
  };

  const applyWorldToLocation = async (worldId: string) => {
    if (!scene?.location) {
      setError(t("studio.workspace.assets.worldNeedsLocation"));
      return;
    }
    setBusy(true);
    setError("");
    const res = await updateStudioLocationApi(scene.location.id, { worldProfileId: worldId });
    setBusy(false);
    if (!res.ok) {
      setError(t("studio.workspace.assets.saveFailed"));
      return;
    }
    onAssetsChanged();
    void saveScenePatch({ locationId: scene.location.id });
  };

  const handleCreated = (kind: WorkspaceAssetCreateKind, id: string, _name: string) => {
    onAssetsChanged();
    if (!scene) {
      return;
    }
    if (kind === "character") {
      linkCharacter(id);
    } else if (kind === "location") {
      linkLocation(id);
    } else if (kind === "prop") {
      linkProp(id);
    }
  };

  const pickerItems: WorkspaceAssetPickerItem[] = useMemo(() => {
    if (tab === "characters") {
      return characters.map((c) => ({
        id: c.id,
        name: c.name,
        meta: c.role,
        thumbUrl: c.referenceImageUrl,
      }));
    }
    if (tab === "locations") {
      return locations.map((l) => ({
        id: l.id,
        name: l.name,
        meta: l.category,
        thumbUrl: l.referenceImageUrl,
      }));
    }
    if (tab === "props") {
      return props.map((p) => ({
        id: p.id,
        name: p.name,
        meta: p.category,
        thumbUrl: p.referenceImageUrl,
      }));
    }
    return worlds.map((w) => ({ id: w.id, name: w.name, meta: w.visualStyle || undefined }));
  }, [tab, characters, locations, props, worlds]);

  const linkedIds = useMemo(() => {
    if (!scene) {
      return new Set<string>();
    }
    if (tab === "characters") {
      return new Set(scene.characters.map((c) => c.id));
    }
    if (tab === "props") {
      return new Set(scene.props.map((p) => p.id));
    }
    if (tab === "locations" && scene.locationId) {
      return new Set([scene.locationId]);
    }
    return new Set<string>();
  }, [scene, tab]);

  const pickerTitle =
    tab === "characters"
      ? t("studio.workspace.assets.chooseFromLibrary")
      : tab === "locations"
        ? t("studio.workspace.assets.chooseLocation")
        : tab === "props"
          ? t("studio.workspace.assets.chooseFromLibrary")
          : t("studio.workspace.assets.chooseWorld");

  const sceneWorlds = scene ? collectSceneWorlds(scene) : [];

  if (tab === "worlds") {
    return (
      <div className="space-y-6 pb-8">
        <StudioWorkspaceWorldIdentityBuilder
          worlds={worlds}
          characters={characters}
          locations={locations}
          props={props}
          storyboard={storyboard}
          memory={memory}
          canModify={canModify}
          isAdmin={isAdmin}
          onSwitchTool={onSwitchTool}
          onWorldUpdated={(updated) => {
            onWorldUpdated?.(updated);
            onAssetsChanged();
          }}
        />

        {!scene ?
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
            {t("studio.workspace.assets.noSceneHint")}
          </p>
        : (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.workspace.assets.sceneLabel", { n: String(sceneIndex + 1) })}
              </p>
              <p className="mt-0.5 text-sm text-zinc-600">
                {t("studio.workspace.assets.linkedToScene")}
              </p>
            </div>
            {error ?
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            : null}
            <p className="text-sm text-zinc-600">{t("studio.workspace.assets.worldContextHint")}</p>
            {sceneWorlds.length > 0 ?
              <ul className="space-y-2">
                {sceneWorlds.map((world) => (
                  <li
                    key={world.id}
                    className="rounded-xl border border-[#006D52]/20 bg-[#006D52]/5 px-3 py-2 text-sm font-medium text-zinc-900"
                  >
                    {world.name}
                  </li>
                ))}
              </ul>
            : (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-4 text-sm text-zinc-500">
                {t("studio.workspace.assets.noSceneWorld")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {canModify ?
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPickerOpen(true)}
                    className="rounded-full bg-[#0067B1]/10 px-4 py-2 text-xs font-semibold text-[#0067B1]"
                  >
                    {t("studio.workspace.assets.chooseWorld")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setCreateKind("world")}
                    className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800"
                  >
                    {t("studio.workspace.assets.newWorld")}
                  </button>
                </>
              : null}
            </div>
          </>
        )}

        <StudioWorkspaceAssetPicker
          open={pickerOpen}
          title={pickerTitle}
          items={pickerItems}
          linkedIds={linkedIds}
          onClose={() => setPickerOpen(false)}
          onSelect={(id) => {
            setPickerOpen(false);
            if (scene) void applyWorldToLocation(id);
          }}
        />
        {createKind ?
          <StudioWorkspaceAssetCreateSheet
            open={Boolean(createKind)}
            kind={createKind}
            storyboardId={storyboardId}
            onClose={() => setCreateKind(null)}
            onCreated={(kind, id, name) => {
              setCreateKind(null);
              handleCreated(kind, id, name);
            }}
          />
        : null}
      </div>
    );
  }

  if (tab === "props") {
    return (
      <div className="space-y-6 pb-8">
        <StudioWorkspacePropIdentityBuilder
          props={props}
          characters={characters}
          worlds={worlds}
          locations={locations}
          storyboard={storyboard}
          memory={memory}
          canModify={canModify}
          onPropUpdated={(updated) => {
            onPropUpdated?.(updated);
            onAssetsChanged();
          }}
        />

        {!scene ?
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
            {t("studio.workspace.assets.noSceneHint")}
          </p>
        : (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.workspace.assets.sceneLabel", { n: String(sceneIndex + 1) })}
              </p>
              <p className="mt-0.5 text-sm text-zinc-600">
                {t("studio.workspace.assets.linkedToScene")}
              </p>
            </div>
            {error ?
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            : null}
            <div className="flex flex-wrap gap-2">
              {canModify ?
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPickerOpen(true)}
                    className="rounded-full bg-[#0067B1]/10 px-4 py-2 text-xs font-semibold text-[#0067B1]"
                  >
                    {t("studio.workspace.assets.addProp")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setCreateKind("prop")}
                    className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800"
                  >
                    {t("studio.workspace.assets.newProp")}
                  </button>
                </>
              : null}
            </div>
            <ul className="space-y-2">
              {scene.props.map((prop) => {
                const fresh = props.find((p) => p.id === prop.id) ?? prop;
                return (
                  <li
                    key={prop.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3"
                  >
                    <div className="flex items-center gap-3">
                      {fresh.referenceImageUrl ?
                        <img
                          src={fresh.referenceImageUrl}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      : null}
                      <p className="text-sm font-semibold text-zinc-900">{fresh.name}</p>
                    </div>
                    {canModify ?
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => unlinkProp(prop.id)}
                        className="text-xs font-semibold text-red-700 hover:underline"
                      >
                        {t("studio.workspace.assets.removeFromScene")}
                      </button>
                    : null}
                  </li>
                );
              })}
              {scene.props.length === 0 ?
                <li className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                  {t("studio.workspace.assets.noLinkedProps")}
                </li>
              : null}
            </ul>
          </>
        )}

        <StudioWorkspaceAssetPicker
          open={pickerOpen}
          title={pickerTitle}
          items={pickerItems}
          linkedIds={linkedIds}
          onClose={() => setPickerOpen(false)}
          onSelect={(id) => {
            setPickerOpen(false);
            if (scene) linkProp(id);
          }}
        />
        {createKind ?
          <StudioWorkspaceAssetCreateSheet
            open={Boolean(createKind)}
            kind={createKind}
            storyboardId={storyboardId}
            onClose={() => setCreateKind(null)}
            onCreated={(kind, id, name) => {
              setCreateKind(null);
              handleCreated(kind, id, name);
            }}
          />
        : null}
      </div>
    );
  }

  if (tab === "locations") {
    return (
      <div className="space-y-6 pb-8">
        <StudioWorkspaceLocationIdentityBuilder
          locations={locations}
          worlds={worlds}
          characters={characters}
          props={props}
          storyboard={storyboard}
          memory={memory}
          canModify={canModify}
          isAdmin={isAdmin}
          onLocationUpdated={(updated) => {
            onLocationUpdated?.(updated);
            onAssetsChanged();
          }}
        />

        {!scene ?
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
            {t("studio.workspace.assets.noSceneHint")}
          </p>
        : (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.workspace.assets.sceneLabel", { n: String(sceneIndex + 1) })}
              </p>
              <p className="mt-0.5 text-sm text-zinc-600">
                {t("studio.workspace.assets.linkedToScene")}
              </p>
            </div>
            {error ?
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            : null}
            <div className="flex flex-wrap gap-2">
              {canModify ?
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPickerOpen(true)}
                    className="rounded-full bg-[#0067B1]/10 px-4 py-2 text-xs font-semibold text-[#0067B1]"
                  >
                    {t("studio.workspace.assets.chooseLocation")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setCreateKind("location")}
                    className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800"
                  >
                    {t("studio.workspace.assets.newLocation")}
                  </button>
                </>
              : null}
            </div>
            {scene.location ?
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3">
                <div className="flex items-center gap-3">
                  {scene.location.referenceImageUrl ?
                    <img
                      src={scene.location.referenceImageUrl}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  : null}
                  <p className="text-sm font-semibold text-zinc-900">{scene.location.name}</p>
                </div>
                {canModify ?
                  <button
                    type="button"
                    disabled={busy}
                    onClick={clearLocation}
                    className="text-xs font-semibold text-red-700 hover:underline"
                  >
                    {t("studio.workspace.assets.removeFromScene")}
                  </button>
                : null}
              </div>
            : (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                {t("studio.workspace.assets.noLinkedLocation")}
              </p>
            )}
          </>
        )}

        <StudioWorkspaceAssetPicker
          open={pickerOpen}
          title={pickerTitle}
          items={pickerItems}
          linkedIds={linkedIds}
          onClose={() => setPickerOpen(false)}
          onSelect={(id) => {
            setPickerOpen(false);
            if (scene) linkLocation(id);
          }}
        />
        {createKind ?
          <StudioWorkspaceAssetCreateSheet
            open={Boolean(createKind)}
            kind={createKind}
            storyboardId={storyboardId}
            onClose={() => setCreateKind(null)}
            onCreated={(kind, id, name) => {
              setCreateKind(null);
              handleCreated(kind, id, name);
            }}
          />
        : null}
      </div>
    );
  }

  if (tab === "characters") {
    return (
      <div className="space-y-6 pb-8">
        <StudioWorkspaceCharacterIdentityBuilder
          characters={characters}
          worlds={worlds}
          locations={locations}
          props={props}
          storyboard={storyboard}
          memory={memory}
          canModify={canModify}
          isAdmin={isAdmin}
          storyLanguage={storyLanguage}
          storyVoiceProfile={storyVoiceProfile}
          onCharacterUpdated={(updated) => {
            onCharacterUpdated?.(updated);
            onAssetsChanged();
          }}
        />

        {!scene ?
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
            {t("studio.workspace.assets.noSceneHint")}
          </p>
        : (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.workspace.assets.sceneLabel", { n: String(sceneIndex + 1) })}
              </p>
              <p className="mt-0.5 text-sm text-zinc-600">
                {t("studio.workspace.assets.linkedToScene")}
              </p>
            </div>
            {error ?
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            : null}
            <div className="flex flex-wrap gap-2">
              {canModify ?
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPickerOpen(true)}
                    className="rounded-full bg-[#0067B1]/10 px-4 py-2 text-xs font-semibold text-[#0067B1]"
                  >
                    {t("studio.workspace.assets.addCharacter")}
                  </button>
                  <Link
                    href="/studio/characters/new"
                    className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                  >
                    {t("studio.workspace.assets.newCharacter")}
                  </Link>
                </>
              : null}
            </div>
            <ul className="space-y-2">
              {scene.characters.map((character) => {
                const fresh = characters.find((c) => c.id === character.id) ?? character;
                return (
                  <li key={character.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2">
                    <span className="text-sm font-medium text-zinc-900">{fresh.name}</span>
                    {canModify ?
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => unlinkCharacter(character.id)}
                        className="text-xs font-semibold text-red-700 hover:underline"
                      >
                        {t("studio.workspace.assets.removeFromScene")}
                      </button>
                    : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <StudioWorkspaceAssetPicker
          open={pickerOpen}
          title={pickerTitle}
          items={pickerItems}
          linkedIds={linkedIds}
          onClose={() => setPickerOpen(false)}
          onSelect={(id) => {
            setPickerOpen(false);
            if (scene) linkCharacter(id);
          }}
        />
        {createKind ?
          <StudioWorkspaceAssetCreateSheet
            open={Boolean(createKind)}
            kind={createKind}
            storyboardId={storyboardId}
            onClose={() => setCreateKind(null)}
            onCreated={(kind, id, name) => {
              setCreateKind(null);
              handleCreated(kind, id, name);
            }}
          />
        : null}
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
        <p className="text-sm font-medium text-zinc-800">{t("studio.workspace.assets.noSceneTitle")}</p>
        <p className="mt-2 text-sm text-zinc-600">{t("studio.workspace.assets.noSceneHint")}</p>
      </div>
    );
  }

  const openCreate = (kind: WorkspaceAssetCreateKind) => setCreateKind(kind);

  return (
    <div className="space-y-4 pb-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("studio.workspace.assets.sceneLabel", { n: String(sceneIndex + 1) })}
        </p>
        <p className="mt-0.5 text-sm text-zinc-600">{t("studio.workspace.assets.linkedToScene")}</p>
      </div>

      {error ?
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      : null}

      <StudioWorkspaceAssetPicker
        open={pickerOpen}
        title={pickerTitle}
        items={pickerItems}
        linkedIds={linkedIds}
        onClose={() => setPickerOpen(false)}
        onSelect={(id) => {
          void applyWorldToLocation(id);
        }}
      />

      {createKind ?
        <StudioWorkspaceAssetCreateSheet
          open={Boolean(createKind)}
          kind={createKind}
          storyboardId={storyboardId}
          onClose={() => setCreateKind(null)}
          onCreated={handleCreated}
        />
      : null}
    </div>
  );
}

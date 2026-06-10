"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { EditorPostUploadModePicker } from "@/components/editor/editor-post-upload-mode-picker";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { fetchAssetDerivationSources } from "@/lib/studio-asset-derivation-client";
import { uploadEditorSourceImage } from "@/lib/editor-image-upload";
import {
  applyPostUploadMode,
  type EditorPostUploadMode,
} from "@/lib/editor-start-flow";
import {
  createEditorDocumentFromLibrarySource,
  createEditorDocumentFromUpload,
  listRecentEditorDocuments,
  runEditorVisionAndObjectDetection,
  saveEditorCanvasDocument,
} from "@/lib/editor-canvas-session";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  onOpenDocument: (document: EditorCanvasDocument) => void;
};

export function EditorStartScreen({ onOpenDocument }: Props) {
  const t = useActiveTranslator();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [sources, setSources] = useState<AssetDerivationSourceListItem[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState(() => listRecentEditorDocuments());
  const [pendingDocument, setPendingDocument] = useState<EditorCanvasDocument | null>(null);
  const [showRecent, setShowRecent] = useState(false);

  const finishOpen = async (document: EditorCanvasDocument, mode: EditorPostUploadMode) => {
    const withMode = applyPostUploadMode(document, mode);
    saveEditorCanvasDocument(withMode);
    setRecent(listRecentEditorDocuments());
    const analyzed = await runEditorVisionAndObjectDetection(withMode);
    onOpenDocument(analyzed);
    setPendingDocument(null);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadEditorSourceImage(file);
      const doc = createEditorDocumentFromUpload({
        name: file.name.replace(/\.[^.]+$/, ""),
        backgroundUrl: uploaded.workingImageUrl,
        backgroundStorageKey: uploaded.workingStorageKey,
      });
      setPendingDocument(doc);
    } catch {
      setError(t("editor.start.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const loadLibrary = async () => {
    setLoadingSources(true);
    setError("");
    const res = await fetchAssetDerivationSources();
    setLoadingSources(false);
    if (!res.ok) {
      setError(t("editor.start.libraryFailed"));
      return;
    }
    setSources(res.data.sources.filter((s) => s.referenceImageUrl?.trim()));
    setShowLibrary(true);
  };

  if (pendingDocument) {
    return (
      <StudioAuthGate authTitleKey="editor.start.authTitle" authBodyKey="editor.start.authBody">
        <main className={`flex-1 ${brand.softGradientBg}`}>
          <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
            <EditorPostUploadModePicker
              imageName={pendingDocument.name}
              busy={uploading}
              onSelectMode={(mode) => void finishOpen(pendingDocument, mode)}
            />
          </section>
        </main>
      </StudioAuthGate>
    );
  }

  return (
    <StudioAuthGate authTitleKey="editor.start.authTitle" authBodyKey="editor.start.authBody">
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0067B1]">
            {t("suite.nav.editor")}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {t("editor.startFlow.title" as never)}
          </h1>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="min-h-[120px] rounded-2xl border border-[#0067B1]/30 bg-white p-5 text-left shadow-sm hover:bg-[#0067B1]/5"
            >
              <p className="font-semibold text-slate-900">{t("editor.start.upload")}</p>
              <p className="mt-1 text-sm text-slate-600">{t("editor.startFlow.uploadHint" as never)}</p>
            </button>
            <button
              type="button"
              disabled={loadingSources}
              onClick={() => void loadLibrary()}
              className="min-h-[120px] rounded-2xl border border-[#006D52]/30 bg-white p-5 text-left shadow-sm hover:bg-[#006D52]/5"
            >
              <p className="font-semibold text-slate-900">{t("editor.start.chooseLibrary")}</p>
              <p className="mt-1 text-sm text-slate-600">{t("editor.startFlow.libraryHint" as never)}</p>
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleUpload(file);
              }
            }}
          />

          {error ?
            <p className="mt-4 text-sm text-red-700">{error}</p>
          : null}

          {recent.length > 0 ?
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setShowRecent((v) => !v)}
                className="text-sm font-semibold text-[#0067B1] hover:underline"
              >
                {t("editor.startFlow.continueRecent" as never)}
              </button>
              {showRecent ?
                <ul className="mt-3 space-y-2 text-left">
                  {recent.map((doc) => (
                    <li key={doc.sessionId}>
                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc)}
                        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm hover:bg-zinc-50"
                      >
                        <span className="font-medium">{doc.name}</span>
                        <span className="text-xs text-zinc-500">{doc.status}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              : null}
            </div>
          : null}

          {showLibrary ?
            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{t("editor.start.libraryPicker")}</h2>
                <button type="button" className="text-sm text-zinc-600" onClick={() => setShowLibrary(false)}>
                  {t("editor.start.closePicker")}
                </button>
              </div>
              <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                {sources.map((source) => (
                  <li key={`${source.assetId}-${source.name}`}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2 text-left hover:bg-zinc-50"
                      onClick={() => {
                        setPendingDocument(createEditorDocumentFromLibrarySource(source));
                        setShowLibrary(false);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={source.thumbnailUrl || source.referenceImageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                      <span className="text-sm font-medium">{source.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          : null}
        </section>
      </main>
    </StudioAuthGate>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAnimationProjectDetail } from "@/lib/instant-premium-polling-api";
import { getProjectLanguageExports } from "@/lib/instant-export-client";
import { fetchStoryboardMotionProjects } from "@/lib/studio-storyboards-client";
import {
  shouldPollStudioMotionStatus,
  resolveStudioMotionVideoState,
} from "@/lib/studio-motion-project-display";
import { useInstantPremiumStatusPolling } from "@/hooks/use-instant-premium-status-polling";
import type {
  AnimationProjectDetailResponse,
  VideoLanguageExportSummary,
} from "@/types/animation-api";
import type { StudioMotionProjectSummary } from "@/types/studio-api";

export function pickPrimaryMotionProject(
  projects: StudioMotionProjectSummary[]
): StudioMotionProjectSummary | null {
  if (projects.length === 0) {
    return null;
  }
  return projects.find((project) => project.hasCompletedFinal) ?? projects[0] ?? null;
}

export function useStoryboardMotionProjects(storyboardId: string, enabled: boolean) {
  const [projects, setProjects] = useState<StudioMotionProjectSummary[]>([]);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }
    setLoading(true);
    const res = await fetchStoryboardMotionProjects(storyboardId);
    if (res.ok) {
      setProjects(res.data.projects);
    } else {
      setProjects([]);
    }
    setLoading(false);
  }, [enabled, storyboardId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await fetchStoryboardMotionProjects(storyboardId);
      if (cancelled) {
        return;
      }
      if (res.ok) {
        setProjects(res.data.projects);
      } else {
        setProjects([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, storyboardId]);

  return { projects, loading, refresh };
}

export function useStudioMotionProjectDetail(projectId: string | null, pollEnabled: boolean) {
  const [detail, setDetail] = useState<AnimationProjectDetailResponse | null>(null);
  const [languageExports, setLanguageExports] = useState<VideoLanguageExportSummary[]>([]);
  const [detailLoading, setDetailLoading] = useState(Boolean(projectId));
  const [detailError, setDetailError] = useState("");

  const loadDetail = useCallback(async () => {
    if (!projectId) {
      setDetail(null);
      setLanguageExports([]);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    setDetailError("");
    const [detailRes, exportsResult] = await Promise.all([
      fetchAnimationProjectDetail(projectId),
      getProjectLanguageExports(projectId),
    ]);
    if (detailRes.ok) {
      setDetail(detailRes.data);
    } else {
      setDetail(null);
      setDetailError(detailRes.data?.error ?? `HTTP ${detailRes.status}`);
    }
    setLanguageExports(exportsResult.exports);
    setDetailLoading(false);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!projectId) {
        setDetail(null);
        setLanguageExports([]);
        setDetailLoading(false);
        return;
      }
      void (async () => {
        setDetailLoading(true);
        setDetailError("");
        const [detailRes, exportsResult] = await Promise.all([
          fetchAnimationProjectDetail(projectId),
          getProjectLanguageExports(projectId),
        ]);
        if (cancelled) {
          return;
        }
        if (detailRes.ok) {
          setDetail(detailRes.data);
        } else {
          setDetail(null);
          setDetailError(detailRes.data?.error ?? `HTTP ${detailRes.status}`);
        }
        setLanguageExports(exportsResult.exports);
        setDetailLoading(false);
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [projectId]);

  const pollActive = Boolean(projectId && pollEnabled && shouldPollStudioMotionStatus(detail));
  const {
    snapshot,
    lastPolledAtMs,
    lastProgressChangeAtMs,
    pollNow,
    pollingError,
  } = useInstantPremiumStatusPolling(projectId ?? "", pollActive);

  const videoState = useMemo(() => {
    if (!detail) {
      return null;
    }
    return resolveStudioMotionVideoState({ detail, snapshot });
  }, [detail, snapshot]);

  return {
    detail,
    languageExports,
    setLanguageExports,
    detailLoading,
    detailError,
    snapshot,
    lastPolledAtMs,
    lastProgressChangeAtMs,
    pollNow,
    pollingError,
    videoState,
    refresh: loadDetail,
    pollActive,
  };
}

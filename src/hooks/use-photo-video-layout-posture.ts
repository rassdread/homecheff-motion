"use client";

import { useEffect, useState } from "react";

export type PhotoVideoLayoutPosture = "desktop" | "phone-portrait" | "phone-landscape";

function readPosture(): PhotoVideoLayoutPosture {
  if (typeof window === "undefined") return "phone-portrait";
  if (window.matchMedia("(min-width: 1024px)").matches) return "desktop";
  if (window.matchMedia("(max-width: 1023px) and (orientation: landscape)").matches) {
    return "phone-landscape";
  }
  return "phone-portrait";
}

export function usePhotoVideoLayoutPosture(): PhotoVideoLayoutPosture {
  const [posture, setPosture] = useState<PhotoVideoLayoutPosture>("phone-portrait");

  useEffect(() => {
    const update = () => setPosture(readPosture());
    update();
    const desktopMq = window.matchMedia("(min-width: 1024px)");
    const landscapeMq = window.matchMedia("(max-width: 1023px) and (orientation: landscape)");
    desktopMq.addEventListener("change", update);
    landscapeMq.addEventListener("change", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);
    return () => {
      desktopMq.removeEventListener("change", update);
      landscapeMq.removeEventListener("change", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return posture;
}

export function usePhotoVideoKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setOpen(vv.height < window.innerHeight * 0.82);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return open;
}

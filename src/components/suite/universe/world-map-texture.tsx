"use client";

import {
  WORLD_MAP_ASSET_PATH,
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
} from "@/lib/universe-globe-earth";

type WorldMapTextureProps = {
  visible: boolean;
};

/** Public-domain Natural Earth equirectangular land/ocean map — duplicated for seamless rotation */
export function WorldMapTexture({ visible }: WorldMapTextureProps) {
  if (!visible) return null;

  return (
    <div
      className="flex h-full min-w-[200%] w-[200%]"
      aria-hidden
    >
      {[0, 1].map((copy) => (
        <img
          key={copy}
          src={WORLD_MAP_ASSET_PATH}
          alt=""
          width={WORLD_MAP_WIDTH}
          height={WORLD_MAP_HEIGHT}
          className="universe-globe-world-map h-full w-1/2 min-w-[50%] flex-shrink-0 object-cover object-center"
          draggable={false}
        />
      ))}
    </div>
  );
}

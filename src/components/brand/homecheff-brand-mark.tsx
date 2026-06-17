import Image from "next/image";
import {
  HOMECHEFF_BRAND_ICON_ALT,
  HOMECHEFF_BRAND_ICON_PATHS,
} from "@/lib/homecheff-brand-icon";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  /** Header mark: 28px mobile, 32px desktop */
  size?: "header" | "sm";
  className?: string;
  priority?: boolean;
};

const SIZE_PX = {
  header: 32,
  sm: 24,
} as const;

export function HomeCheffBrandMark({ size = "header", className = "", priority = false }: Props) {
  const px = SIZE_PX[size];
  return (
    <div
      className={`${studioVisual.logoMark} shrink-0 bg-white ${className}`}
      data-testid="homecheff-brand-mark"
    >
      <Image
        src={HOMECHEFF_BRAND_ICON_PATHS.primary}
        alt={HOMECHEFF_BRAND_ICON_ALT}
        width={px}
        height={px}
        className="h-full w-full object-contain object-center"
        priority={priority}
      />
    </div>
  );
}

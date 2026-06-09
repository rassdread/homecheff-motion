import type { UniversePlanetId } from "@/lib/universe-home-config";

type PlanetIconProps = {
  id: UniversePlanetId;
  className?: string;
};

export function UniversePlanetIcon({ id, className = "h-5 w-5" }: PlanetIconProps) {
  switch (id) {
    case "editor":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="9" cy="10" r="2" fill="currentColor" opacity="0.7" />
          <path d="M6 17l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "studio":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 18V6l8 4 8-4v12l-8 4-8-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 10v12" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        </svg>
      );
    case "motion":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="7" cy="12" r="2" fill="currentColor" />
        </svg>
      );
    case "publish":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 20h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M7 9h10M7 12h6" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
        </svg>
      );
    case "library":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 6v12M12 6v12M16 6v12" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
        </svg>
      );
  }
}

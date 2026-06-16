"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { studioLibraryVisual } from "@/lib/studio-library-visual";

export type StudioLibraryBreadcrumb = {
  label: string;
  href?: string;
};

type Props = {
  breadcrumbs?: StudioLibraryBreadcrumb[];
  backHref?: string;
  backLabel?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  titleSize?: "default" | "large";
};

export function StudioLibraryPageHero({
  breadcrumbs,
  backHref,
  backLabel,
  title,
  description,
  actions,
  titleSize = "default",
}: Props) {
  return (
    <header data-testid="studio-library-page-hero">
      {breadcrumbs && breadcrumbs.length > 0 ?
        <nav className={studioLibraryVisual.heroBreadcrumb} aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`}>
              {index > 0 ?
                <span className={studioLibraryVisual.heroBreadcrumbSep}>/</span>
              : null}
              {crumb.href ?
                <Link href={crumb.href} className={studioLibraryVisual.heroBreadcrumbLink}>
                  {crumb.label}
                </Link>
              : <span className={studioLibraryVisual.heroBreadcrumbCurrent}>{crumb.label}</span>}
            </span>
          ))}
        </nav>
      : null}
      {backHref && backLabel ?
        <Link href={backHref} className={`${studioLibraryVisual.heroBackLink} ${breadcrumbs ? "mt-3" : ""}`}>
          ← {backLabel}
        </Link>
      : null}
      <div className={`flex flex-wrap items-start justify-between gap-3 ${backHref || breadcrumbs ? "mt-1" : ""}`}>
        <div className="min-w-0">
          <h1 className={titleSize === "large" ? studioLibraryVisual.heroTitleLarge : studioLibraryVisual.heroTitle}>
            {title}
          </h1>
          {description ?
            <p className={studioLibraryVisual.heroDescription}>{description}</p>
          : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

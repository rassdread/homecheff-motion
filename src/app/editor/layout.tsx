import { PUBLIC_PAGE_SEO } from "@/lib/seo/public-pages";
import { buildAppToolNoIndexMetadata, buildPageMetadata } from "@/lib/seo/site-metadata";
import { Suspense } from "react";
import { StudioProjectReturnLink } from "@/components/studio/studio-project-return-link";

const seo = PUBLIC_PAGE_SEO.editor;

export const metadata = {
  ...buildPageMetadata({
    title: seo.title,
    description: seo.description,
    path: seo.path,
  }),
  ...buildAppToolNoIndexMetadata(),
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <StudioProjectReturnLink />
      </Suspense>
      {children}
    </>
  );
}

import { PUBLIC_PAGE_SEO } from "@/lib/seo/public-pages";
import { buildAppToolNoIndexMetadata, buildPageMetadata } from "@/lib/seo/site-metadata";

const seo = PUBLIC_PAGE_SEO.library;

export const metadata = {
  ...buildPageMetadata({
    title: seo.title,
    description: seo.description,
    path: seo.path,
  }),
  ...buildAppToolNoIndexMetadata(),
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}

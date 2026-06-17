import { PUBLIC_PAGE_SEO } from "@/lib/seo/public-pages";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

const seo = PUBLIC_PAGE_SEO.signup;

export const metadata = buildPageMetadata({
  title: seo.title,
  description: seo.description,
  path: seo.path,
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}

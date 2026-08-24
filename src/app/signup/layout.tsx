import { JsonLd } from "@/components/seo/json-ld";
import { CommercialSeoEnrichment } from "@/components/seo/commercial-seo-enrichment";
import { buildFaqPageJsonLd, buildSoftwareApplicationJsonLd } from "@/lib/seo/structured-data";
import { PUBLIC_PAGE_SEO } from "@/lib/seo/public-pages";
import { buildAppToolNoIndexMetadata, buildPageMetadata } from "@/lib/seo/site-metadata";

const seo = PUBLIC_PAGE_SEO.signup;

const SIGNUP_FAQ = [
  {
    question: "Is HomeCheff Studio free to try?",
    answer:
      "Yes. Create an account without a credit card, explore Studio and image-to-video motion, then purchase credits when you are ready.",
  },
  {
    question: "What should I do after signing up?",
    answer:
      "Open Studio for storyboard-first campaigns or Image to Video for quick motion clips. Compare plans on the pricing page.",
  },
];

export const metadata = {
  ...buildPageMetadata({
    title: seo.title,
    description: seo.description,
    path: seo.path,
  }),
  ...buildAppToolNoIndexMetadata(),
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={buildFaqPageJsonLd(SIGNUP_FAQ)} />
      {children}
      <CommercialSeoEnrichment variant="signup" />
    </>
  );
}

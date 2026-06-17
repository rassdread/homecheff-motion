import { buildPageMetadata } from "@/lib/seo/site-metadata";

export const metadata = buildPageMetadata({
  title: "Motion",
  description: "Create AI video clips and motion renders from your Studio storyboards.",
  path: "/animate/instant",
});

export default function MotionLayout({ children }: { children: React.ReactNode }) {
  return children;
}

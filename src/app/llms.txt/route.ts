/**
 * Compact machine-readable brief for AI/search crawlers (llms.txt convention).
 * Keep factual — no invented Studio features.
 */

const LLMS_TXT = `# HomeCheff Studio

Official spelling: HomeCheff (double f).

## Parent ecosystem
HomeCheff is an ecosystem for local entrepreneurship, creation and earning. It connects Marketplace, HomeCheff Studio, HomeCheff Growth and Affiliate/Partners in one system. People and businesses can create, offer and sell, produce content, find customers, promote and earn.

## Studio (CREATE layer)
HomeCheff Studio is the CREATE layer of that ecosystem. It helps people and businesses create promotional images, video, motion and related content for products, services and businesses — then connect into the HomeCheff loop.

Loop: CREATE → SELL → GROW → PROMOTE → EARN → REPEAT.

## Links
- Studio: https://studio.homecheff.eu/
- Ecosystem: https://homecheff.eu/ecosystem
- Marketplace: https://homecheff.eu/
- Growth: https://growth.homecheff.eu/
- Affiliate/Partners: https://homecheff.eu/affiliate

## Schema.org @id
- Studio Organization: https://studio.homecheff.eu/#organization (name: HomeCheff Studio)
- Studio WebSite: https://studio.homecheff.eu/#website
- Studio SoftwareApplication (primary): https://studio.homecheff.eu/#app
- Parent Organization: https://homecheff.eu/#organization

## Legal operator
Arrias Beheer B.V. (KvK 80532829)
`;

export function GET() {
  return new Response(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

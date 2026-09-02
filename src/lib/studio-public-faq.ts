/**
 * Canonical Studio public FAQ — Production-aligned.
 * Free Music: curated CC0 catalog (Quick Video) when feature flag enabled.
 * monthlyCredits = 0 on live plans; Studio affiliate explanation at /affiliate (pack residual payout ON).
 */

export type StudioFaqItem = {
  id: string;
  question: string;
  answer: string;
  legalSource?: string;
};

export const STUDIO_PUBLIC_FAQ: StudioFaqItem[] = [
  {
    id: "what-is-studio",
    question: "What is HomeCheff Studio?",
    answer:
      "HomeCheff Studio is the CREATE layer of the HomeCheff ecosystem: tools to create and export video, motion, voice and related media for food and local-business storytelling.",
  },
  {
    id: "who-for",
    question: "Who is Studio for?",
    answer:
      "Creators, cooks, local businesses and teams who want to produce media without treating Studio as a guaranteed marketing or income product.",
  },
  {
    id: "without-marketplace",
    question: "Can Studio be used without Marketplace?",
    answer:
      "Yes. Studio is a separate product. You can create and export content without selling on Marketplace. Ecosystem account/SSO may still be shared.",
  },
  {
    id: "what-create",
    question: "What can be created?",
    answer:
      "Depending on live features: photo-to-video / motion projects, scene clips, voice, sound, subtitles/exports and project libraries. Experimental features may appear as labelled tools — only live Production paths are supported.",
  },
  {
    id: "file-types",
    question: "Which file types can be uploaded?",
    answer:
      "Common image, video and audio formats accepted by the live upload UI. Always use media you have rights to. Exact extensions depend on the active editor surface.",
  },
  {
    id: "uploaded-media",
    question: "What happens to uploaded media?",
    answer:
      "Uploads are stored to provide Studio (projects, rendering, previews, exports). Media may be sent to third-party AI/media providers when you start a generation that requires them.",
    legalSource: "/privacy",
  },
  {
    id: "owns-uploads",
    question: "Who owns original uploaded content?",
    answer:
      "You remain responsible for your original uploads. HomeCheff does not claim unnecessary ownership of your originals. HomeCheff needs a limited licence to store, process and render content to run the service.",
    legalSource: "/privacy · AI_IP_COUNSEL_REVIEW_REQUIRED for edge cases",
  },
  {
    id: "upload-rights",
    question: "What rights do I need before uploading?",
    answer:
      "You must have the rights (and any required consents) for images, video, audio, music, logos, trademarks and people appearing in your content.",
  },
  {
    id: "exports",
    question: "What happens to exported content?",
    answer:
      "Exports you generate are available for download/use under your plan and storage rules. Cancelling a subscription does not automatically delete past exports from your account storage until retention/deletion processes apply.",
  },
  {
    id: "commercial-use",
    question: "Can Studio output be used commercially?",
    answer:
      "You may use your projects commercially only if you have the necessary rights in all inputs and the final composition, and if your use complies with law and third-party rights. HomeCheff does not guarantee that AI-assisted output is free of third-party rights in every jurisdiction.",
    legalSource: "/terms · AI_IP_COUNSEL_REVIEW_REQUIRED",
  },
  {
    id: "ai-limits",
    question: "What limitations apply to AI output?",
    answer:
      "AI output can contain errors, unexpected content, or incomplete results. Always review before publishing. Provider availability and exact requested results are not guaranteed.",
  },
  {
    id: "ai-unique",
    question: "Are AI results guaranteed to be unique?",
    answer:
      "No. Similar outputs may be generated for other users. Uniqueness and exclusive copyright status are not guaranteed.",
  },
  {
    id: "ai-providers",
    question: "Which AI features/providers are currently live?",
    answer:
      "Live paths can include video generation (e.g. Vidu where Instant Premium / motion uses it), voice/music generation capabilities where enabled (e.g. ElevenLabs-backed features), and other adapters configured in Production. Exact providers depend on the action you run. See Privacy for the operational provider map.",
    legalSource: "/privacy",
  },
  {
    id: "ai-every-op",
    question: "Does Studio use AI for every operation?",
    answer:
      "No. Local/free rendering, editing, uploads and some exports can run without paid AI generation. Paid generation is charged when a billable provider action is reserved/consumed.",
  },
  {
    id: "ai-fail",
    question: "What happens if AI generation fails?",
    answer:
      "Most failed jobs are refunded automatically when Studio marks a failed generation (failed_generation_refund). If work already started before cancel, some credits may still be used. Check Billing for the ledger.",
  },
  {
    id: "hc-when",
    question: "When are HC / Studio credits consumed?",
    answer:
      "Credits are reserved/captured when you start billable generation or other priced actions in the live pricing catalog — not merely for opening the editor.",
  },
  {
    id: "hc-fail",
    question: "What happens to credits if provider generation fails?",
    answer:
      "Failed generations are typically refunded to your wallet. Successful or partially started work may consume credits as shown in Billing.",
  },
  {
    id: "plans",
    question: "What are Creator / Pro / Studio plans?",
    answer:
      "Paid subscriptions: Creator €15/mo (900 HC), Pro €29/mo (1,800 HC), Studio €79/mo (5,000 HC). See Pricing for VAT-inclusive NL B2C presentation.",
    legalSource: "studio-nl-b2c-catalog",
  },
  {
    id: "plan-hc",
    question: "How much HC does each plan provide each month?",
    answer:
      "Creator includes 900 HC/month, Pro 1,800 HC/month, and Studio 5,000 HC/month under the certified NL B2C catalog. HC is granted via central billing on each paid invoice.",
  },
  {
    id: "hc-accumulate",
    question: "Do credits accumulate?",
    answer:
      "Purchased packs remain while your account is active per Billing help. There is no monthly subscription allotment to roll over under the current plan SSOT.",
  },
  {
    id: "hc-expire",
    question: "Do credits expire?",
    answer:
      "Purchased packs do not expire while your account is active. See Help → Do credits expire?",
  },
  {
    id: "hc-after-cancel",
    question: "What happens to credits after cancellation?",
    answer:
      "Unused purchased credits are retained per cancellation policy. Subscription storage/discount benefits end when the paid period ends.",
  },
  {
    id: "projects-after-cancel",
    question: "What happens to projects after cancellation?",
    answer:
      "Projects are not deleted solely because you cancelled. Paid storage entitlements may change after the period ends. Contact support for deletion requests.",
  },
  {
    id: "failed-renewal",
    question: "What happens after a failed renewal?",
    answer:
      "Paid entitlement can lapse after failed payment recovery. Manage payment methods via Account → Billing → Stripe Customer Portal. Growth/Studio ecosystem Terms cover failed-payment HC grant rules for central subscriptions.",
  },
  {
    id: "cancel",
    question: "Can subscriptions be cancelled?",
    answer: "Yes. Use Account → Billing → Manage subscription (Stripe Customer Portal).",
  },
  {
    id: "cancel-when",
    question: "When does cancellation take effect?",
    answer:
      "Cancel at period end: you keep paid benefits until the end of the period already paid for.",
  },
  {
    id: "upgrade",
    question: "Can users upgrade or downgrade?",
    answer:
      "Plan changes are available through Billing/Checkout where offered. Timing and proration follow Stripe + product rules shown at change time.",
  },
  {
    id: "refunds",
    question: "How are refunds handled?",
    answer:
      "Refunds follow ecosystem commercial Terms and Stripe processes. Spent credits may require manual review. FAQ does not invent automatic cash refund rights.",
    legalSource: "growth.homecheff.eu/legal/terms",
  },
  {
    id: "own-music",
    question: "Can users upload their own music?",
    answer:
      "Yes, where the editor supports own-audio upload (Quick Video: My music). Only upload music you have the right to use. HomeCheff does not licence your upload for you.",
  },
  {
    id: "music-library",
    question: "Does Studio currently provide an included Free Music catalog?",
    answer:
      "Yes, when Free Music is enabled for your account. HomeCheff Studio offers a curated Free Music catalog of CC0 tracks for use inside Studio audiovisual creation (Quick Video). Tracks are admitted under stored licence evidence. HomeCheff does not own the music. Attribution is not required for the current CC0 catalog. Free Music is not a standalone download library and is not for use outside Studio exports.",
  },
  {
    id: "free-music-commercial",
    question: "Can Free Music be used in commercial Studio exports?",
    answer:
      "Yes for the current CC0 catalog when included in a Studio export under the track’s stored licence evidence. That does not guarantee third-party platform Content ID systems will never raise automated claims.",
  },
  {
    id: "free-music-content-id",
    question: "Is Free Music Content ID safe / claim-free?",
    answer:
      "No. HomeCheff verifies the licence and provenance used to admit catalog tracks, but third-party platforms can still make automated copyright claims. Studio does not promise Content ID immunity.",
  },
  {
    id: "free-music-credit",
    question: "Do Free Music previews or selections consume generation credits?",
    answer:
      "No. Opening the Free Music catalog, previewing, selecting, adjusting volume/offset, and saving do not reserve generation credits. Paid AI/provider generation is separate.",
  },
  {
    id: "watermark",
    question: "Are free exports watermarked?",
    answer:
      "Follow the live export UI for your plan. Do not assume a watermark policy beyond what the product shows for that export path.",
  },
  {
    id: "free-local",
    question: "What does FREE_LOCAL mean?",
    answer:
      "Some Studio paths (including Quick Video export) can run local/free rendering without paid provider generation. Paid AI/provider actions still consume credits when used.",
  },
  {
    id: "affiliate",
    question: "Is affiliate available for Studio?",
    answer:
      "Yes — see studio.homecheff.eu/affiliate. You earn 50% of eligible Studio platform revenue for 12 months per referred user. Commission is never calculated over HC itself, VAT, or seller proceeds. Eligible platform revenue from HC-pack purchases can also generate commission; HC face value never does. Creative templates named “affiliate” are not a commission product.",
  },
  {
    id: "international",
    question: "Can Studio be used internationally?",
    answer:
      "Studio is available on the public web. Local laws (content, privacy, consumer, tax) still apply to you. Availability of providers may vary.",
  },
  {
    id: "account-delete",
    question: "How is account deletion requested?",
    answer: "Email support@homecheff.eu. Billing/security records may be retained as required.",
  },
  {
    id: "privacy-request",
    question: "How is privacy/data access requested?",
    answer: "Email support@homecheff.eu or see /privacy.",
  },
  {
    id: "copyright-abuse",
    question: "How can copyright or abuse be reported?",
    answer:
      "Email support@homecheff.eu with details and URLs. For Free Music Content ID or claim reports, include track title/id, platform, date, and optional claim reference — see the Free Music Content ID runbook for operators.",
  },
  {
    id: "support",
    question: "How can support be contacted?",
    answer: "support@homecheff.eu — also linked from the Studio footer.",
  },
];

export const STUDIO_FAQ_REQUIRED_IDS = STUDIO_PUBLIC_FAQ.map((i) => i.id);

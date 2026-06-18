#!/usr/bin/env node
/**
 * Generates wave3 SEO config files (150 pages).
 * Run: node scripts/generate-seo-wave3.mjs
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const STUDIO_CTA = '{ href: "/studio/storyboards/new", label: "Start a storyboard" }';

function productionLineFor(input) {
  return {
    audience: input.audience,
    goal: input.goal,
    painPoint: input.painPoint,
    exampleProject: input.exampleProject,
    workflowAngle: input.workflowAngle,
    outputType: input.outputType,
    recommendedStartingPoint: input.recommendedStartingPoint,
    relatedUseCase: input.relatedUseCase,
    conversionReason: input.conversionReason,
    locale: "en",
  };
}

function longtailUniqueFields(g) {
  const { slug, keyword, theme, audience, searchIntent } = g;
  return {
    keywordContext: `The query "${keyword}" sits in the ${theme} cluster where ${audience} compare tools, learn technique, or prepare to produce. ${searchIntent} HomeCheff answers with storyboards, motion, voice, subtitles, and Publish — not a single prompt and hope.`,
    preflightGoal: `Before generating anything for ${keyword}, define one audience, one goal, runtime, and aspect ratio. Write a one-sentence outcome for ${slug}: what should the viewer do after watching?`,
    editorUpload: `For ${keyword}, upload photos, logos, UI captures, or illustration references in Editor. Clean backgrounds when needed and save approved assets to Library with names your ${audience} team recognizes next month.`,
    editorReferences: `Reference roles on ${slug} projects keep ${theme} scenes on-brand. ${audience} researching ${keyword} should upload owned assets before generating — references beat clever prompts for commercial trust.`,
    studioScenes: `List ${keyword} scenes with one job each: hook, context, demonstration, proof, call to action. Assign narration or dialogue, review pacing for ${theme}, and lock stills before Motion on ${slug}.`,
    motionBatch: `Render motion for ${keyword} from approved stills only. If a ${theme} scene fails, adjust the still or motion notes — not the whole ${slug} project. Batch renders after storyboard sign-off.`,
    voicePublish: `Add VO and burned-in subtitles for ${keyword} because ${audience} audiences discover ${theme} content on silent mobile feeds. Export translated Publish versions when ${searchIntent} implies international reach.`,
    publishIterate: `Export ${keyword} per channel with version names. Duplicate the ${slug} storyboard for variant B — new hook, same body — when optimizing the ${theme} cluster. Reuse Library assets on project two.`,
    mistakesFix: `${keyword} mistakes to avoid: viral clips without storyboard, missing subtitles, random prompts instead of scene direction, skipping /pricing before batch motion. Fix with ten focused minutes in Studio on ${slug}.`,
    scaleInternal: `Template a winning ${theme} structure for ${keyword}: hook, value, proof, CTA. ${audience} who publish weekly build Library depth. Link to /workflows, /industries, and /alternatives for stack decisions.`,
    budgetCluster: `Searches like ${keyword} often come from buyers comparing cost. List actions on /pricing before motion. Approve ${theme} storyboard stills first — highest ROI for ${slug} pilots.`,
    qualityBrand: `For ${keyword}, upload references in Editor, approve scenes before Motion, and review subtitles for claims. ${audience} in regulated ${theme} topics need human judgment — HomeCheff makes ${slug} revisions cheaper.`,
    relatedWorkflows: `After ${slug}, explore /use-cases and /industries hubs. ${audience} with local angles should read /locations alongside ${keyword} experiments. Internal links beat generic AI video roundups.`,
    keywordExpansion: `Deep dive on ${keyword}: ${audience} should treat ${theme} as a production discipline, not a one-click effect. Map search intent to scene jobs, assign owners per stage, and document what success looks like before opening Studio on ${slug}.`,
    workflowClosing: `Closing advice for ${keyword}: ship one complete ${theme} storyboard this week, name Publish variants clearly, and reuse at least three Library assets on project two. ${searchIntent} compounds when ${slug} teams iterate hooks instead of rebuilding entire timelines.`,
  };
}

function locationUniqueFields(slug, city, region, angle, audience, example) {
  return {
    productionCompetition: `Traditional production in ${city} means crews, permits, and weather risk. HomeCheff lets ${audience} storyboard indoors, generate motion from references, and ship vertical plus widescreen cuts from one project — ideal for ${region} campaigns that must move quickly.`,
    studioPipeline: `For ${city} teams the production line stays consistent: Idea → World → Characters → Voices → Scenes → Video → Translation → Publishing. Editor prepares local photos; Studio plans storyboards; Motion animates approved stills; Publish exports for social and ${city} business sites.`,
    studioLocalAssets: `On ${slug} projects, upload ${city} storefront photography, neighborhood shots, or style guides to Editor. Library keeps them reusable so the next ${region} campaign does not start from zero.`,
    exampleIteration: `Week two in ${city}: duplicate the storyboard, swap the offer in scene five, and re-export. That iteration speed is why ${audience} in ${region} adopt story-first AI video instead of one-off clip generators.`,
    collaborationProjects: `${city} solo creators and small teams use Projects to group clients or campaigns. Stakeholders review storyboard stills before motion — cheaper than reshooting on location across ${region}.`,
    collaborationEdits: `When a ${city} client requests changes, update the affected scene in Studio and re-render segments instead of rebuilding the entire timeline in a traditional NLE.`,
    pricingBatch: `Open /pricing before batch renders for ${slug}. List scene images, motion segments, and voice lines. Subscriptions can lower per-credit cost when ${audience} publish weekly for ${city} audiences.`,
    pricingPilot: `Start with a five-scene ${city} pilot on ${example}. Measure watch-through and inbound leads. Scale Library reuse when the ${region} format works.`,
    startSignup: `Sign up at /signup, review credits on /pricing, and open Studio from the CTA below. Your first ${city} storyboard can ship without booking a film crew in ${region}.`,
    startGuides: `Link to guides for TikTok, Reels, product videos, and local business promos — combine ${city}-specific messaging in scene one with proven story structures for ${audience}.`,
    qualityDirect: `${city} teams direct every scene. HomeCheff assists generation; you approve stills before motion. Keep brand guidelines in Library and review subtitles for offers before Publish on ${slug} campaigns.`,
    qualityComparison: `Compared to hiring a ${city} videographer: many ${audience} use HomeCheff for volume and variants, and hire humans for hero shoots once per quarter in ${region}.`,
    scaleTemplate: `Template your best-performing ${city} storyboard: intro, value, proof, CTA. Reuse characters and worlds for seasonal ${region} campaigns — summer promos, winter menus, event weeks.`,
    scaleReuse: `Track Publish version names per channel for ${slug}. Week two should reuse at least three Library assets from week one; if not, improve naming before scaling ${city} output.`,
    discoveryAlgorithms: `Search and social algorithms reward consistent ${city} video output. ${audience} who publish monthly beat competitors who post one polished clip per year. HomeCheff lowers consistency cost because storyboards compound in ${region}.`,
    discoveryGeo: `Geo-target ads with ${city}-specific hooks in scene one — landmark references, neighborhood language, local offers — while keeping brand assets centralized in Projects for ${slug} teams.`,
    toolTemplate: `Template video apps ship fast for ${city} SMBs but look generic. Clip generators produce one-off motion without series continuity. HomeCheff targets ${audience} who need reusable characters, voiced scenes, and multi-format Publish from one brief.`,
    toolHybrid: `Many ${city} businesses keep Canva or CapCut for simple trims while originating ${region} campaigns in HomeCheff. Browse /alternatives for honest comparisons before locking your ${slug} stack.`,
    adoptionMonths: `Month one for ${city}: ship one five-scene video. Month two: duplicate with a new hook and subtitle language. Month three: template the storyboard for quarterly ${region} campaigns.`,
    adoptionCredits: `By day ninety in ${city} you should know average credit cost per deliverable — check /pricing after each Publish batch for ${audience} finance reviews.`,
    evalChecklist: `Run this ${city} checklist: (1) Same brand look across scenes? (2) Subtitles for mobile? (3) 9:16 and 16:9 from one project? (4) Credits predictable on /pricing? (5) Assets findable in Library next month?`,
    evalPilot: `If three or more answers are no, pilot HomeCheff on ${example} before your next ${city} agency invoice.`,
  };
}

function useCaseUniqueFields(slug, name, sector, pain, solution, deliverables, compliance) {
  const d0 = deliverables[0].toLowerCase();
  const d1 = deliverables[1].toLowerCase();
  return {
    stakeholderPressure: `Stakeholders expect professional ${name} output while budgets stay fixed. One-off clip tools create hero moments but struggle with ${d0}, ${d1}, subtitles, translated versions, and consistent characters across episodes.`,
    storyboardBenefit: `${solution} Studio lets ${name} approve scene stills before Motion spends credits. Voices attach to characters or narrators. Publish exports vertical and widescreen versions from the same ${slug} project.`,
    productionLineDetail: `For ${name}, document approved messaging in project notes so volunteers or rotating staff produce on-brand ${sector.toLowerCase()} video month after month. Idea → World → Characters → Voices → Scenes → Video → Translation → Publishing stays the spine.`,
    complianceAssets: `Review subtitles and on-screen text before Publish for ${name}. Keep asset rights in Library metadata when using photos of people or branded materials tied to ${slug} programs.`,
    deliverablesExpansion: deliverables.map((d) => `${d}: plan five scenes or fewer for first ${name} versions; expand once the ${slug} template works.`).join(" "),
    deliverablesReuse: `Reuse Library intros and outros across ${name} deliverables — ${d0} and ${d1} share assets when Projects are named consistently.`,
    iterationMeasurement: `Track completion rate, sign-ups, attendance, or donations for ${name}. Duplicate storyboards for A/B hooks on ${slug}. Name Publish versions clearly per ${sector.toLowerCase()} campaign.`,
    iterationFinance: `Review credit usage on /pricing after each ${name} campaign so finance teams see predictable ${slug} costs instead of surprise agency invoices.`,
    gettingStartedAction: `Sign up at /signup. Pick one ${name} deliverable from the list above. Build a five-scene storyboard this week on ${slug}. Teams that ship one real video learn faster than those stuck in tool evaluation.`,
    gettingStartedBrowse: `Browse linked industry and guide pages for deeper ${sector.toLowerCase()} playbooks supporting ${name}.`,
    humanVideography: `Live events, sensitive interviews, and hero ${name} films may still need a crew. HomeCheff covers volume — weekly updates, explainers, social cuts, and localized variants for ${slug}.`,
    hybridCapture: `Hybrid stacks are normal for ${name}: capture live once, storyboard and supplement with AI scenes between events using Library assets from ${d0} pilots.`,
    trainingRotating: `Rotating volunteers and junior staff on ${name} produce on-brand video when Projects store templates and Library stores approved intros. Train newcomers on storyboard approval first — stills before motion.`,
    trainingShotList: `Create a one-page shot list mapping ${name} deliverables to scene counts. ${sector} teams scale when ${slug} process is documented, not when one expert holds all knowledge.`,
    creditProcurement: `Finance teams prefer predictable ${name} costs. HomeCheff credits map to actions listed on /pricing. Subscriptions reduce unit costs for organizations publishing weekly ${slug} content.`,
    creditPilot: `Pilot one ${name} deliverable, measure engagement, then procure credits for a quarter based on real ${slug} throughput.`,
    rolloutMonth: `Month one: one flagship video for ${name}. Month two: second deliverable reusing Library assets. Month three: template storyboard structure and train a backup contributor on ${slug}.`,
    rolloutCompliance: `Document ${name} compliance notes in project metadata so ${sector.toLowerCase()} audits are easy. ${compliance}`,
    stackComparison: `Slide-only tools fail when ${name} need motion and voice. Clip generators fail when ${name} need series. HomeCheff fits organizations that must ship repeatable storyboarded content with subtitles for ${slug}.`,
    stackBrowse: `Browse /workflows and /guides for channel-specific playbooks linked from the ${name} hub.`,
    stakeholderBoard: `Board members, donors, parents, and customers increasingly expect ${name} video updates. ${solution} Storyboard stills are easy to share in email for approval before motion credits are spent.`,
    stakeholderResponsive: `When leadership asks for changes on ${slug}, edit scene copy or swap scene three — not the entire production. That responsiveness builds trust inside ${name}.`,
    accessibilitySubtitles: `Burned-in subtitles help deaf and hard-of-hearing audiences and silent mobile viewers for ${name}. Plain language in VO scripts improves comprehension across age groups in ${sector.toLowerCase()} content.`,
  };
}

function industryUniqueFields(slug, industry, buyer, visual, story, metrics) {
  const ind = industry.toLowerCase();
  return {
    scrollHookDetail: `${buyer} know ${ind} audiences scroll fast. The first scene must hook with ${visual.split(".")[0].toLowerCase()}. Middle scenes prove credibility. Final scenes drive measurable action — purchase, booking, demo request, or signup.`,
    studioEnforcementDetail: `Studio enforces scene order before Motion on ${slug} campaigns. Editor ingests product shots, lifestyle references, and logos for ${ind}. Library preserves approved looks for the next ${industry} campaign.`,
    metricsExperimentDetail: `Name Publish versions per ${industry} experiment. Duplicate storyboards instead of rebuilding from scratch when ${buyer} test hooks or offers on ${slug}.`,
    weeklyCadence: `Monday brief in Studio for ${industry}. Tuesday lock scene stills. Wednesday Motion. Thursday voice and subtitles. Friday Publish. Regional or seasonal ${ind} variants reuse Library assets the following week.`,
    weeklyBatchGuard: `Batch motion only after storyboard approval on ${slug} to protect ${industry} credit budgets.`,
    complianceDisclaimerDetail: `Store disclaimers in ${slug} project notes. Reuse approved phrasing across ${industry} episodes when legal clears wording.`,
    formatsChannelsDetail: `Export 9:16 for TikTok and Reels, 16:9 for YouTube and web, 1:1 when needed for ${ind} feeds. One ${slug} storyboard powers all when ${buyer} plan safe framing in Studio.`,
    formatsSubtitles: `Subtitles are mandatory for ${industry} mobile silent autoplay — especially when ${story.split(";")[0].toLowerCase()}.`,
    creditsScaleDetail: `See /pricing before scaling ${industry} output. Successful ${buyer} template five-scene structures and reuse characters — cost per video drops after episode three on ${slug}.`,
    creditsSubscription: `Subscriptions can lower credit pack pricing when ${ind} teams publish weekly from the same Library worlds.`,
    nextStepsDetail: `Start at /signup. Open Studio and ship a pilot for one SKU, service line, or funnel stage in ${industry}. Compare performance against your previous static creative on ${slug}.`,
    nextStepsBrowse: `Explore use-case and guide hubs for channel-specific ${industry} playbooks beyond ${metrics.split(".")[0].toLowerCase()}.`,
    channelMixDetail: `${buyer} plan safe framing in Studio so ${ind} crops do not kill composition on paid social, email embeds, and product detail pages.`,
    seasonalCalendarDetail: `Swap scene five offers on ${slug} without rebuilding scenes one through four. That is how ${industry} credit cost per video drops after episode three.`,
    creativeTestingDetail: `Duplicate ${slug} storyboards for hook A/B tests in ${industry}. Keep body scenes identical so ${buyer} isolate the first three seconds without confounding offer changes.`,
    procurementAgency: `Compare agency quotes for ${industry} deliverables to credit tables on /pricing. HomeCheff does not replace strategic positioning — it replaces expensive iteration on standard ${ind} marketing videos.`,
    procurementAlternatives: `See /alternatives for comparisons with Canva, CapCut, Runway, and template video tools your ${industry} team may already use on ${slug} campaigns.`,
    operationsNaming: `Name Publish files for ${industry} sales and support teams on ${slug}. A video without a clear naming convention gets lost in chat threads. Projects should map videos to SKUs, regions, or funnel stages.`,
    operationsLegal: `When legal requests changes on ${industry} content, update subtitles and on-screen text in Studio stills before re-exporting Motion segments for ${buyer}.`,
    benchmarksWatchthrough: `Compare watch-through, click-through, and assisted conversions before and after adopting storyboarded video for ${industry.toLowerCase()} on ${slug}. Hold hook scenes constant when testing offers.`,
    benchmarksPricing: `Review /pricing monthly against ${industry} output volume. If credit cost per video does not fall by episode three, improve Library reuse and storyboard templating before buying more tools.`,
    benchmarksPair: `Pair this ${industry} hub with a relevant /use-cases page and a /guides longtail article when ${buyer} need channel-specific execution detail beyond ${slug}.`,
  };
}

const LOCATIONS = [
  ["rotterdam", "Rotterdam", "South Holland and the Rijnmond port region", "Rotterdam's creative and logistics sectors fuel constant demand for fresh social and employer-brand video.", "agencies, hospitality groups, and port-related businesses", "a waterfront restaurant promoting a summer menu with five scenes and vertical exports"],
  ["amsterdam", "Amsterdam", "the Amsterdam metropolitan area", "Amsterdam's tourism, tech, and media density makes video essential for discovery and trust.", "startups, museums, hotels, and creators", "a canal-side boutique hotel welcoming international guests with subtitled promos"],
  ["den-haag", "The Hague", "the Haaglanden region and international institutions", "The Hague combines government, justice, and seaside culture — video must feel credible and clear.", "NGOs, legal firms, and seaside hospitality", "an international NGO explaining a policy initiative with dignified story pacing"],
  ["utrecht", "Utrecht", "Utrecht and the central Netherlands", "Utrecht's university and rail hub economy rewards clear explainers and local lifestyle content.", "educators, SaaS teams, and retailers", "a Utrecht SaaS company launching a feature with a product demo storyboard"],
  ["eindhoven", "Eindhoven", "Brainport and North Brabant tech corridor", "Eindhoven's hardware and design culture expects polished product and employer videos.", "tech companies, design studios, and events", "a hardware startup teaser for a crowdfunding campaign"],
  ["groningen", "Groningen", "Northern Netherlands and student city life", "Groningen's student population and northern brands need fast social video without big-city agency costs.", "universities, bars, and regional retailers", "a student housing provider onboarding international tenants"],
  ["tilburg", "Tilburg", "Tilburg and Brabant industry", "Tilburg mixes logistics, culture, and manufacturing — video supports B2B and community stories.", "manufacturers, festivals, and local government", "a logistics firm recruiting drivers with a human story arc"],
  ["breda", "Breda", "West Brabant", "Breda's events and hospitality scene thrives on short promos and recap clips.", "event venues, restaurants, and retailers", "a city festival recap that drives next year's ticket sales"],
  ["nijmegen", "Nijmegen", "Gelderland and the Waal river region", "Nijmegen's healthcare and university presence needs trustworthy educational video.", "hospitals, schools, and sports clubs", "a sports club membership drive with testimonial-style scenes"],
  ["arnhem", "Arnhem", "Arnhem and the Veluwe gateway", "Arnhem brands use video for fashion, culture, and regional tourism.", "retailers, museums, and outdoor tourism", "a Veluwe tourism board highlighting nature routes"],
  ["haarlem", "Haarlem", "Haarlem and Kennemerland", "Haarlem's boutique retail and coastal proximity suit lifestyle and product video.", "independent shops, bakeries, and salons", "a specialty coffee roaster telling origin story scenes"],
  ["zwolle", "Zwolle", "Overijssel capital region", "Zwolle businesses compete regionally with video on social and local search.", "SMEs, insurers, and education providers", "an insurer simplifying a policy change for customers"],
  ["leiden", "Leiden", "Leiden and the Bio Science Park", "Leiden's science and history brands need precise explainers and cultural promos.", "biotech, museums, and publishers", "a museum exhibition trailer with scene-based storytelling"],
  ["delft", "Delft", "Delft and TU Delft innovation ecosystem", "Delft engineering and heritage tourism both benefit from crisp demo and promo video.", "deep-tech startups and tour operators", "a TU Delft spin-off explaining a prototype in five scenes"],
  ["almere", "Almere", "Flevoland and fastest-growing city dynamics", "Almere's young city identity needs video for housing, retail, and community projects.", "developers, schools, and municipal projects", "a new neighborhood park opening announcement"],
  ["amersfoort", "Amersfoort", "Utrecht region historic city", "Amersfoort merchants and cultural venues use video for local discovery.", "retail, wellness, and cultural venues", "a yoga studio seasonal class promo"],
  ["enschede", "Enschede", "Twente and eastern Netherlands tech", "Enschede's university and manufacturing base needs employer and product video.", "HR teams, factories, and student startups", "a factory safety training module with subtitles"],
  ["maastricht", "Maastricht", "Limburg and cross-border commerce", "Maastricht's tourism and EU-facing business benefits from multilingual video versions.", "hotels, wineries, and cross-border retailers", "a hotel promo exported in Dutch and English Publish versions"],
  ["apeldoorn", "Apeldoorn", "Gelderland royal city and nature", "Apeldoorn hospitality and parks marketing relies on emotional short-form video.", "parks, hotels, and healthcare", "a palace gardens seasonal ticket campaign"],
  ["dordrecht", "Dordrecht", "Drechtsteden and island geography", "Dordrecht maritime heritage and local retail use video for community engagement.", "maritime businesses, schools, and shops", "a historic harbor walking tour promo"],
];

const USE_CASES = [
  ["for-schools", "Schools", "primary and secondary education", "Teachers lack time and budget for professional video but students learn better with visuals.", "HomeCheff turns lesson outlines into subtitled scene videos stored per subject in Projects.", ["Lesson intros", "Homework explainers", "Parent updates", "Open day promos"], "Obtain consent for student imagery; use illustrations when in doubt."],
  ["for-universities", "Universities", "higher education", "Faculties need research promos and course marketing without central studio bottlenecks.", "Departments storyboard explainers and event clips with reusable brand intros.", ["Course trailers", "Research highlights", "Campus life", "Alumni fundraising"], "Align with university brand offices on logos and claims."],
  ["for-museums", "Museums", "cultural institutions", "Exhibitions need trailers that respect art and drive ticket sales.", "Curators storyboard scene sequences from collection photography and approved stills.", ["Exhibition trailers", "Audio-described tours", "Membership drives", "Kids programs"], "Respect copyright on collection images; use licensed assets only."],
  ["for-churches", "Churches", "faith communities", "Congregations want welcoming videos without commercial production overhead.", "Volunteers produce service promos and community stories with dignified pacing.", ["Service invitations", "Community outreach", "Holiday messages", "Youth group promos"], "Keep messaging inclusive; review subtitles for clarity."],
  ["for-sports-clubs", "Sports Clubs", "amateur and semi-pro sports", "Clubs need membership and sponsor content every season.", "Board members template match promos and sponsor thank-yous in Library.", ["Membership drives", "Match highlights style reels", "Sponsor spots", "Training tips"], "Use rights-cleared athlete photos only."],
  ["for-local-governments", "Local Governments", "municipal communication", "Citizens expect video updates on projects and services.", "Comms teams publish accessible subtitled explainers with consistent municipal branding.", ["Project updates", "Service explainers", "Emergency info", "Participation campaigns"], "Follow government accessibility and plain-language standards."],
  ["for-restaurants", "Restaurants", "food service", "Menus change and dishes need appetizing motion on social.", "Chefs storyboard dish heroes and ambiance scenes from plate photography.", ["Dish promos", "Chef stories", "Reservation CTAs", "Delivery app cuts"], "Accurate pricing and allergen messaging in subtitles when required."],
  ["for-hotels", "Hotels", "hospitality", "Bookers decide from emotional room and experience video.", "Marketing teams localize Publish versions for international OTAs and social.", ["Room tours stylized", "Amenity highlights", "Event venue", "Seasonal offers"], "Truthful representation of rooms; avoid misleading wide-angle implications."],
  ["for-tourism", "Tourism Boards", "destination marketing", "Destinations sell emotion and itinerary clarity.", "DMOs batch scene stills per attraction and export multi-format campaigns.", ["Destination hooks", "Itinerary shorts", "Partner co-marketing", "Seasonal campaigns"], "Coordinate partner logo usage rights."],
  ["for-ecommerce", "Ecommerce Brands", "online retail", "Product pages with video convert higher but shoots are expensive per SKU.", "Merchants duplicate storyboards per SKU sharing brand Library assets.", ["Product demos", "Unboxing style", "UGC-style testimonials", "Sale events"], "Accurate product color and features in scene stills."],
  ["for-etsy-sellers", "Etsy Sellers", "handmade marketplace", "Sellers need lifestyle video to stand out in search.", "Makers storyboard craft process scenes from workshop photos.", ["Process reels", "Shop stories", "Holiday launches", "Custom order explainers"], "Disclose handmade nature honestly in VO scripts."],
  ["for-shopify-sellers", "Shopify Sellers", "DTC brands", "DTC brands test ads weekly and need variant hooks fast.", "Performance marketers duplicate hooks on shared body storyboards.", ["Meta ad variants", "Landing hero", "Email embeds", "Influencer briefs"], "Sync offer deadlines in CTA scenes with storefront reality."],
  ["for-amazon-sellers", "Amazon Sellers", "marketplace vendors", "Listings benefit from video but Amazon specs differ by category.", "Sellers export focused product demos with clear feature callouts.", ["Listing video", "A+ content support", "Brand story", "Seasonal promos"], "Follow Amazon video policy for claims and length."],
  ["for-affiliates", "Affiliate Marketers", "affiliate content", "Affiliates win on hook tests and honest reviews.", "Marketers template five-scene reviews with swappable hook scenes.", ["Review videos", "Comparison shorts", "Deal alerts", "Listicles"], "Include disclosure in subtitles and VO where required."],
  ["for-creators", "Creators", "independent creators", "Creators must publish consistently across platforms.", "Creators reuse Library characters and intros across series.", ["Series episodes", "Sponsor integrations", "Channel trailers", "Membership promos"], "Label sponsored segments clearly."],
  ["for-artists", "Artists", "visual artists", "Artists need motion portfolios without animation degrees.", "Artists animate illustrations via Motion from approved stills.", ["Portfolio shorts", "Commission promos", "Exhibition invites", "Process reels"], "Maintain style fidelity with reference uploads."],
  ["for-musicians", "Musicians", "music releases", "Releases need visuals same-week as streaming drops.", "Artists sync scene pacing to song structure in Studio.", ["Music videos", "Release teasers", "Tour promos", "Behind-the-track"], "Licensed audio only; HomeCheff handles visuals and VO."],
  ["for-authors", "Authors", "book marketing", "Books need trailers and chapter teases.", "Authors map chapters to scenes with narrator VO.", ["Book trailers", "Character intros", "Launch announcements", "Series promos"], "Avoid spoiler-heavy scenes without publisher approval."],
  ["for-nonprofits", "Nonprofits", "charitable organizations", "Donors respond to impact stories told respectfully.", "Fundraising teams produce dignified scene narratives with consent-tracked photos.", ["Campaign appeals", "Impact updates", "Volunteer thanks", "Event invites"], "Consent and dignity first; no exploitative imagery."],
  ["for-startups", "Startups", "early-stage companies", "Startups need pitch, product, and hiring video on startup time.", "Founders ship investor and homepage videos from one storyboard base.", ["Pitch clips", "Product demos", "Hiring promos", "Investor updates"], "Verify metrics and claims with legal before Publish."],
];

const INDUSTRIES = [
  ["food", "Food & Beverage", "food marketing managers", "Food video must trigger appetite with accurate color and texture.", "Lead with sizzle and garnish motion; close with order or visit CTA.", "Track add-to-cart, reservation clicks, and delivery app conversions."],
  ["fashion", "Fashion", "fashion brand leads", "Fashion sells identity and movement on body and fabric.", "Show lookbook scenes with consistent model styling via Library.", "Track sell-through, email CTR, and social saves."],
  ["beauty", "Beauty", "beauty brand managers", "Beauty audiences expect texture, glow, and tutorial clarity.", "Macro product scenes plus before-after narrative arcs work well.", "Track sample requests, subscription signups, and ROAS."],
  ["fitness", "Fitness", "gym and program marketers", "Fitness video must motivate without overpromising results.", "Demonstration scenes plus social proof scenes build trust.", "Track trial signups, class bookings, and app installs."],
  ["health", "Health", "healthcare communicators", "Health content demands clarity and careful claims.", "Educational scene pacing with plain language subtitles.", "Track appointment requests and info page dwell time."],
  ["education", "Education", "edtech and school marketers", "Education video must teach one concept per scene.", "Objective, lesson, example, recap structure.", "Track enrollment, completion, and parent engagement."],
  ["travel", "Travel", "DMO and travel marketers", "Travel video sells emotion and practical itinerary hooks.", "Destination beauty scenes plus practical tip scenes.", "Track bookings, guide downloads, and partner referrals."],
  ["real-estate", "Real Estate", "agents and developers", "Property video must show space flow and lifestyle.", "Exterior, living, kitchen, bedroom, neighborhood, agent CTA.", "Track inquiries, showings booked, and listing dwell time."],
  ["events", "Events", "event promoters", "Events need hype before and proof after.", "Speaker, venue, lineup, ticket CTA before; recap after.", "Track ticket sales velocity and email signups."],
  ["automotive", "Automotive", "dealers and OEM marketers", "Automotive buyers want feature clarity and emotional drive scenes.", "Feature highlight scenes plus lifestyle driving context.", "Track test drive bookings and configurator starts."],
  ["gaming", "Gaming", "game marketers", "Gaming trailers need pacing tied to action beats.", "Teaser mystery, gameplay proof, release CTA.", "Track wishlists, pre-orders, and trailer completion rate."],
  ["technology", "Technology", "tech product marketers", "Tech buyers need demo clarity not jargon montages.", "Problem, demo, integration, proof, trial CTA.", "Track demo requests, free trials, and pipeline influenced."],
  ["saas", "SaaS", "SaaS growth teams", "SaaS video must show UI truthfully and outcomes.", "UI capture references plus outcome story scenes.", "Track trial starts, activation, and expansion revenue."],
  ["consulting", "Consulting", "consulting partners", "Consulting video sells frameworks and credibility.", "Framework explainer scenes plus client outcome proof.", "Track discovery calls booked and proposal acceptance."],
  ["legal", "Legal", "law firm marketers", "Legal video must be sober, clear, and compliant.", "Practice area explainers with disclaimer scenes.", "Track consultation requests and content-assisted intake."],
  ["finance", "Finance", "financial services marketers", "Finance content faces strict claim rules.", "Educational pacing; approved disclaimer reuse in Library.", "Track advised leads and application starts."],
  ["construction", "Construction", "contractors and developers", "Construction buyers want proof of craft and safety.", "Site progress scenes plus testimonial and bid CTA.", "Track RFP responses and project inquiries."],
  ["agriculture", "Agriculture", "agri-food marketers", "Ag brands tell origin and sustainability stories.", "Farm-to-table scene arcs with seasonal Library reuse.", "Track distributor interest and direct sales."],
  ["retail", "Retail", "retail marketers", "Retail video supports weekly offers and foot traffic.", "Offer hook, product grid scenes, store CTA.", "Track footfall codes, coupon redemptions, and ROAS."],
  ["hospitality", "Hospitality", "hotel and venue marketers", "Hospitality sells experience and trust before booking.", "Room, dining, experience, guest story, book CTA.", "Track direct bookings and package upsells."],
];

const LONGTAIL_THEMES = [
  {
    theme: "AI video",
    prefix: "ai-video",
    variants: [
      ["ai-video-generator-online", "AI Video Generator Online", "AI video generator online", "a browser tool without installing editing software", "marketers and creators"],
      ["ai-video-maker-for-business", "AI Video Maker for Business", "AI video maker for business", "professional output without agency retainers", "SMB owners"],
      ["ai-video-creation-tool", "AI Video Creation Tool", "AI video creation tool", "end-to-end creation not just clip generation", "content leads"],
      ["ai-video-editor-alternative", "AI Video Editor Alternative", "AI video editor alternative", "storyboard-first workflow vs timeline-only tools", "YouTubers"],
      ["ai-video-from-text", "AI Video from Text", "AI video from text", "turning scripts into scene plans before rendering", "writers"],
      ["ai-video-for-youtube", "AI Video for YouTube", "AI video for YouTube", "widescreen and Shorts from one storyboard", "YouTube creators"],
      ["ai-video-for-tiktok", "AI Video for TikTok", "AI video for TikTok", "vertical hooks and fast pacing", "TikTok creators"],
      ["ai-video-for-instagram", "AI Video for Instagram", "AI video for Instagram", "Reels aesthetic and subtitle safety", "Instagram brands"],
      ["ai-video-for-ads", "AI Video for Ads", "AI video for ads", "variant hooks for paid social testing", "performance marketers"],
    ],
  },
  {
    theme: "AI animation",
    prefix: "ai-animation",
    variants: [
      ["ai-animation-maker", "AI Animation Maker", "AI animation maker", "motion from stills without frame-by-frame work", "illustrators"],
      ["ai-animation-from-images", "AI Animation from Images", "AI animation from images", "image-to-video scene pipelines", "designers"],
      ["ai-animation-for-kids", "AI Animation for Kids", "AI animation for kids", "gentle pacing and clear subtitles", "parents and teachers"],
      ["ai-animation-for-logos", "AI Animation for Logos", "AI animation for logos", "short stings and brand reveals", "brand designers"],
      ["ai-animation-for-characters", "AI Animation for Characters", "AI animation for characters", "consistent cast across scenes", "storytellers"],
      ["ai-animation-for-presentations", "AI Animation for Presentations", "AI animation for presentations", "deck support clips that feel custom", "consultants"],
      ["ai-animation-for-marketing", "AI Animation for Marketing", "AI animation for marketing", "campaign scenes with CTA clarity", "marketers"],
      ["ai-animation-for-education", "AI Animation for Education", "AI animation for education", "one concept per scene teaching", "educators"],
      ["ai-animation-for-social-media", "AI Animation for Social Media", "AI animation for social media", "platform-native aspect ratios", "social managers"],
    ],
  },
  {
    theme: "photo to video",
    prefix: "photo-to-video",
    variants: [
      ["photo-to-video-ai", "Photo to Video AI", "photo to video AI", "animating stills into narrative sequences", "photographers"],
      ["photo-to-video-maker", "Photo to Video Maker", "photo to video maker", "simple tools that still allow story structure", "families"],
      ["photo-to-video-slideshow-alternative", "Photo Slideshow Alternative", "photo slideshow alternative", "motion beyond Ken Burns templates", "event planners"],
      ["photo-to-video-for-real-estate", "Photo to Video for Real Estate", "photo to video for real estate", "listing photos as walkthrough stories", "agents"],
      ["photo-to-video-for-weddings", "Photo to Video for Weddings", "photo to video for weddings", "emotional highlight pacing", "wedding creators"],
      ["photo-to-video-for-travel", "Photo to Video for Travel", "photo to video for travel", "destination stills with cinematic motion", "travel creators"],
      ["photo-to-video-for-products", "Photo to Video for Products", "photo to video for products", "SKU imagery animated for ads", "ecommerce sellers"],
      ["photo-to-video-for-memorials", "Photo to Video for Memorials", "photo to video for memorials", "dignified slow motion on portraits", "families"],
      ["photo-to-video-for-birthdays", "Photo to Video for Birthdays", "photo to video for birthdays", "playful motion on party photos", "parents"],
    ],
  },
  {
    theme: "image animation",
    prefix: "image-animation",
    variants: [
      ["image-animation-online", "Image Animation Online", "image animation online", "browser workflow without plugins", "creators"],
      ["image-animation-software-alternative", "Image Animation Software Alternative", "image animation software alternative", "lighter stack than desktop animation suites", "indie animators"],
      ["animate-image-with-ai", "Animate Image with AI", "animate image with AI", "controlled motion instructions per scene", "artists"],
      ["animate-product-images", "Animate Product Images", "animate product images", "commerce motion from packshots", "Shopify sellers"],
      ["animate-logo-image", "Animate Logo Image", "animate logo image", "short reveals for video openers", "startups"],
      ["animate-portrait-photo", "Animate Portrait Photo", "animate portrait photo", "subtle parallax without distortion", "photographers"],
      ["animate-illustration-art", "Animate Illustration Art", "animate illustration art", "style-preserving motion", "illustrators"],
      ["animate-painting-art", "Animate Painting Art", "animate painting art", "atmospheric movement on fine art", "galleries"],
      ["animate-drawing-sketch", "Animate Drawing Sketch", "animate drawing sketch", "sketch-to-motion for portfolios", "students"],
    ],
  },
  {
    theme: "story video",
    prefix: "story-video",
    variants: [
      ["story-video-maker", "Story Video Maker", "story video maker", "narrative arcs not random clips", "writers"],
      ["story-video-for-brands", "Story Video for Brands", "story video for brands", "brand worlds and recurring characters", "brand managers"],
      ["story-video-for-kids", "Story Video for Kids", "story video for kids", "simple plots and safe tone", "parents"],
      ["story-video-from-photos", "Story Video from Photos", "story video from photos", "photo sequences with plot", "families"],
      ["story-video-for-nonprofits", "Story Video for Nonprofits", "story video for nonprofits", "impact narratives with dignity", "fundraisers"],
      ["story-video-for-startups", "Story Video for Startups", "story video for startups", "origin, problem, solution arcs", "founders"],
      ["story-video-series", "Story Video Series", "story video series", "episodic Library reuse", "creators"],
      ["story-video-with-voiceover", "Story Video with Voiceover", "story video with voiceover", "integrated VO per scene", "podcasters"],
      ["story-video-with-subtitles", "Story Video with Subtitles", "story video with subtitles", "mobile-first silent viewing", "social managers"],
    ],
  },
  {
    theme: "marketing video",
    prefix: "marketing-video",
    variants: [
      ["marketing-video-maker-ai", "Marketing Video Maker AI", "marketing video maker AI", "campaign-ready cuts with CTA scenes", "marketers"],
      ["marketing-video-for-small-business", "Marketing Video for Small Business", "marketing video for small business", "affordable weekly promos", "local owners"],
      ["marketing-video-for-b2b", "Marketing Video for B2B", "marketing video for B2B", "demo and proof scenes for pipelines", "SaaS teams"],
      ["marketing-video-for-launch", "Marketing Video for Launch", "marketing video for launch", "coordinated launch day assets", "PMMs"],
      ["marketing-video-for-email", "Marketing Video for Email", "marketing video for email", "short embed-friendly exports", "email marketers"],
      ["marketing-video-for-landing-pages", "Marketing Video for Landing Pages", "marketing video for landing pages", "hero clarity in fifteen seconds", "growth teams"],
      ["marketing-video-ab-testing", "Marketing Video A/B Testing", "marketing video A/B testing", "hook variants from one body storyboard", "performance leads"],
      ["marketing-video-with-testimonials", "Marketing Video with Testimonials", "marketing video with testimonials", "proof scenes with VO scripts", "agencies"],
      ["marketing-video-roi", "Marketing Video ROI", "marketing video ROI", "predictable credit costs vs agency quotes", "CMOs"],
    ],
  },
  {
    theme: "commercial video",
    prefix: "commercial-video",
    variants: [
      ["commercial-video-production-ai", "Commercial Video Production AI", "commercial video production AI", "broadcast-style pacing without crew", "brand leads"],
      ["tv-commercial-style-ai-video", "TV Commercial Style AI Video", "TV commercial style AI video", "high-impact hooks and product hero", "advertisers"],
      ["commercial-video-for-products", "Commercial Video for Products", "commercial video for products", "SKU-focused hero demos", "CPG brands"],
      ["commercial-video-for-services", "Commercial Video for Services", "commercial video for services", "trust and process clarity", "service firms"],
      ["commercial-video-script-to-video", "Commercial Script to Video", "commercial script to video", "scene lists from approved scripts", "copywriters"],
      ["local-commercial-video", "Local Commercial Video", "local commercial video", "geo-targeted offers and CTAs", "retailers"],
      ["commercial-video-for-youtube-ads", "Commercial Video for YouTube Ads", "commercial video for YouTube ads", "skippable ad hook discipline", "media buyers"],
      ["commercial-video-for-meta-ads", "Commercial Video for Meta Ads", "commercial video for Meta ads", "vertical first three seconds", "DTC brands"],
      ["commercial-video-cost", "Commercial Video Cost", "commercial video cost", "credit transparency vs production bids", "finance teams"],
    ],
  },
  {
    theme: "social media video",
    prefix: "social-media-video",
    variants: [
      ["social-media-video-maker", "Social Media Video Maker", "social media video maker", "multi-platform exports from one board", "social managers"],
      ["social-media-video-templates-alternative", "Social Video Templates Alternative", "social media video templates alternative", "custom scenes vs stock templates", "creators"],
      ["social-media-video-for-facebook", "Social Media Video for Facebook", "social media video for Facebook", "feed and reel safe framing", "community managers"],
      ["social-media-video-for-linkedin", "Social Media Video for LinkedIn", "social media video for LinkedIn", "professional tone and proof", "B2B marketers"],
      ["social-media-video-for-pinterest", "Social Media Video for Pinterest", "social media video for Pinterest", "vertical product storytelling", "ecommerce"],
      ["social-media-video-content-calendar", "Social Video Content Calendar", "social media video content calendar", "batch storyboards weekly", "agencies"],
      ["social-media-video-hooks", "Social Media Video Hooks", "social media video hooks", "swappable scene one variants", "creators"],
      ["social-media-video-subtitles", "Social Media Video Subtitles", "social media video subtitles", "burned-in captions for mute", "publishers"],
      ["social-media-video-trends", "Social Media Video Trends", "social media video trends", "trend-aware hooks with brand safety", "influencers"],
    ],
  },
  {
    theme: "product video",
    prefix: "product-video",
    variants: [
      ["product-video-maker-ai", "Product Video Maker AI", "product video maker AI", "demo scenes from product photos", "ecommerce"],
      ["amazon-product-video-ai", "Amazon Product Video AI", "Amazon product video AI", "listing-focused feature scenes", "Amazon sellers"],
      ["shopify-product-video-ai", "Shopify Product Video AI", "Shopify product video AI", "storefront hero and ad cuts", "Shopify merchants"],
      ["saas-product-demo-video", "SaaS Product Demo Video", "SaaS product demo video", "UI-accurate demonstration scenes", "SaaS marketers"],
      ["product-video-for-ads", "Product Video for Ads", "product video for ads", "hook testing per SKU", "performance marketers"],
      ["product-video-unboxing-style", "Product Video Unboxing Style", "product video unboxing style", "reveal pacing without physical reshoot", "brands"],
      ["product-video-360-style", "Product Video 360 Style", "product video 360 style", "multi-angle scene sequences", "retailers"],
      ["product-video-for-crowdfunding", "Product Video for Crowdfunding", "product video for crowdfunding", "problem-solution-ask structure", "founders"],
      ["product-video-for-marketplace", "Product Video for Marketplace", "product video for marketplace", "multi-SKU template storyboards", "marketplace sellers"],
    ],
  },
  {
    theme: "cinematic video",
    prefix: "cinematic-video",
    variants: [
      ["cinematic-video-ai", "Cinematic Video AI", "cinematic video AI", "filmic pacing and camera language", "filmmakers"],
      ["cinematic-video-from-photos", "Cinematic Video from Photos", "cinematic video from photos", "still-to-motion with restraint", "photographers"],
      ["cinematic-video-for-brands", "Cinematic Video for Brands", "cinematic video for brands", "premium brand films on lean budgets", "creative directors"],
      ["cinematic-video-trailer", "Cinematic Video Trailer", "cinematic video trailer", "ninety-second teaser structure", "studios"],
      ["cinematic-video-lighting-style", "Cinematic Video Lighting Style", "cinematic video lighting style", "reference-driven mood in scenes", "DPs"],
      ["cinematic-video-color-grade-look", "Cinematic Color Grade Look", "cinematic color grade look", "consistent grade via references", "colorists"],
      ["cinematic-video-for-youtube", "Cinematic Video for YouTube", "cinematic video for YouTube", "widescreen narrative on YouTube", "filmmakers"],
      ["cinematic-video-short-film", "Cinematic Short Film AI", "cinematic short film AI", "acts as scene lists", "indie directors"],
      ["cinematic-video-b-roll", "Cinematic B-Roll AI", "cinematic b-roll AI", "supplemental motion scenes", "editors"],
    ],
  },
];

const longtailFlat = LONGTAIL_THEMES.flatMap((t) =>
  t.variants.map(([slug, title, keyword, intent, audience]) => {
    const base = {
      slug,
      title,
      h1: title,
      keyword,
      theme: t.theme,
      searchIntent: intent,
      audience,
      workflowTip: `For ${keyword}, lock scene stills in Studio before Motion — this is the highest-leverage step for ${t.theme} queries on ${slug}.`,
      productionLine: productionLineFor({
        audience: `${audience} researching ${keyword}`,
        goal: `turn ${keyword} intent into repeatable weekly video output`,
        painPoint: `Teams researching ${keyword} often chase one-off clips and lose continuity after the first publish.`,
        exampleProject: `${keyword} pilot with one storyboard, two hooks, and tracked publish variants`,
        workflowAngle: `${t.theme} keyword testing and reuse discipline`,
        outputType: `${keyword} variants for social, web, and localized publish`,
        recommendedStartingPoint: `/studio/storyboards/new using the ${slug} brief`,
        relatedUseCase: `/guides/${slug}`,
        conversionReason: `${keyword} performance compounds when approved assets are reused instead of regenerated from zero each week.`,
      }),
    };
    return { ...base, ...longtailUniqueFields(base) };
  })
);

if (longtailFlat.length !== 90) {
  throw new Error(`Expected 90 longtail guides, got ${longtailFlat.length}`);
}

const locationsFile = `import type { LocationWave3Config } from "@/lib/seo/seo-content-wave3-builder";

export const LOCATIONS_WAVE3_CONFIG: LocationWave3Config[] = [
${LOCATIONS.map(
  ([slug, city, region, angle, audience, example]) => {
    const productionLine = productionLineFor({
      audience: `${city} growth teams`,
      goal: `publish weekly local campaigns in ${city}`,
      painPoint: `${city} teams lose velocity when every campaign starts from disconnected clips and ad-hoc folders.`,
      exampleProject: `${city} pilot where ${example}`,
      workflowAngle: `${region} content approvals and contributor handoff`,
      outputType: `9:16 social cuts, 16:9 web exports, and localized subtitle variants`,
      recommendedStartingPoint: `/studio/storyboards/new for ${slug} campaign planning`,
      relatedUseCase: `/locations/${slug}`,
      conversionReason: `Teams in ${city} convert faster when scenes, voices, and exports stay linked in one production record.`,
    });
    const extra = locationUniqueFields(slug, city, region, angle, audience, example);
    return `  {
    slug: "${slug}",
    city: "${esc(city)}",
    region: "${esc(region)}",
    localAngle: "${esc(angle)}",
    audience: "${esc(audience)}",
    exampleProject: "${esc(example)}",
    productionCompetition: "${esc(extra.productionCompetition)}",
    studioPipeline: "${esc(extra.studioPipeline)}",
    studioLocalAssets: "${esc(extra.studioLocalAssets)}",
    exampleIteration: "${esc(extra.exampleIteration)}",
    collaborationProjects: "${esc(extra.collaborationProjects)}",
    collaborationEdits: "${esc(extra.collaborationEdits)}",
    pricingBatch: "${esc(extra.pricingBatch)}",
    pricingPilot: "${esc(extra.pricingPilot)}",
    startSignup: "${esc(extra.startSignup)}",
    startGuides: "${esc(extra.startGuides)}",
    qualityDirect: "${esc(extra.qualityDirect)}",
    qualityComparison: "${esc(extra.qualityComparison)}",
    scaleTemplate: "${esc(extra.scaleTemplate)}",
    scaleReuse: "${esc(extra.scaleReuse)}",
    discoveryAlgorithms: "${esc(extra.discoveryAlgorithms)}",
    discoveryGeo: "${esc(extra.discoveryGeo)}",
    toolTemplate: "${esc(extra.toolTemplate)}",
    toolHybrid: "${esc(extra.toolHybrid)}",
    adoptionMonths: "${esc(extra.adoptionMonths)}",
    adoptionCredits: "${esc(extra.adoptionCredits)}",
    evalChecklist: "${esc(extra.evalChecklist)}",
    evalPilot: "${esc(extra.evalPilot)}",
    productionLine: {
      audience: "${esc(productionLine.audience)}",
      goal: "${esc(productionLine.goal)}",
      painPoint: "${esc(productionLine.painPoint)}",
      exampleProject: "${esc(productionLine.exampleProject)}",
      workflowAngle: "${esc(productionLine.workflowAngle)}",
      outputType: "${esc(productionLine.outputType)}",
      recommendedStartingPoint: "${esc(productionLine.recommendedStartingPoint)}",
      relatedUseCase: "${esc(productionLine.relatedUseCase)}",
      conversionReason: "${esc(productionLine.conversionReason)}",
      locale: "en",
    },
    studioCta: ${STUDIO_CTA},
  },`;
  }
).join("\n")}
];
`;

const useCasesFile = `import type { UseCaseWave3Config } from "@/lib/seo/seo-content-wave3-builder";

export const USE_CASES_WAVE3_CONFIG: UseCaseWave3Config[] = [
${USE_CASES.map(
  ([slug, name, sector, pain, solution, deliverables, compliance]) => {
    const productionLine = productionLineFor({
      audience: `${name} communication teams`,
      goal: `ship repeatable ${name.toLowerCase()} videos without agency dependency`,
      painPoint: pain,
      exampleProject: `${name} pilot using ${deliverables[0].toLowerCase()} and ${deliverables[1].toLowerCase()}`,
      workflowAngle: `${sector} governance and reviewer coordination`,
      outputType: `${deliverables[0].toLowerCase()} plus localized publish variants`,
      recommendedStartingPoint: `/studio/storyboards/new with a five-scene ${slug} pilot`,
      relatedUseCase: `/use-cases/${slug}`,
      conversionReason: solution,
    });
    const extra = useCaseUniqueFields(slug, name, sector, pain, solution, deliverables, compliance);
    return `  {
    slug: "${slug}",
    name: "${esc(name)}",
    sector: "${esc(sector)}",
    painPoint: "${esc(pain)}",
    solution: "${esc(solution)}",
    deliverables: [${deliverables.map((d) => `"${esc(d)}"`).join(", ")}],
    complianceNote: "${esc(compliance)}",
    stakeholderPressure: "${esc(extra.stakeholderPressure)}",
    storyboardBenefit: "${esc(extra.storyboardBenefit)}",
    productionLineDetail: "${esc(extra.productionLineDetail)}",
    complianceAssets: "${esc(extra.complianceAssets)}",
    deliverablesExpansion: "${esc(extra.deliverablesExpansion)}",
    deliverablesReuse: "${esc(extra.deliverablesReuse)}",
    iterationMeasurement: "${esc(extra.iterationMeasurement)}",
    iterationFinance: "${esc(extra.iterationFinance)}",
    gettingStartedAction: "${esc(extra.gettingStartedAction)}",
    gettingStartedBrowse: "${esc(extra.gettingStartedBrowse)}",
    humanVideography: "${esc(extra.humanVideography)}",
    hybridCapture: "${esc(extra.hybridCapture)}",
    trainingRotating: "${esc(extra.trainingRotating)}",
    trainingShotList: "${esc(extra.trainingShotList)}",
    creditProcurement: "${esc(extra.creditProcurement)}",
    creditPilot: "${esc(extra.creditPilot)}",
    rolloutMonth: "${esc(extra.rolloutMonth)}",
    rolloutCompliance: "${esc(extra.rolloutCompliance)}",
    stackComparison: "${esc(extra.stackComparison)}",
    stackBrowse: "${esc(extra.stackBrowse)}",
    stakeholderBoard: "${esc(extra.stakeholderBoard)}",
    stakeholderResponsive: "${esc(extra.stakeholderResponsive)}",
    accessibilitySubtitles: "${esc(extra.accessibilitySubtitles)}",
    productionLine: {
      audience: "${esc(productionLine.audience)}",
      goal: "${esc(productionLine.goal)}",
      painPoint: "${esc(productionLine.painPoint)}",
      exampleProject: "${esc(productionLine.exampleProject)}",
      workflowAngle: "${esc(productionLine.workflowAngle)}",
      outputType: "${esc(productionLine.outputType)}",
      recommendedStartingPoint: "${esc(productionLine.recommendedStartingPoint)}",
      relatedUseCase: "${esc(productionLine.relatedUseCase)}",
      conversionReason: "${esc(productionLine.conversionReason)}",
      locale: "en",
    },
    studioCta: ${STUDIO_CTA},
  },`;
  }
).join("\n")}
];
`;

const industriesFile = `import type { IndustryWave3Config } from "@/lib/seo/seo-content-wave3-builder";

export const INDUSTRIES_WAVE3_CONFIG: IndustryWave3Config[] = [
${INDUSTRIES.map(
  ([slug, industry, buyer, visual, story, metrics]) => {
    const productionLine = productionLineFor({
      audience: `${industry} marketing operators`,
      goal: `scale ${industry.toLowerCase()} campaigns with consistent quality`,
      painPoint: visual,
      exampleProject: `${industry} launch sprint with storyboarded hooks and proof scenes`,
      workflowAngle: `${buyer} experimentation cadence across channels`,
      outputType: `${industry.toLowerCase()} ad variants, explainers, and channel-ready exports`,
      recommendedStartingPoint: `/studio/storyboards/new for ${slug} quarterly planning`,
      relatedUseCase: `/industries/${slug}`,
      conversionReason: story,
    });
    const extra = industryUniqueFields(slug, industry, buyer, visual, story, metrics);
    return `  {
    slug: "${slug}",
    industry: "${esc(industry)}",
    buyer: "${esc(buyer)}",
    visualNeed: "${esc(visual)}",
    storyAngle: "${esc(story)}",
    metrics: "${esc(metrics)}",
    scrollHookDetail: "${esc(extra.scrollHookDetail)}",
    studioEnforcementDetail: "${esc(extra.studioEnforcementDetail)}",
    metricsExperimentDetail: "${esc(extra.metricsExperimentDetail)}",
    weeklyCadence: "${esc(extra.weeklyCadence)}",
    weeklyBatchGuard: "${esc(extra.weeklyBatchGuard)}",
    complianceDisclaimerDetail: "${esc(extra.complianceDisclaimerDetail)}",
    formatsChannelsDetail: "${esc(extra.formatsChannelsDetail)}",
    formatsSubtitles: "${esc(extra.formatsSubtitles)}",
    creditsScaleDetail: "${esc(extra.creditsScaleDetail)}",
    creditsSubscription: "${esc(extra.creditsSubscription)}",
    nextStepsDetail: "${esc(extra.nextStepsDetail)}",
    nextStepsBrowse: "${esc(extra.nextStepsBrowse)}",
    channelMixDetail: "${esc(extra.channelMixDetail)}",
    seasonalCalendarDetail: "${esc(extra.seasonalCalendarDetail)}",
    creativeTestingDetail: "${esc(extra.creativeTestingDetail)}",
    procurementAgency: "${esc(extra.procurementAgency)}",
    procurementAlternatives: "${esc(extra.procurementAlternatives)}",
    operationsNaming: "${esc(extra.operationsNaming)}",
    operationsLegal: "${esc(extra.operationsLegal)}",
    benchmarksWatchthrough: "${esc(extra.benchmarksWatchthrough)}",
    benchmarksPricing: "${esc(extra.benchmarksPricing)}",
    benchmarksPair: "${esc(extra.benchmarksPair)}",
    productionLine: {
      audience: "${esc(productionLine.audience)}",
      goal: "${esc(productionLine.goal)}",
      painPoint: "${esc(productionLine.painPoint)}",
      exampleProject: "${esc(productionLine.exampleProject)}",
      workflowAngle: "${esc(productionLine.workflowAngle)}",
      outputType: "${esc(productionLine.outputType)}",
      recommendedStartingPoint: "${esc(productionLine.recommendedStartingPoint)}",
      relatedUseCase: "${esc(productionLine.relatedUseCase)}",
      conversionReason: "${esc(productionLine.conversionReason)}",
      locale: "en",
    },
    studioCta: ${STUDIO_CTA},
  },`;
  }
).join("\n")}
];
`;

const longtailFile = `import type { LongtailGuideWave3Config } from "@/lib/seo/seo-content-wave3-builder";

export const LONGTAIL_GUIDES_WAVE3_CONFIG: LongtailGuideWave3Config[] = [
${longtailFlat
  .map(
    (g) => `  {
    slug: "${g.slug}",
    title: "${esc(g.title)}",
    h1: "${esc(g.h1)}",
    keyword: "${esc(g.keyword)}",
    theme: "${esc(g.theme)}",
    searchIntent: "${esc(g.searchIntent)}",
    audience: "${esc(g.audience)}",
    workflowTip: "${esc(g.workflowTip)}",
    keywordContext: "${esc(g.keywordContext)}",
    preflightGoal: "${esc(g.preflightGoal)}",
    editorUpload: "${esc(g.editorUpload)}",
    editorReferences: "${esc(g.editorReferences)}",
    studioScenes: "${esc(g.studioScenes)}",
    motionBatch: "${esc(g.motionBatch)}",
    voicePublish: "${esc(g.voicePublish)}",
    publishIterate: "${esc(g.publishIterate)}",
    mistakesFix: "${esc(g.mistakesFix)}",
    scaleInternal: "${esc(g.scaleInternal)}",
    budgetCluster: "${esc(g.budgetCluster)}",
    qualityBrand: "${esc(g.qualityBrand)}",
    relatedWorkflows: "${esc(g.relatedWorkflows)}",
    keywordExpansion: "${esc(g.keywordExpansion)}",
    workflowClosing: "${esc(g.workflowClosing)}",
    productionLine: {
      audience: "${esc(g.productionLine.audience)}",
      goal: "${esc(g.productionLine.goal)}",
      painPoint: "${esc(g.productionLine.painPoint)}",
      exampleProject: "${esc(g.productionLine.exampleProject)}",
      workflowAngle: "${esc(g.productionLine.workflowAngle)}",
      outputType: "${esc(g.productionLine.outputType)}",
      recommendedStartingPoint: "${esc(g.productionLine.recommendedStartingPoint)}",
      relatedUseCase: "${esc(g.productionLine.relatedUseCase)}",
      conversionReason: "${esc(g.productionLine.conversionReason)}",
      locale: "en",
    },
    studioCta: ${STUDIO_CTA},
  },`
  )
  .join("\n")}
];
`;

writeFileSync(join(ROOT, "src/lib/seo/locations-wave3-config.ts"), locationsFile);
writeFileSync(join(ROOT, "src/lib/seo/use-cases-wave3-config.ts"), useCasesFile);
writeFileSync(join(ROOT, "src/lib/seo/industries-wave3-config.ts"), industriesFile);
writeFileSync(join(ROOT, "src/lib/seo/longtail-guides-wave3-config.ts"), longtailFile);

console.log(
  "Generated wave3:",
  LOCATIONS.length,
  "locations,",
  USE_CASES.length,
  "use cases,",
  INDUSTRIES.length,
  "industries,",
  longtailFlat.length,
  "longtail guides =",
  LOCATIONS.length + USE_CASES.length + INDUSTRIES.length + longtailFlat.length
);

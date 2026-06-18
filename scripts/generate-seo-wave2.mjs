#!/usr/bin/env node
/**
 * Generates wave2 SEO config files with unique substantive fields.
 * Run: node scripts/generate-seo-wave2.mjs
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

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
    locale: input.locale ?? "en",
  };
}

function productionLineBlock(pl) {
  return `productionLine: {
      audience: "${esc(pl.audience)}",
      goal: "${esc(pl.goal)}",
      painPoint: "${esc(pl.painPoint)}",
      exampleProject: "${esc(pl.exampleProject)}",
      workflowAngle: "${esc(pl.workflowAngle)}",
      outputType: "${esc(pl.outputType)}",
      recommendedStartingPoint: "${esc(pl.recommendedStartingPoint)}",
      relatedUseCase: "${esc(pl.relatedUseCase)}",
      conversionReason: "${esc(pl.conversionReason)}",
      locale: "${pl.locale ?? "en"}",
    }`;
}

const ALTERNATIVES = [
  ["luma", "Luma", "AI video generation", "Luma Dream Machine excels at image-to-video with convincing camera motion and environmental physics.", "HomeCheff layers storyboards, character libraries, and publish-ready multi-format exports on top of motion generation.", "Solo creators chasing cinematic one-shots for reels without building episodic structure.", "Studios producing serialized narratives where the same hero appears in twelve scenes with voice and subtitles.", "Import your strongest Luma still frames into Editor, then storyboard continuity in Studio before batch Motion renders.", "Monday you generate three hero clips in Luma; Tuesday a client asks for the same character in a product demo with Dutch subtitles — you rebuild from scratch. In HomeCheff you extend scene four, assign voice, export 9:16 and 16:9 from one storyboard.", "Luma users often ask about dialogue, recurring characters, and subtitle tracks. HomeCheff handles those in Studio and Publish rather than external editors."],
  ["midjourney", "Midjourney", "AI image generation", "Midjourney produces stunning still frames and style exploration through Discord-native workflows.", "HomeCheff turns approved stills into timed scenes, motion clips, narration, and published video versions.", "Artists exploring aesthetics and single hero images for campaigns.", "Teams that must animate a consistent cast across ads, explainers, and social cuts.", "Save Midjourney outputs to Library via Editor, then direct scene order and pacing in Studio instead of animating slides manually.", "You spend Thursday in Midjourney nailing look dev; Friday marketing needs a fifteen-second motion ad with VO. HomeCheff connects stills to Motion without rebuilding prompts per clip.", "Midjourney excels at look; HomeCheff excels at time — scene duration, voice sync, and export presets for TikTok versus YouTube."],
  ["final-cut-pro", "Final Cut Pro", "professional video editing", "Final Cut Pro offers magnetic timeline editing, optimized performance on Apple Silicon, and deep color tools.", "HomeCheff generates scenes, AI motion, and voiced storyboards upstream so Final Cut becomes assembly polish — or you publish directly from HomeCheff.", "Editors finishing long-form documentary or broadcast packages with precise manual cuts.", "Creators who need to originate storyboarded AI content weekly without hiring an editor for every draft.", "Generate scene clips in HomeCheff Motion, then optionally import to Final Cut for fine trims, licensed music, and broadcast deliverables.", "A YouTube creator scripts five scenes in Studio Monday, renders Tuesday, publishes Wednesday — no timeline wrestling for draft cuts.", "Final Cut users ask whether AI can feed the timeline reliably; HomeCheff exports scene clips with consistent resolution ready for compound clips."],
  ["davinci-resolve", "DaVinci Resolve", "color grading and editing", "DaVinci Resolve combines editing, Fusion VFX, Fairlight audio, and industry-grade color in one desktop suite.", "HomeCheff handles AI storyboarding, scene generation, and voice before Resolve handles final grade and mix.", "Post houses delivering graded commercials and films with dedicated colorists.", "Agencies originating dozens of variant ads per month where Resolve is overkill for first drafts.", "Use HomeCheff for storyboard approval and motion drafts; round-trip to Resolve only for hero spots needing ACES pipelines.", "Resolve shines on the grade pass; HomeCheff shines when you need ten language variants before anyone touches scopes.", "Resolve teams want structured scene outputs — HomeCheff names Publish versions per locale so ingest stays organized."],
  ["filmora", "Filmora", "consumer video editing", "Filmora bundles templates, transitions, and beginner-friendly timelines for quick social edits.", "HomeCheff replaces template hunting with story-first generation — characters, voices, and scenes you own in Library.", "Hobbyists editing vacation footage with drag-and-drop effects.", "Small businesses publishing weekly product stories with consistent mascots and subtitles.", "Replace one template video with a five-scene storyboard; reuse Library assets next week instead of buying new Filmora packs.", "Filmora users often rebuild the same intro every campaign; HomeCheff stores brand intros as reusable scenes.", "Filmora strengths are transitions; HomeCheff strengths are narrative consistency and credit-transparent AI generation."],
  ["synthesia", "Synthesia", "AI avatar video", "Synthesia pioneered corporate avatar presenters with script-to-video in minutes.", "HomeCheff supports illustrated characters, worlds, and cinematic scenes — not only talking-head avatars.", "HR and L&D teams needing compliance training with photoreal presenters.", "Brands telling story-driven ads with custom characters, motion scenes, and multilingual versions.", "Pilot one Synthesia module and one HomeCheff storyboard; compare engagement on narrative versus presenter-only formats.", "Training teams love avatars; marketing teams need product in scene three — HomeCheff plans both.", "Synthesia optimizes talking head; HomeCheff optimizes scene lists with b-roll, motion, and brand worlds."],
  ["heygen", "HeyGen", "AI avatar and dubbing", "HeyGen offers avatar video, translation, and lip-sync for sales and support content.", "HomeCheff integrates voice, subtitles, and translation inside a full storyboard — not only presenter clips.", "Sales enablement producing personalized outreach videos with digital spokespeople.", "Creators building episodic series with illustrated casts and motion scenes beyond avatar frames.", "Use HeyGen for single-speaker outreach; use HomeCheff when scene two must show the product in motion.", "HeyGen wins the single URL video; HomeCheff wins the campaign with five scenes and three locales.", "HeyGen users ask about b-roll; HomeCheff generates scene images and motion per story beat."],
  ["veed", "Veed", "online video editing", "Veed provides browser-based trimming, subtitles, and light AI tools for quick social posts.", "HomeCheff is a production studio — storyboards, AI scenes, motion, voice — before you need a trim tool.", "Creators subtitling and cropping existing footage fast.", "Teams originating AI-first video from brief to publish without bouncing between five tabs.", "Keep Veed for polishing captured webcam footage; originate campaigns in HomeCheff Studio.", "Veed edits what you already shot; HomeCheff creates what you have not shot yet.", "Veed users hit limits when they need new scenes; HomeCheff generates them from storyboards."],
  ["animoto", "Animoto", "slideshow video marketing", "Animoto turns photos and clips into template-driven marketing videos.", "HomeCheff replaces static slideshows with directed scenes, motion, and character continuity.", "Real estate agents and retailers using photo montage templates.", "Brands upgrading from slideshows to narrative ads with voice and animated product moments.", "Import Animoto photo sets to Editor, rebuild as five scene beats in Studio with motion on key frames.", "Slideshow tools peak at nostalgia; HomeCheff adds story arc and CTA scenes that convert.", "Animoto users want movement beyond Ken Burns; HomeCheff Motion animates hero products intentionally."],
  ["clipchamp", "Clipchamp", "browser video editing", "Clipchamp offers Microsoft-integrated browser editing with stock and templates.", "HomeCheff generates AI-native story content with Library reuse — not only template assembly.", "Office users making quick presentations and social clips.", "Marketing teams producing weekly AI storyboards tied to product launches.", "Export Clipchamp intros as assets to Library; build episodic content in HomeCheff around them.", "Clipchamp fits PowerPoint culture; HomeCheff fits campaign culture with variants.", "Clipchamp users ask for AI scenes; HomeCheff builds scenes from characters and worlds."],
  ["doodly", "Doodly", "whiteboard animation", "Doodly specializes in hand-drawn whiteboard explainer animations with drag-and-drop assets.", "HomeCheff produces explainers with custom scenes, voices, and motion beyond whiteboard tropes.", "Consultants selling simple chalk-style explainers.", "Startups needing brand-specific characters and multilingual product demos.", "Storyboard your explainer in Studio with scene stills; use Motion for emphasis instead of repetitive doodle paths.", "Whiteboard fatigue is real; HomeCheff lets you keep clarity without identical swipe animations.", "Doodly users want custom art; HomeCheff Library stores your illustrator's assets across episodes."],
  ["powtoon", "Powtoon", "animated presentation video", "Powtoon delivers cartoon-style corporate videos with character rigs and slide timing.", "HomeCheff connects AI scene generation, voice, and publish pipelines for series — not single slide decks.", "Internal comms teams making training cartoons.", "Agencies shipping client campaigns with reusable mascots and localized variants.", "Migrate Powtoon scripts into Studio scene lists; assign voices to characters once in Library.", "Powtoon decks age quickly; HomeCheff Projects keep season two on-brand.", "Powtoon users need fresh visuals per quarter; HomeCheff regenerates scenes without redrawing rigs."],
  ["toonly", "Toonly", "cartoon explainer video", "Toonly offers simple character animation for explainer videos with prebuilt actions.", "HomeCheff supports custom worlds, reference-driven scenes, and motion from your art style.", "SMBs buying cookie-cutter explainers on budget.", "Creators with distinct illustration styles who refuse generic cartoon rigs.", "Replace Toonly character swaps with Library characters directed in Studio scenes.", "Toonly limits style; HomeCheff respects reference images from your brand book.", "Toonly users outgrow templates; HomeCheff scales to series with the same cast."],
  ["flexclip", "FlexClip", "template video maker", "FlexClip combines templates, stock media, and simple timeline tools for marketers.", "HomeCheff generates bespoke scene imagery and motion aligned to your brief — not stock montages.", "Solo marketers needing fast holiday promos from templates.", "Teams building recognizable IP across TikTok, Reels, and YouTube from one storyboard.", "Use FlexClip for emergency stock-based posts; use HomeCheff for flagship campaigns.", "Template fatigue hurts CTR; HomeCheff scenes match your product photography.", "FlexClip users want unique visuals; HomeCheff produces them per scene from references."],
  ["kling", "Kling", "AI video generation", "Kling delivers high-motion AI clips competitive with other generative video models.", "HomeCheff wraps Kling-style motion inside storyboards, voice tracks, subtitles, and publishing.", "Experimenters generating viral clips from prompts.", "Production leads who must connect clip three to clip four with the same protagonist.", "Treat Kling outputs as scene plates in Editor; direct narrative in Studio before scaling renders.", "A viral Kling clip does not equal a product launch series; HomeCheff bridges that gap.", "Kling users ask about story; HomeCheff is the story layer around motion models."],
  ["leonardo", "Leonardo", "AI image and motion", "Leonardo offers image generation, canvas editing, and emerging video features for game and marketing art.", "HomeCheff turns Leonardo stills into timed productions with characters, VO, and channel exports.", "Game artists iterating concept art and short motion tests.", "Studios shipping marketing trailers built from consistent character sheets.", "Sync Leonardo character sheets to Library; storyboard trailer beats in Studio.", "Leonardo nails key art; HomeCheff nails trailer pacing with narration and subtitles.", "Leonardo users want pipeline; HomeCheff is the video pipeline after image approval."],
  ["kapwing", "Kapwing", "collaborative online editing", "Kapwing focuses on meme templates, resizing, and team review for social teams.", "HomeCheff originates long-form story content; Kapwing can still resize if needed — but Publish covers formats.", "Social managers repurposing clips for platforms.", "Content leads creating source material once and exporting platform-specific versions from HomeCheff.", "Originate in HomeCheff; use Kapwing only for meme-style remixes if your audience demands it.", "Repurposing without source planning creates brand drift; HomeCheff plans variants upfront.", "Kapwing users need source video; HomeCheff generates source scenes systematically."],
  ["adobe-express", "Adobe Express", "quick social design", "Adobe Express bundles templates, brand kits, and light video for Express users in the Adobe ecosystem.", "HomeCheff goes deeper on AI storyboards and motion while Express handles static social tiles.", "Designers making fast Instagram carousels.", "Video-first teams needing scene-by-scene control and voice.", "Keep Express for static posts; build video campaigns in HomeCheff with the same brand colors in Library.", "Express speeds static; HomeCheff speeds serialized video — complementary, not identical.", "Express video is template-short; HomeCheff video is storyboard-long."],
  ["pictory", "Pictory", "text-to-video marketing", "Pictory converts blog posts and scripts into stock-footage videos automatically.", "HomeCheff uses your references and characters instead of generic stock for brand-safe storyboards.", "Bloggers repurposing articles into YouTube posts quickly.", "Brands that cannot afford mismatched stock faces in product videos.", "Feed your article outline as a Studio storyboard beat sheet; replace stock with generated scenes.", "Stock montage screams generic; HomeCheff scenes show your actual offer.", "Pictory users complain about stock relevance; HomeCheff fixes that with reference-driven scenes."],
  ["visla", "Visla", "AI video for business", "Visla generates business videos from scripts with stock and AI options.", "HomeCheff emphasizes reusable characters and worlds for campaigns — not one-off script renders.", "Consultants making quick pitch videos.", "B2B teams running ABM video sequences with consistent spokesperson style.", "Map Visla scripts to Studio scenes; upgrade visual consistency with Library characters.", "ABM needs recognizable series; HomeCheff Projects group accounts.", "Visla optimizes speed; HomeCheff optimizes repeatability across touches."],
  ["opus-clip", "Opus Clip", "short-form repurposing", "Opus Clip uses AI to slice long videos into viral shorts with captions.", "HomeCheff creates intentional short-form storyboards — not only clipping long webinars.", "Podcasters mining long episodes for TikTok.", "Creators scripting Shorts natively with hooks designed for vertical.", "Keep Opus for webinar mining; script native Shorts in Studio with vertical Publish exports.", "Clipped shorts inherit slow hooks; HomeCheff shorts open with scene one designed to stop scroll.", "Opus users need long source; HomeCheff users need no long source."],
  ["lumen5", "Lumen5", "blog-to-video", "Lumen5 transforms articles into video summaries with automated scene selection.", "HomeCheff lets directors choose every scene, voice, and motion beat for brand fidelity.", "Publishers automating content recycling.", "Editorial teams keeping visual standards on AI-assisted video.", "Replace automated scene picks with Studio storyboards tied to editorial guidelines.", "Automation saves minutes; direction saves reputation.", "Lumen5 users fight irrelevant scenes; HomeCheff users approve scenes before render."],
  ["biteable", "Biteable", "template marketing video", "Biteable offers text-led template videos for marketers and internal comms.", "HomeCheff produces custom scene imagery and episodic series beyond template text swaps.", "Comms teams sending weekly updates.", "Product marketers launching features with hero motion and localized CTAs.", "Rebuild Biteable scripts as five-scene Studio boards with branded motion.", "Template text swaps do not scale IP; Library characters do.", "Biteable users want differentiation; HomeCheff delivers visual differentiation per scene."],
  ["moovly", "Moovly", "animated video creation", "Moovly provides object-based animation for explainers with libraries of assets.", "HomeCheff connects AI generation with storyboards for faster bespoke explainers.", "Teachers making curriculum clips.", "Edtech companies versioning lessons per locale from one storyboard.", "Import Moovly asset lists as scene requirements; generate visuals in Studio.", "School districts need updates; HomeCheff re-renders scene three when standards change.", "Moovly users manually animate; HomeCheff users direct AI motion."],
  ["renderforest", "Renderforest", "logo intros and explainers", "Renderforest sells logo reveals, slideshows, and explainer templates online.", "HomeCheff stores your real brand assets and builds episodic video — not one-time intros.", "Startups buying cheap logo stings.", "Growing brands investing in character-driven video marketing.", "Keep Renderforest sting for events; build marketing body in HomeCheff.", "Intro templates without story body underperform; HomeCheff delivers both.", "Renderforest users outgrow intros; HomeCheff grows with series."],
];

const GUIDES = [
  ["how-to-animate-photos", "How to Animate Photos", "How to animate photos with AI", "Photo animation", "photographers and memory makers", "a short emotional clip that brings still images to life with motion and optional narration", "Editor → Studio → Motion → Publish", "Upload portraits, travel stills, or product photos. Remove distracting backgrounds in Editor and tag reference roles so faces stay recognizable.", "Order photos as story beats — establish, moment, detail, closing tribute. Add voiceover script in Studio.", "Apply subtle parallax or environmental motion in Motion; avoid over-animation on faces.", "Export vertical for Reels or widescreen for YouTube; add subtitles for silent autoplay."],
  ["how-to-create-ai-commercials", "How to Create AI Commercials", "How to create AI commercials", "AI commercials", "marketing teams and small business owners", "a fifteen-to-thirty-second ad with product hero shots, offer, and CTA", "Studio storyboards → Motion → Publish", "Import product PNGs and brand logos. Fuse product into scene plates in Editor.", "Write hook scene, problem, product demo, proof, CTA. Assign energetic VO.", "Animate product reveal and lifestyle b-roll scenes; keep logo scene static for clarity.", "Export 9:16 and 16:9 variants; name versions per ad network."],
  ["how-to-make-social-ads", "How to Make Social Ads", "How to make social ads", "Social ads", "performance marketers", "multiple ad variants for Meta, TikTok, and YouTube testing", "Studio → Publish", "Prepare offer text overlays as reference; upload past winning creatives to Editor.", "Build three hooks for the same body scenes — Studio duplicates storyboards efficiently.", "Motion emphasis on first two seconds; fast movement wins scroll-stopping tests.", "Publish each hook as separate version; track in Projects."],
  ["how-to-make-tiktok-videos", "How to Make TikTok Videos", "How to make TikTok videos", "TikTok videos", "short-form creators", "vertical videos with strong hooks and on-screen subtitles", "Studio → Motion → Publish", "Collect trend references; upload character or product assets to Editor.", "Script five to seven fast scenes; front-load hook in scene one.", "Use punchy motion on beat changes; keep clips under three seconds per scene where possible.", "Export 9:16 from Publish with burned-in subtitles."],
  ["how-to-make-reels", "How to Make Reels", "How to make Instagram Reels", "Instagram Reels", "Instagram creators and brands", "on-brand Reels with consistent visuals and captions", "Studio → Publish", "Upload brand kit colors and fonts as reference images in Editor.", "Plan aesthetic transitions between scenes; Reels reward cohesive color.", "Motion moderate — Instagram audiences tolerate less chaos than TikTok.", "Publish 9:16; schedule via your existing social stack."],
  ["how-to-make-shorts", "How to Make YouTube Shorts", "How to make YouTube Shorts", "YouTube Shorts", "YouTube creators", "Shorts that tease longer content or stand alone", "Studio → Motion → Publish", "Use thumbnail stills from Editor as scene one references.", "Hook, value, CTA to long video — three to five scenes.", "Fast motion on hook; clearer framing on CTA.", "Export vertical; link long-form in description."],
  ["how-to-create-youtube-intros", "How to Create YouTube Intros", "How to create YouTube intros", "YouTube intros", "channel owners", "a repeatable three-to-five-second branded intro sequence", "Studio → Motion → Library", "Logo PNG with transparency; mascot character if applicable.", "Same scene order every episode — logo sting, tagline, transition wipe.", "Loop-friendly motion; avoid long build-ups.", "Save intro as Library template; attach to new Projects."],
  ["how-to-create-product-videos", "How to Create Product Videos", "How to create product videos", "Product videos", "e-commerce and SaaS marketers", "demo videos showing features and outcomes", "Editor → Studio → Motion", "Product screenshots and UI captures; clean backgrounds in Editor.", "Scene per feature; VO explains benefit not button list.", "Subtle UI zoom motion; highlight cursor paths in Motion instructions.", "Publish for product page embed and social cutdowns."],
  ["how-to-animate-logos", "How to Animate Logos", "How to animate logos", "Logo animation", "brand designers", "logo stings for video openers and events", "Editor → Motion → Library", "Vector or high-res PNG logo; separate mark and wordmark if needed.", "Single-scene or three-beat reveal storyboard.", "Motion handles reveal, glow, and settle; keep duration under four seconds.", "Export ProRes or MP4; store in Library for reuse."],
  ["how-to-create-explainer-videos", "How to Create Explainer Videos", "How to create explainer videos", "Explainer videos", "startups and educators", "sixty-to-ninety-second explainers with clear narrative", "Studio → Motion → Publish", "Icons and diagrams as references; avoid cluttered slides.", "Problem, solution, how it works, proof, CTA — five scenes minimum.", "Consistent character guide walks through scenes.", "Add subtitles; export for website hero and sales decks."],
  ["how-to-make-travel-videos", "How to Make Travel Videos", "How to make travel videos", "Travel videos", "travel creators", "cinematic travel stories from photo sets", "Editor → Studio → Motion", "Upload photo batches per location; color-match in Editor if needed.", "Chronological or emotional arc scenes — arrival, highlight, food, sunset.", "Parallax and environmental motion on landscapes.", "Publish widescreen for YouTube and vertical highlights for Shorts."],
  ["how-to-make-wedding-videos", "How to Make Wedding Videos", "How to make wedding videos", "Wedding videos", "couples and videographers", "romantic highlight reels from stills and clips", "Editor → Studio → Motion", "Curate best portraits and venue shots; gentle Editor cleanup.", "Story arc: preparation, ceremony, celebration, portrait magic.", "Soft motion; avoid distorting faces.", "Export for guests; subtitles for speeches if VO added."],
  ["how-to-make-birthday-videos", "How to Make Birthday Videos", "How to make birthday videos", "Birthday videos", "families and party planners", "personalized birthday tributes with photos and messages", "Editor → Studio → Motion", "Gather photos across years; consistent crop in Editor.", "Opening greeting, memories montage scenes, message from family, closing wish.", "Playful motion on party scenes; calmer on childhood photos.", "Share vertical in family group chats."],
  ["how-to-make-memorial-videos", "How to Make Memorial Videos", "How to make memorial videos", "Memorial videos", "families and celebrants", "respectful tributes with dignified pacing", "Editor → Studio → Motion", "Select photos with care; Editor touch-up only when requested.", "Life chapters as scenes; gentle VO or title cards.", "Minimal motion — slow Ken Burns style via Motion instructions.", "Export for services and private sharing."],
  ["how-to-make-restaurant-videos", "How to Make Restaurant Videos", "How to make restaurant videos", "Restaurant videos", "restaurant owners and food creators", "appetizing promos for menu items and ambiance", "Editor → Studio → Motion", "Plate photography and interior shots; enhance warmth in Editor.", "Dish hero, kitchen craft, dining room vibe, reservation CTA.", "Steam and garnish motion accents in Motion.", "Publish for Google Business Profile and Instagram."],
  ["how-to-make-real-estate-videos", "How to Make Real Estate Videos", "How to make real estate videos", "Real estate videos", "agents and property marketers", "property tours that sell lifestyle and layout", "Editor → Studio → Motion", "Upload listing photos; wide-angle living spaces first in Editor order.", "Exterior, living, kitchen, beds, neighborhood, agent CTA.", "Smooth pan motion across stills; drone clips if available as references.", "Export for MLS embed and social teases."],
  ["how-to-make-event-videos", "How to Make Event Videos", "How to make event videos", "Event videos", "event organizers", "recap videos that drive next-year ticket sales", "Studio → Motion → Publish", "Logo, speaker photos, crowd stills from photographer.", "Announce, highlights, testimonials, save-the-date CTA.", "Energetic motion on crowd scenes.", "Publish within forty-eight hours post-event."],
  ["how-to-make-education-videos", "How to Make Education Videos", "How to make education videos", "Education videos", "teachers and course creators", "lesson segments students can follow", "Studio → Motion → Publish", "Diagrams and slide exports to Editor as references.", "Learning objective, explanation, example, recap quiz prompt.", "Stepwise motion on diagrams.", "Subtitles essential; export for LMS upload."],
  ["how-to-make-charity-videos", "How to Make Charity Videos", "How to make charity videos", "Charity videos", "nonprofits", "donation-driving stories with clear impact", "Studio → Publish", "Impact photos with consent; brand guidelines in Editor.", "Need, program, beneficiary story, donation CTA.", "Emotional but dignified motion.", "Publish for fundraising pages and email embeds."],
  ["how-to-make-crowdfunding-videos", "How to Make Crowdfunding Videos", "How to make crowdfunding videos", "Crowdfunding videos", "founders and creators", "pitch videos that explain product and urgency", "Studio → Motion → Publish", "Prototype photos, team headshots, render references.", "Problem, product demo, team, milestones, pledge CTA.", "Demo scene motion shows product in use.", "Host on campaign page; cut Shorts for ads."],
  ["how-to-create-story-videos", "How to Create Story Videos", "How to create story videos", "Story videos", "writers and storytellers", "narrative shorts with beginning, middle, end", "Studio → Motion", "Character sheets in Editor; maintain identity in Library.", "Beat sheet as scenes; dialogue in Studio.", "Performance motion per story beat.", "Series potential — save world in Library."],
  ["how-to-create-documentary-style-videos", "How to Create Documentary Style Videos", "How to create documentary style videos", "Documentary style videos", "journalists and creators", "credible documentary pacing with VO and b-roll", "Studio → Motion → Publish", "Archival stills and interview grab references.", "Chapter scenes; VO drives timeline.", "Restrained motion; let testimony breathe.", "Export long-form and chapter Shorts."],
  ["how-to-create-cinematic-videos", "How to Create Cinematic Videos", "How to create cinematic videos", "Cinematic videos", "filmmakers and brands", "filmic mood with intentional camera language", "Studio → Motion", "Reference frames with color grade targets.", "Wide, medium, close scene rhythm.", "Motion instructions specify dolly, rack focus feel.", "Export 24fps feel; widescreen Publish."],
  ["how-to-animate-drawings", "How to Animate Drawings", "How to animate drawings", "Drawing animation", "illustrators", "movement that respects hand-drawn line quality", "Editor → Motion", "Scan or export drawings; clean edges in Editor.", "Scene per panel; optional narrator.", "Motion preserves line art style per instructions.", "Ideal for portfolios and client pitches."],
  ["how-to-animate-paintings", "How to Animate Paintings", "How to animate paintings", "Painting animation", "fine artists", "subtle life in static paintings for galleries and social", "Editor → Motion", "High-res painting scans; texture preserved.", "Single or triptych scenes.", "Gentle atmospheric motion only.", "Publish for gallery promos."],
  ["how-to-animate-childrens-drawings", "How to Animate Children's Drawings", "How to animate children's drawings", "Children's drawing animation", "parents and teachers", "delightful clips that celebrate kids' art safely", "Editor → Studio → Motion", "Scan drawings; brighten in Editor if needed.", "Simple three-scene adventures starring the drawing.", "Playful bounce motion; keep faces sweet.", "Share with family; classroom-safe subtitles."],
  ["how-to-create-ai-movies", "How to Create AI Movies", "How to create AI movies", "AI movies", "indie filmmakers", "short films assembled from scene pipelines", "Studio → Motion → Publish", "Mood boards and character refs in Editor.", "Full act structure as scene list; iterate per act.", "Motion per scene; reshoot in Studio not on set.", "Festival export and trailer cut from same project."],
  ["how-to-create-ai-trailers", "How to Create AI Trailers", "How to create AI trailers", "AI trailers", "filmmakers and game studios", "high-energy ninety-second trailers", "Studio → Motion", "Key art and logo in Editor.", "Teaser beats — mystery, action montage, title card.", "Fast cuts via short scene durations.", "Publish multiple aspect ratios for platforms."],
  ["how-to-create-ai-music-videos", "How to Create AI Music Videos", "How to create AI music videos", "AI music videos", "musicians and labels", "visuals synced to song structure", "Studio → Motion", "Album art as reference; lyric sheet for scene prompts.", "Verse, chorus, bridge scenes aligned to timestamps.", "Motion intensity follows chorus peaks.", "Export for YouTube premiere."],
  ["how-to-create-ai-fashion-videos", "How to Create AI Fashion Videos", "How to create AI fashion videos", "AI fashion videos", "fashion brands", "lookbook motion for seasonal drops", "Editor → Studio → Motion", "Runway stills and fabric detail macros.", "Look per scene; model consistency via Library.", "Fabric and walk motion in Motion.", "Publish for Instagram Shop and TikTok."],
  ["how-to-create-ai-food-videos", "How to Create AI Food Videos", "How to create AI food videos", "AI food videos", "food brands and creators", "mouth-watering product and recipe clips", "Editor → Motion", "Hero ingredient photos; steam overlays as refs.", "Ingredient, prep, sizzle, plate, bite CTA.", "Steam and pour motion accents.", "Vertical for delivery apps."],
  ["how-to-create-ai-cooking-videos", "How to Create AI Cooking Videos", "How to create AI cooking videos", "AI cooking videos", "chefs and food bloggers", "recipe videos with clear steps", "Studio → Motion", "Step photos or short captures per ingredient.", "Mise en place, cook steps, plating, taste reaction.", "Hand motion on chop and stir scenes.", "Subtitles for kitchen noise environments."],
  ["how-to-create-ai-product-launches", "How to Create AI Product Launch Videos", "How to create AI product launch videos", "Product launch videos", "product managers", "launch day hero video plus ad variants", "Studio → Publish", "PR imagery, UI, packaging refs.", "Teaser, reveal, features, preorder CTA.", "Dramatic reveal motion on unbox scene.", "Coordinate Publish versions with email send."],
  ["how-to-create-startup-videos", "How to Create Startup Videos", "How to create startup videos", "Startup videos", "founders", "credibility-building startup stories for web and decks", "Studio → Publish", "Team photos, product screenshots.", "Origin story, problem, solution, traction, hiring CTA.", "Professional but human motion tone.", "Embed on homepage and pitch deck."],
  ["how-to-create-pitch-videos", "How to Create Pitch Videos", "How to create pitch videos", "Pitch videos", "founders raising capital", "ninety-second investor pitches", "Studio → Motion", "Clean product demo assets; no cluttered slides.", "Problem, market, product, team, ask.", "Demo scene proves product; keep metrics on screen.", "Private link via Publish export."],
  ["how-to-create-affiliate-videos", "How to Create Affiliate Videos", "How to create affiliate videos", "Affiliate videos", "affiliate marketers", "review and recommendation videos that convert", "Studio → Publish", "Product photos and personal b-roll refs.", "Hook, personal use story, pros, cons, link CTA.", "Honest pacing; motion on product in hand.", "Disclosure in subtitles; track variants."],
  ["how-to-create-marketing-videos", "How to Create Marketing Videos", "How to create marketing videos", "Marketing videos", "marketing teams", "campaign videos aligned to funnel stage", "Studio → Publish", "Brand guidelines and past winners in Editor.", "Awareness, consideration, conversion cuts from one storyboard base.", "Tone shifts per funnel scene set.", "Projects per campaign quarter."],
  ["how-to-create-sales-videos", "How to Create Sales Videos", "How to create sales videos", "Sales videos", "sales teams", "personalized outbound and demo videos", "Studio → Publish", "Prospect industry refs; generic demo UI.", "Personalized intro scene, standard demo, calendar CTA.", "Demo motion highlights their pain point.", "Version per vertical in Projects."],
  ["how-to-create-recruitment-videos", "How to Create Recruitment Videos", "How to create recruitment videos", "Recruitment videos", "HR and recruiters", "employer brand and role-specific promos", "Studio → Publish", "Office culture photos; team candid refs.", "Culture, role, growth, apply CTA.", "Welcoming motion tone.", "Embed on careers page."],
  ["how-to-create-local-business-videos", "How to Create Local Business Videos", "How to create local business videos", "Local business videos", "local business owners", "trust-building promos for community customers", "Editor → Studio → Publish", "Storefront, staff, service action shots.", "Welcome, services, testimonial, visit CTA.", "Friendly neighborhood pacing.", "Google Business and local Facebook."],
];

const WORKFLOWS = [
  ["teacher", "Teacher video workflow", "Teacher workflows", "teachers", "limited time to produce engaging lesson media", "HomeCheff turns lesson outlines into subtitled scene videos stored per unit in Projects.", ["Lesson intros", "Concept explainers", "Homework recap clips", "Parent newsletter videos"], "A teacher updates scene three when curriculum changes without reshooting classroom video.", "Compared to screen recorders alone, HomeCheff adds narrative visuals students actually watch."],
  ["coach", "Coach video workflow", "Coach workflows", "coaches", "clients need accountability content between sessions", "Weekly tip videos reuse your branded intro and voice in Library.", ["Motivation shorts", "Exercise explainers", "Client onboarding", "Testimonial requests"], "Coaches film one master storyboard then swap offer CTA per program launch.", "Versus generic stock apps, HomeCheff keeps your face and brand consistent."],
  ["restaurant", "Restaurant video workflow", "Restaurant workflows", "restaurants", "menus change seasonally and photos must look appetizing", "Dish scenes update in Studio when the menu changes; Motion adds steam and garnish motion.", ["Dish promos", "Chef story", "Event nights", "Reservation CTAs"], "Friday tasting menu ships as new scene set Monday; Library keeps logo sting.", "Compared to hiring a videographer monthly, credits are predictable on /pricing."],
  ["real-estate-agent", "Real estate agent video workflow", "Real estate agent workflows", "real estate agents", "every listing needs fresh video fast", "Listing photos become tour storyboards with agent CTA scenes.", ["Listing tours", "Neighborhood guides", "Agent intro", "Open house promos"], "New listing uploads Sunday; video live Monday morning from Projects template.", "Versus slideshow apps, HomeCheff motion feels like a walkthrough."],
  ["marketing-agency", "Marketing agency video workflow", "Marketing agency workflows", "marketing agencies", "clients demand volume and brand fidelity", "Projects per client; Library stores brand worlds; variants export from one board.", ["Ad variants", "Case study videos", "Social calendars", "Pitch sizzles"], "Agency duplicates storyboard for client B using swapped Library assets only.", "Point tools choke on multi-client reuse; HomeCheff is built for it."],
  ["startup-founder", "Startup founder video workflow", "Startup founder workflows", "startup founders", "investors and customers need proof fast", "Pitch, product demo, and hiring videos share one character and UI library.", ["Pitch clips", "Product updates", "Founder updates", "Careers promos"], "Fundraise week exports pitch plus three Shorts from same Studio project.", "Founders should not learn After Effects; they should direct scenes."],
  ["freelancer", "Freelancer video workflow", "Freelancer workflows", "freelancers", "every proposal needs custom proof without unpaid scope creep", "Template storyboards per service line; swap client logo in Editor.", ["Portfolio pieces", "Proposal walkthroughs", "Testimonial reels", "Course promos"], "Freelancer sends personalized intro scene with prospect name in VO script.", "Freelancers compete on speed; HomeCheff shortens draft-to-delivery."],
  ["graphic-designer", "Graphic designer video workflow", "Graphic designer workflows", "graphic designers", "clients increasingly expect motion deliverables", "Static brand kits animate through Motion without learning NLE timelines.", ["Logo stings", "Social motion kits", "Pitch decks with video", "Brand story snippets"], "Designer exports client's SVG to Editor once; reuses across campaigns.", "Versus handing off to editors, designers retain creative control in Studio."],
  ["illustrator", "Illustrator video workflow", "Illustrator workflows", "illustrators", "animation requests arrive without animation skills", "Character sheets in Library drive scene consistency.", ["Character reveals", "Comic panel motion", "Client IP promos", "Portfolio shorts"], "Illustrator updates character outfit in Library; all scenes refresh consistently.", "Compared to frame-by-frame tools, HomeCheff respects illustration style via references."],
  ["photographer", "Photographer video workflow", "Photographer workflows", "photographers", "clients want slideshows plus motion for upsell", "Best stills from shoots become storyboard scenes with parallax motion.", ["Wedding highlights", "Brand lookbooks", "Session teasers", "Studio promos"], "Photographer delivers photo gallery plus motion teaser same week.", "Slideshow SaaS is table stakes; motion upsell wins retainers."],
  ["wedding-creator", "Wedding creator video workflow", "Wedding creator workflows", "wedding creators", "emotion and turnaround pressure", "Scene-based tributes with gentle motion and optional VO.", ["Highlights", "Teasers", "Vendor collabs", "Save-the-date motion"], "Creator templates romantic arc; swaps couple photos per booking.", "Wedding creators need dignity and speed; batch Motion after storyboard approval."],
  ["youtuber", "YouTuber video workflow", "YouTuber workflows", "YouTubers", "thumbnails and intros must match video brand", "Intro Library template plus episode storyboards for b-roll gaps.", ["Intros", "Explainer segments", "Shorts teasers", "Sponsor integrations"], "YouTuber scripts sponsor read as scene four; motion product insert without reshoot.", "YouTubers should not fight timelines for simple b-roll; Studio generates it."],
  ["tiktok-creator", "TikTok creator video workflow", "TikTok creator workflows", "TikTok creators", "hooks die without native vertical planning", "Hook-first storyboards with burned-in subtitles from Publish.", ["Trend responses", "Series episodes", "Product promos", "Behind-the-scenes"], "Creator batches five hooks Monday; tests winner Wednesday.", "Clippers help repurposing; HomeCheff scripts native vertical intent."],
  ["instagram-creator", "Instagram creator video workflow", "Instagram creator workflows", "Instagram creators", "aesthetic consistency across Reels and carousels", "Color-locked scenes from brand references in Editor.", ["Reels", "Story cutdowns", "Product features", "Collaboration promos"], "Creator maintains palette across twelve Reels via Library color refs.", "Instagram rewards cohesion; Projects enforce it."],
  ["streamer", "Streamer video workflow", "Streamer workflows", "streamers", "clips need context for YouTube and TikTok growth", "Stream highlights storyboarded with context scenes before clip.", ["Highlight packages", "Channel trailers", "Sponsor reads", "Schedule promos"], "Streamer adds context intro scene so Shorts make sense off-platform.", "Raw clips alone confuse new viewers; storyboards fix that."],
  ["game-developer", "Game developer video workflow", "Game developer workflows", "game developers", "trailers and devlogs must show consistent art direction", "Concept art in Library feeds trailer storyboards.", ["Trailers", "Devlogs", "Patch notes video", "Wishlist ads"], "Devlog episode eight reuses world assets from episode one.", "Game devs iterate art; HomeCheff iterates scenes without re-exporting builds."],
  ["author", "Author video workflow", "Author workflows", "authors", "books need video marketing without film crews", "Chapter teases as scene sequences with narrator VO.", ["Book trailers", "Character intros", "Launch announcements", "Reading samples"], "Author launches sequel using same character Library from book one promos.", "Authors live on story; HomeCheff maps chapters to scenes directly."],
  ["publisher", "Publisher video workflow", "Publisher workflows", "publishers", "catalogs need volume across titles", "Projects per title; shared imprint intro in Library.", ["Title trailers", "Author interviews b-roll", "Seasonal catalogs", "Retail promos"], "Publisher templates imprint sting; swaps cover art per title.", "Publishers scale marketing when reuse is systematic."],
  ["podcaster", "Podcaster video workflow", "Podcaster workflows", "podcasters", "audio shows need video for YouTube without filming", "Waveform scenes plus topic storyboards with guest photos.", ["Episode promos", "Audiogram alternatives", "Guest highlight clips", "Merch CTAs"], "Podcaster visualizes abstract topic in scene two for YouTube retention.", "Audiograms are fine; topic visuals grow watch time."],
  ["musician", "Musician video workflow", "Musician workflows", "musicians", "releases need visuals on streaming-era timelines", "Album art drives scene mood; lyric-synced storyboards.", ["Music videos", "Release teasers", "Tour promos", "Behind-the-track"], "Single project exports full video plus chorus Short.", "Musicians cannot always shoot; HomeCheff visualizes sonic identity."],
  ["band", "Band video workflow", "Band workflows", "bands", "group branding must stay coherent across members", "Shared Library for band aesthetic and logo stings.", ["Release promos", "Live show recaps", "Member intros", "Merch drops"], "Band updates tour dates in CTA scene without rebuilding entire video.", "Bands need fast promos between gigs; templates win."],
  ["event-organizer", "Event organizer video workflow", "Event organizer workflows", "event organizers", "sponsors expect professional recap fast", "Speaker and sponsor logo scenes templated per conference.", ["Hype reels", "Recaps", "Speaker promos", "Ticket launches"], "Day-one recap publishing scene list approved pre-event.", "Event orgs sell next year on this year's video speed."],
  ["charity", "Charity video workflow", "Charity workflows", "charities", "stories must be respectful and donation-clear", "Impact scenes with consent-tracked photos in Projects.", ["Campaign appeals", "Volunteer thanks", "Impact reports", "Event invites"], "Charity reuses beneficiary story arc with updated stats scene only.", "Charities cannot afford agencies; HomeCheff respects dignity and budget."],
  ["ngo", "NGO video workflow", "NGO workflows", "NGOs", "field footage is scarce; stories still must be told", "Field photo storyboards with translated Publish versions.", ["Program explainers", "Donor updates", "Policy advocacy", "Volunteer onboarding"], "NGO ships English and French variants from one storyboard.", "NGOs need localization; HomeCheff versions without duplicate projects."],
  ["recruiter", "Recruiter video workflow", "Recruiter workflows", "recruiters", "candidates ignore text-only outreach", "Role-specific videos with hiring manager intro scene.", ["Role promos", "Culture snippets", "Interview prep", "Offer celebrations"], "Recruiter clones storyboard per role; swaps skills list scene.", "Personal video outreach lifts reply rates; HomeCheff scales personalization."],
  ["hr-team", "HR team video workflow", "HR team workflows", "HR teams", "policy and onboarding videos go stale quickly", "Update scene five when policy changes; keep intro sting.", ["Onboarding", "Benefits explainers", "Policy updates", "DEI stories"], "HR refreshes compliance scene without re-recording entire course.", "LMS uploads need frequent edits; scene-based updates are cheaper."],
  ["sales-team", "Sales team video workflow", "Sales team workflows", "sales teams", "decks need demo video that matches vertical", "Vertical templates in Projects with swapped pain-point scene.", ["Outbound intros", "Demo overviews", "Case study summaries", "QBR highlights"], "AE records personalized VO on scene one; body stays corporate approved.", "Sales needs governance plus personalization; storyboards deliver both."],
  ["affiliate-marketer", "Affiliate marketer video workflow", "Affiliate marketer workflows", "affiliate marketers", "testing hooks is the job", "Five hook scenes sharing one body storyboard.", ["Review videos", "Comparison shorts", "Deal alerts", "Listicle videos"], "Affiliate marks winner hook in Project notes; scales spend on that Publish version.", "Affiliates live on hook tests; HomeCheff makes tests cheap."],
  ["course-creator", "Course creator video workflow", "Course creator workflows", "course creators", "modules need visual upgrade beyond slides", "Lesson storyboards with diagram motion and subtitles.", ["Lesson intros", "Concept modules", "Sales page videos", "Student wins"], "Course creator re-renders lesson four when tool UI changes.", "Courses compete on production value; HomeCheff closes gap without crew."],
  ["consultant", "Consultant video workflow", "Consultant workflows", "consultants", "trust videos win retainers", "Framework explainers as scene sequences with branded VO.", ["Thought leadership", "Case studies", "Webinar promos", "Proposal summaries"], "Consultant sends framework video before discovery call.", "Consultants sell expertise; video proof beats PDF alone."],
  ["architect", "Architect video workflow", "Architect workflows", "architects", "clients struggle to read plans", "Render stills animated into walkthrough storyboards.", ["Project reveals", "Concept flythroughs", "Firm culture", "Award submissions"], "Architect updates material palette in scene six for client review.", "Architecture sales are visual; motion beats static boards."],
  ["interior-designer", "Interior designer video workflow", "Interior designer workflows", "interior designers", "Instagram expects video of every project", "Before-after scene pairs with motion transitions.", ["Reveal videos", "Process timelapses stylized", "Vendor partners", "Consultation promos"], "Designer templates room reveal arc per client style in Library.", "Interior design is inherently visual; storyboards sell taste."],
  ["travel-creator", "Travel creator video workflow", "Travel creator workflows", "travel creators", "editing on the road is brutal", "Photo storyboards per destination with batch Motion.", ["Destination guides", "Hotel partners", "Itinerary reels", "Gear sponsors"], "Creator storyboards on flights; renders when hotel WiFi allows.", "Travel creators capture stills easier than video; HomeCheff bridges."],
  ["food-creator", "Food creator video workflow", "Food creator workflows", "food creators", "recipes need watchable steps", "Ingredient scenes with satisfying motion accents.", ["Recipes", "Restaurant reviews", "Sponsor integrations", "Cookbook promos"], "Food creator swaps sponsor product in scene two only.", "Recipe retention needs clear steps; scene structure helps."],
  ["local-business-owner", "Local business owner video workflow", "Local business owner workflows", "local business owners", "no marketing team but customers search video", "Simple service storyboards with storefront scenes.", ["Service promos", "Staff intros", "Seasonal offers", "Review highlights"], "Owner updates hours and offer in final CTA scene monthly.", "Local SEO favors video; HomeCheff makes it maintainable."],
];

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function altCta(slug) {
  const map = {
    luma: "/studio/storyboards/new",
    midjourney: "/editor",
    "final-cut-pro": "/studio/storyboards/new",
    synthesia: "/studio/characters/new",
    heygen: "/studio/characters/new",
  };
  const href = map[slug] ?? "/studio/storyboards/new";
  const label = href.includes("characters") ? "Create a character" : "Start a storyboard";
  return `{ href: "${href}", label: "${label}" }`;
}

function guideRelated(slug, i) {
  const all = GUIDES.map((g) => g[0]);
  const picks = [all[(i + 1) % all.length], all[(i + 3) % all.length]];
  return picks.map((s) => {
    const g = GUIDES.find((x) => x[0] === s);
    return `{ href: "/guides/${s}", label: "${esc(g[2])}" }`;
  }).join(", ");
}

function wfGuides(slug) {
  const map = {
    teacher: ["how-to-make-education-videos", "how-to-create-explainer-videos"],
    restaurant: ["how-to-make-restaurant-videos", "how-to-create-ai-food-videos"],
    "real-estate-agent": ["how-to-make-real-estate-videos"],
    youtuber: ["how-to-make-shorts", "how-to-create-youtube-intros"],
    "tiktok-creator": ["how-to-make-tiktok-videos"],
    musician: ["how-to-create-ai-music-videos"],
  };
  const slugs = map[slug] ?? ["how-to-create-marketing-videos", "how-to-create-explainer-videos"];
  return slugs.map((s) => {
    const g = GUIDES.find((x) => x[0] === s);
    return `{ slug: "${s}", label: "${esc(g[2])}" }`;
  }).join(", ");
}

function altUniqueFields(a) {
  const [slug, competitor, category] = a;
  const cat = category.toLowerCase();
  const productionLine = productionLineFor({
    audience: `teams comparing ${competitor}`,
    goal: `ship repeatable ${cat} campaigns with ${slug} governance`,
    painPoint: `${competitor} workflows on ${slug} often break when campaigns need continuity, subtitles, and multi-format exports.`,
    exampleProject: `${competitor} vs HomeCheff pilot for ${slug} with five scenes and two publish variants`,
    workflowAngle: `${cat} iteration with Library reuse`,
    outputType: `${slug} exports for social, web, and localized subtitles`,
    recommendedStartingPoint: `/studio/storyboards/new for the ${slug} comparison brief`,
    relatedUseCase: `/alternatives/${slug}`,
    conversionReason: `${slug} teams reduce revision cost when storyboard stills are approved before motion spend.`,
    locale: "en",
  });
  return {
    productionLine,
    growthTradeOff: `As ${competitor} adoption grows on ${slug}-style projects, teams hit continuity debt: scene eight no longer matches scene one, subtitle revisions fork across exports, and campaign history disappears in chat threads. ${competitor} can still be excellent for fast ${cat} output, but scale demands a traceable production system.`,
    pipelineHandoff: `For ${slug} migrations, Editor ingests your winning references, Studio enforces sequence and pacing, Motion animates only approved stills, and Publish stamps channel-ready versions with names your team can audit next quarter.`,
    homecheffFitDetail: `Teams evaluating ${competitor} alternatives in ${cat} usually choose HomeCheff when they must run weekly series, keep recurring characters stable, and hand projects between marketers, freelancers, and founders without rewriting every prompt.`,
    migrationPilot: `Pilot ${competitor} against HomeCheff on one scoped job for ${slug}: brief five scenes, lock one voice, export two aspect ratios, then compare revision time and stakeholder approval speed before deciding a full migration.`,
    pricingPhilosophy: `${competitor} often prices around ${cat} primitives, while HomeCheff prices production actions you can forecast before render day. For ${slug} teams, this makes budget conversations concrete: what scene, what motion pass, what publish variant, what business result.`,
    qualityNote: `Quality on ${slug} campaigns improves when one owner approves storyboard stills before motion, another owner reviews subtitles and claims, and Library stores approved brand references so ${competitor}-era assets do not drift during handoff.`,
    iterationInsight: `In ${slug} workflows, the biggest cost is not first render speed but second-iteration friction. HomeCheff lowers that friction by preserving scene intent, version naming, and reusable references between campaign cycles.`,
    featureResolution: `Questions from ${competitor} users in ${cat} usually center on series continuity, approvals, and localization. HomeCheff resolves those by treating scenes, voices, subtitles, and exports as connected objects inside one workspace.`,
    checklistNarrative: `Run this ${slug} switch checklist on a live brief: continuity across five scenes, voice/subtitle workflow, dual-format publish, visible credit planning, and next-month asset retrieval in under sixty seconds.`,
    checklistOutcome: `If your ${competitor} process fails three checklist points for ${slug}, route the next deliverable through HomeCheff end-to-end and compare QA rounds, calendar time, and reusability before standardizing your stack.`,
    hybridWorkflow: `${competitor} can remain in your ${slug} stack for niche ${cat} tasks where it still wins, while HomeCheff becomes the operating layer for brief-to-publish campaigns that require continuity, localization, and repeatability.`,
    hybridDocumentation: `Document the split explicitly for ${slug}: ${competitor} owns narrow creation tasks, HomeCheff owns storyboard governance and publish history. This prevents duplicate subscriptions, orphan files, and onboarding confusion.`,
  };
}

function guideUniqueFields(g) {
  const [slug, , h1, topic, audience] = g;
  const t = topic.toLowerCase();
  const productionLine = productionLineFor({
    audience,
    goal: `publish ${t} with ${slug} repeatability`,
    painPoint: `${audience} lose time on ${slug} when assets and scene intent are not stored between projects.`,
    exampleProject: `${h1} pilot with tracked Publish versions`,
    workflowAngle: `${slug} storyboard governance`,
    outputType: `${t} cuts for feed, web embed, and optional locale variants`,
    recommendedStartingPoint: `/studio/storyboards/new for ${slug}`,
    relatedUseCase: `/guides/${slug}`,
    conversionReason: `${slug} output compounds when Library assets survive beyond the first upload.`,
    locale: "en",
  });
  return {
    productionLine,
    preflightPlanning: `Before opening tools for ${slug}, lock constraints for ${t}: target runtime, channel ratio, and one measurable action viewers should take after watching ${h1}.`,
    preflightReferences: `Collect references your ${audience} already trust on ${slug}: stills, palettes, mandatory copy lines, and proof elements. Strong references reduce rework more than longer prompts.`,
    productionOutcome: `This ${slug} playbook guides ${audience} through ${t} with a production mindset so each release improves the next one instead of resetting to zero.`,
    repeatableMethod: `You finish ${slug} with a reusable method: brief goal, define scene jobs, generate visuals, apply motion selectively, add voice/subtitles, then publish channel-ready cuts tied to one project record.`,
    storyBeatDiscipline: `For ${slug}, write the viewer outcome first. A single sentence keeps ${t} scenes from becoming disconnected eye candy and gives each shot a clear narrative job.`,
    studioBriefing: `Use Studio on ${slug} to map three-to-nine scenes in order: hook, context, proof, and CTA. Scene intent should be explicit before any batch rendering starts.`,
    projectNaming: `Name projects and versions early on ${slug}. ${audience} who enforce naming conventions recover assets faster and iterate without rebuilding briefs from memory.`,
    voiceSubtitleTranslation: `In ${slug} workflows, add voice and subtitles as first-class deliverables. If your ${audience} serves multiple locales, publish translated variants from the same storyboard baseline.`,
    commonMistakeStoryboarding: `Most ${slug} failures come from skipping structure: random prompts, weak subtitles, and no scene ownership. ${t} quality drops when teams chase novelty instead of narrative clarity.`,
    commonMistakeFix: `Fix ${slug} quality by investing ten focused minutes in storyboard review before motion. That preflight check usually saves hours of re-rendering and approval back-and-forth.`,
    seriesScaling: `After your first ${slug} success, template the scene skeleton for ${t}: hook, value, proof, CTA. Reuse that skeleton to ship faster without losing brand consistency.`,
    batchingRhythm: `Scale ${slug} with a weekly rhythm: lock stills, batch only required motion, finalize captions, and publish tracked variants. Consistent cadence beats occasional hero efforts.`,
    budgetBatching: `Budget ${slug} output by listing planned actions upfront: image generations, motion passes, voice lines, translations, and publish variants. This keeps ${audience} spend predictable.`,
    stillPreviewAdvice: `When credits are tight on ${slug}, send a still-storyboard preview for approval before motion. Stills reveal structure issues early at a fraction of full render cost.`,
    qualityPass: `Run two QA passes on ${slug}: one with sound for pacing and one muted for subtitle clarity. ${t} often reaches users in silent autoplay contexts first.`,
    qualityGate: `Final ${slug} gate: confirm brand consistency, scene logic, and claims accuracy before Publish. Fix at the storyboard layer, then rerender only affected segments.`,
    editorSupport: `On ${slug}, Editor cleanup and reference roles keep ${t} visuals on-brand. Save every approved still to Library with names your ${audience} can find next sprint.`,
    studioDirection: `Studio direction for ${slug} means one clear job per scene and voice assignment before Motion. ${audience} who lock pacing early avoid expensive re-render loops.`,
    motionRender: `Motion on ${slug} should follow approved stills only. If a ${t} scene fails, adjust the still or motion notes — not the entire ${slug} project structure.`,
    publishExport: `Publish ${slug} exports with version names tied to channel and experiment ID. ${audience} who track names iterate faster than teams exporting unnamed MP4 files.`,
    libraryStorage: `Library discipline on ${slug}: campaign, episode, and locale in every asset name. ${t} series die when teams cannot find last month's approved references.`,
    promotionTracking: `Promotion for ${slug}: lead with hook frame, subtitle-safe messaging, and one CTA. Duplicate storyboards for variant B instead of rebuilding ${t} from scratch.`,
    keywordMeaning: `For ${audience}, ${t} means planning narrative scenes before rendering — not chasing one viral clip. ${h1} succeeds when ${slug} projects store intent, references, and publish history so week-two iterations reuse Library assets instead of restarting prompts.`,
  };
}

function workflowUniqueFields(w) {
  const [slug, , h1, role] = w;
  const productionLine = productionLineFor({
    audience: role,
    goal: `run the ${slug} workflow weekly with reusable assets`,
    painPoint: `${role} teams on ${slug} stall when every deliverable starts as a blank timeline.`,
    exampleProject: `${h1} flagship storyboard with Library reuse in week two`,
    workflowAngle: `${slug} stakeholder approvals and publish tracking`,
    outputType: `${slug} deliverables across social, web, and sales enablement`,
    recommendedStartingPoint: `/studio/storyboards/new for ${slug}`,
    relatedUseCase: `/workflows/${slug}`,
    conversionReason: `${slug} throughput rises when scene intent, voices, and exports stay in one project record.`,
    locale: "en",
  });
  return {
    productionLine,
    deliverablePlaybook: `${slug} deliverables should open with a hook scene, prove value in scenes two through four, and close with a measurable CTA. ${role} teams template that skeleton per deliverable type and swap only scenes that change week to week.`,
    whyVideoConstraint: `The constraint for ${slug} teams is not proving video value; it is producing reliable output every week without expensive handoffs or fragile one-person workflows.`,
    mondayToFridayCadence: `For ${slug}, a sustainable cadence is Monday briefing, Tuesday storyboard lock, Wednesday motion renders, Thursday voice/subtitle QA, and Friday publish scheduling with reusable assets queued for next cycle.`,
    productionLineFramework: `In ${slug} operations, keep the sequence explicit: Idea, World, Characters, Voices, Scenes, Video, Translation, Publishing. Ownership per stage prevents handoff ambiguity.`,
    productionLineUnification: `Unifying these steps in one workspace helps ${role} avoid exporting across disconnected tools for every incremental request from stakeholders.`,
    collaborationReuse: `For ${slug}, organize Projects by campaign or client and treat Library assets as shared infrastructure. Reuse is where throughput improves month over month.`,
    changeManagement: `When changes arrive on ${slug} deliverables, edit the specific storyboard scene and rerender only impacted segments instead of rebuilding full timelines.`,
    measurementDiscipline: `Track ${slug} outcomes with named publish variants, experiment tags, and post-campaign credit reviews so performance and cost can be compared honestly.`,
    toolingMindset: `Tooling choices on ${slug} should prioritize iteration speed for recurring deliverables, not novelty from single-use AI clips.`,
    comparisonBrowseHint: `Use linked comparisons from this ${slug} hub to evaluate where point tools still fit and where consolidated production flow reduces risk.`,
    stakeholderReviewFlow: `A strong ${slug} review flow shares storyboard stills before motion spend so stakeholders can align early on messaging and structure.`,
    hybridStackGuidance: `Hybrid stacks are normal on ${slug}: keep legacy tools for niche strengths, but centralize storyboard governance and publish history where repeatability matters.`,
    adoptionPlan: `Adoption on ${slug} works best in phases: month one ships one complete project, month two reuses assets for variants, month three templates process for teammate handoff.`,
    adoptionConfidence: `By day ninety on ${slug}, teams should know per-deliverable credit patterns, QA bottlenecks, and which stack boundaries still make economic sense.`,
    deliverableMomentum: `For ${slug} teams, momentum beats perfection: ship one storyboarded deliverable this week, then improve naming, reuse, and governance in subsequent cycles.`,
    governanceApprovals: `Governance on ${slug} should assign one approver for storyboard stills and one approver for final Publish to keep quality gates clear.`,
    complianceHistory: `Maintain scene-level compliance notes on ${slug} projects so future audits can trace what changed, why it changed, and when it shipped.`,
    legacyBoundary: `Retain legacy tools on ${slug} only where they provide clear value for specialized finishing tasks that HomeCheff is not meant to replace.`,
    toolingReevaluation: `Reevaluate the ${slug} stack quarterly against output speed, revision cost, and reuse quality rather than vendor familiarity.`,
    supportPath: `Learning path for ${slug}: complete one linked guide, ship one five-scene project, then revisit alternatives pages to decide which legacy tools to keep.`,
    libraryReuseRule: `Set a reuse rule for ${slug}: each new project should inherit at least three approved assets from Library, or naming/governance needs correction before scale.`,
    introPipeline: `This ${slug} workflow is tailored for ${role} shipping repeatable video through HomeCheff from first brief to publish. It maps linked guides, comparison paths, and a practical ninety-day rollout for ${h1}.`,
    channelExpansion: `${role} teams on ${slug} should plan channel exports during storyboarding — vertical hooks for TikTok, subtitle-safe framing for Reels, widescreen for YouTube, and embed-friendly cuts for email. Naming Publish variants per channel keeps ${slug} experiments auditable.`,
    scalingPlaybook: `Scale ${slug} by templating deliverable skeletons: hook, value, proof, CTA. ${role} who reuse Library intros, characters, and approved references on week two cut credit cost and approval time. Review /pricing after each batch to tune ${slug} throughput.`,
    roleDeepDive: `Sustaining ${slug} long term means ${role} treat storyboards as living documents, not one-time exports. Document scene intent in project notes, assign one approver for stills and one for final Publish, and review credit patterns on /pricing after each ${h1} cycle. When a deliverable underperforms, duplicate the storyboard, swap only the hook scene, and compare Publish version names — that discipline keeps ${role} iteration fast without rebuilding entire timelines from scratch.`,
  };
}

const altFile = `import type { AlternativeWave2Config } from "@/lib/seo/seo-content-wave2-builder";

export const ALTERNATIVES_WAVE2_CONFIG: AlternativeWave2Config[] = [
${ALTERNATIVES.map((a) => {
  const extra = altUniqueFields(a);
  return `  {
    slug: "${a[0]}",
    competitor: "${esc(a[1])}",
    category: "${esc(a[2])}",
    competitorStrength: "${esc(a[3])}",
    homecheffStrength: "${esc(a[4])}",
    idealCompetitorUser: "${esc(a[5])}",
    idealHomecheffUser: "${esc(a[6])}",
    migrationTip: "${esc(a[7])}",
    workflowScenario: "${esc(a[8])}",
    featureDeepDive: "${esc(a[9])}",
    growthTradeOff: "${esc(extra.growthTradeOff)}",
    pipelineHandoff: "${esc(extra.pipelineHandoff)}",
    homecheffFitDetail: "${esc(extra.homecheffFitDetail)}",
    migrationPilot: "${esc(extra.migrationPilot)}",
    pricingPhilosophy: "${esc(extra.pricingPhilosophy)}",
    qualityNote: "${esc(extra.qualityNote)}",
    iterationInsight: "${esc(extra.iterationInsight)}",
    featureResolution: "${esc(extra.featureResolution)}",
    checklistNarrative: "${esc(extra.checklistNarrative)}",
    checklistOutcome: "${esc(extra.checklistOutcome)}",
    hybridWorkflow: "${esc(extra.hybridWorkflow)}",
    hybridDocumentation: "${esc(extra.hybridDocumentation)}",
    ${productionLineBlock(extra.productionLine)},
    studioCta: ${altCta(a[0])},
    relatedGuides: [
      { href: "/guides/how-to-create-marketing-videos", label: "Marketing videos guide" },
      { href: "/guides/how-to-create-explainer-videos", label: "Explainer videos guide" },
    ],
  },`;
}).join("\n")}
];
`;

const guideFile = `import type { GuideWave2Config } from "@/lib/seo/seo-content-wave2-builder";

export const GUIDES_WAVE2_CONFIG: GuideWave2Config[] = [
${GUIDES.map((g, i) => {
  const extra = guideUniqueFields(g);
  return `  {
    slug: "${g[0]}",
    title: "${esc(g[1])}",
    h1: "${esc(g[2])}",
    eyebrow: "Guide",
    topic: "${esc(g[3])}",
    audience: "${esc(g[4])}",
    outcome: "You will deliver ${esc(g[5])}",
    studioPath: "${esc(g[6])}",
    editorStep: "${esc(g[7])}",
    studioStep: "${esc(g[8])}",
    motionStep: "${esc(g[9])}",
    publishStep: "${esc(g[10])}",
    gearAndAssets: "For ${esc(g[3].toLowerCase())}, gather references before generation: brand colors, subject photos, and any mandatory legal lines. ${esc(g[7].slice(0, 120))}… Quality inputs reduce revision loops in Studio.",
    promotionTips: "Share ${esc(g[3].toLowerCase())} where your ${esc(g[4])} already engage — email, social, or embed on site. Lead with the hook frame; add subtitles for silent autoplay; link to /pricing only when budget holders see the post.",
    preflightPlanning: "${esc(extra.preflightPlanning)}",
    preflightReferences: "${esc(extra.preflightReferences)}",
    productionOutcome: "${esc(extra.productionOutcome)}",
    repeatableMethod: "${esc(extra.repeatableMethod)}",
    storyBeatDiscipline: "${esc(extra.storyBeatDiscipline)}",
    studioBriefing: "${esc(extra.studioBriefing)}",
    projectNaming: "${esc(extra.projectNaming)}",
    voiceSubtitleTranslation: "${esc(extra.voiceSubtitleTranslation)}",
    commonMistakeStoryboarding: "${esc(extra.commonMistakeStoryboarding)}",
    commonMistakeFix: "${esc(extra.commonMistakeFix)}",
    seriesScaling: "${esc(extra.seriesScaling)}",
    batchingRhythm: "${esc(extra.batchingRhythm)}",
    budgetBatching: "${esc(extra.budgetBatching)}",
    stillPreviewAdvice: "${esc(extra.stillPreviewAdvice)}",
    qualityPass: "${esc(extra.qualityPass)}",
    qualityGate: "${esc(extra.qualityGate)}",
    editorSupport: "${esc(extra.editorSupport)}",
    studioDirection: "${esc(extra.studioDirection)}",
    motionRender: "${esc(extra.motionRender)}",
    publishExport: "${esc(extra.publishExport)}",
    libraryStorage: "${esc(extra.libraryStorage)}",
    promotionTracking: "${esc(extra.promotionTracking)}",
    keywordMeaning: "${esc(extra.keywordMeaning)}",
    ${productionLineBlock(extra.productionLine)},
    studioCta: { href: "/studio/storyboards/new", label: "Start your storyboard" },
    relatedGuides: [${guideRelated(g[0], i)}],
  },`;
}).join("\n")}
];
`;

const wfFile = `import type { WorkflowWave2Config } from "@/lib/seo/seo-content-wave2-builder";

export const WORKFLOWS_WAVE2_CONFIG: WorkflowWave2Config[] = [
${WORKFLOWS.map((w) => {
  const extra = workflowUniqueFields(w);
  return `  {
    slug: "${w[0]}",
    title: "${esc(w[1])}",
    h1: "${esc(w[2])}",
    role: "${esc(w[3])}",
    painPoint: "${esc(w[4])}",
    studioValue: "${esc(w[5])}",
    typicalDeliverables: [${w[6].map((d) => `"${esc(d)}"`).join(", ")}],
    clientScenario: "${esc(w[7])}",
    toolingComparison: "${esc(w[8])}",
    introPipeline: "${esc(extra.introPipeline)}",
    whyVideoConstraint: "${esc(extra.whyVideoConstraint)}",
    mondayToFridayCadence: "${esc(extra.mondayToFridayCadence)}",
    productionLineFramework: "${esc(extra.productionLineFramework)}",
    productionLineUnification: "${esc(extra.productionLineUnification)}",
    collaborationReuse: "${esc(extra.collaborationReuse)}",
    changeManagement: "${esc(extra.changeManagement)}",
    measurementDiscipline: "${esc(extra.measurementDiscipline)}",
    toolingMindset: "${esc(extra.toolingMindset)}",
    comparisonBrowseHint: "${esc(extra.comparisonBrowseHint)}",
    stakeholderReviewFlow: "${esc(extra.stakeholderReviewFlow)}",
    hybridStackGuidance: "${esc(extra.hybridStackGuidance)}",
    adoptionPlan: "${esc(extra.adoptionPlan)}",
    adoptionConfidence: "${esc(extra.adoptionConfidence)}",
    deliverableMomentum: "${esc(extra.deliverableMomentum)}",
    governanceApprovals: "${esc(extra.governanceApprovals)}",
    complianceHistory: "${esc(extra.complianceHistory)}",
    legacyBoundary: "${esc(extra.legacyBoundary)}",
    toolingReevaluation: "${esc(extra.toolingReevaluation)}",
    supportPath: "${esc(extra.supportPath)}",
    libraryReuseRule: "${esc(extra.libraryReuseRule)}",
    deliverablePlaybook: "${esc(extra.deliverablePlaybook)}",
    channelExpansion: "${esc(extra.channelExpansion)}",
    scalingPlaybook: "${esc(extra.scalingPlaybook)}",
    roleDeepDive: "${esc(extra.roleDeepDive)}",
    ${productionLineBlock(extra.productionLine)},
    studioCta: { href: "/studio/storyboards/new", label: "Open Studio" },
    linkedGuideSlugs: [${wfGuides(w[0])}],
    linkedAlternativeSlugs: [
      { slug: "canva", label: "Canva alternative" },
      { slug: "capcut", label: "CapCut alternative" },
    ],
    productLinks: [
      { href: "/studio", label: "Studio" },
      { href: "/editor", label: "Editor" },
      { href: "/pricing", label: "Pricing" },
    ],
  },`;
}).join("\n")}
];
`;

writeFileSync(join(ROOT, "src/lib/seo/alternatives-wave2-config.ts"), altFile);
writeFileSync(join(ROOT, "src/lib/seo/guides-wave2-config.ts"), guideFile);
writeFileSync(join(ROOT, "src/lib/seo/workflows-wave2-config.ts"), wfFile);
console.log("Generated wave2 configs:", ALTERNATIVES.length, GUIDES.length, WORKFLOWS.length);

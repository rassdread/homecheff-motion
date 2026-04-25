import type { nl } from "./nl";

type LocaleSchema = Record<keyof typeof nl, string>;

export const en: LocaleSchema = {
  "nav.create": "Create",
  "nav.login": "Log in",
  "nav.signup": "Create account",

  "landing.headline": "Turn photos into flowing AI animations",
  "landing.subtext":
    "Upload images and create smooth animated transitions in the HomeCheff style (limits per tier).",
  "landing.cta": "Create animation",
  "landing.mascotPlaceholder": "HomeCheff mascot/logo placeholder area",

  "animate.title": "Build your animation sequence",
  "animate.subtitle":
    "Choose a quality tier, upload photos in order, and generate HomeCheff-style transitions.",
  "animate.preset.title": "Quality tier",
  "animate.preset.hint": "Settings are enforced on the server—you only pick the tier.",
  "animate.preset.basic.title": "Basic",
  "animate.preset.basic.description": "Low-cost test",
  "animate.preset.standard.title": "Standard",
  "animate.preset.standard.description": "Best balance",
  "animate.preset.pro.title": "Pro",
  "animate.preset.pro.description": "Higher quality",
  "animate.preset.field.resolution": "Resolution: {value}",
  "animate.preset.field.duration": "Duration per transition: {seconds} s",
  "animate.preset.field.maxImages": "Max images: {max}",
  "animate.preset.field.maxTransitions": "Max transitions: {max}",
  "animate.preset.field.estimatedCredits": "Estimated credits (this project): {credits}",
  "animate.preset.field.estimatedUsd": "Estimated cost in USD (indicative): {usd}",
  "animate.preset.field.ceilingCredits": "Project ceiling (indicative): {credits} credits",
  "animate.preset.field.ceilingUsd": "Ceiling in USD (indicative): {usd}",
  "animate.preset.estimateNote": "Estimates are indicative only; billing is not enabled yet.",
  "animate.upload.label": "Upload images",
  "animate.upload.help": "Supported types: images only. Maximum {max}.",
  "animate.upload.minWarning": "Add at least {min} images to continue.",
  "animate.selected.title": "Selected images ({count})",
  "animate.selected.empty": "No images selected yet.",
  "animate.selected.alt": "Selected image {index}",
  "animate.selected.remove": "Remove",
  "animate.transitions.orderedTitle": "Ordered transition pairs",
  "animate.transitions.orderedEmpty":
    "Transition pairs appear after selecting at least two images.",
  "animate.status.title": "Project status",
  "animate.transitions.progressTitle": "Transition progress list",
  "animate.transitions.progressEmpty":
    "Transition progress appears after you start generation.",
  "animate.export.title": "Export progress",
  "animate.overallProgress": "Overall progress (average across transitions)",
  "animate.transitionVideo": "Transition video preview",
  "animate.transitionError": "Error",
  "animate.retryJobsStart": "Retry starting jobs",
  "animate.retryPoll": "Reconnect and refresh status",
  "animate.rendering.mergePending": "Merging your clips into one video…",
  "animate.export.merging": "Merging transition clips",
  "animate.export.finalVideo": "Final video",
  "animate.export.retryMerge": "Retry export",
  "animate.export.retryPoll": "Retry export status refresh",
  "animate.completed.title": "Animation completed",
  "animate.completed.placeholder": "Final MP4 preview placeholder",
  "animate.button.create": "Create animation",
  "animate.button.startOver": "Start over",
  "animate.button.openSavedProject": "Open saved project",
  "animate.auth.loading": "Checking session...",
  "animate.auth.requiredTitle": "Log in to create videos",
  "animate.auth.requiredDescription":
    "Because AI generation has real costs, this feature is only available with an account.",
  "animate.auth.loginCta": "Log in",
  "animate.auth.signupCta": "Create account",
  "animate.usage.dailyRemainingVideos":
    "Remaining today: {remaining} of {limit} videos",
  "animate.usage.dailyRemainingCredits":
    "Remaining today: {remaining} of {limit} estimated credits",
  "animate.usage.nearLimit": "You are close to your daily limit.",
  "animate.usage.blocked": "Your limit is reached; starting animation is temporarily blocked.",
  "animate.usage.unavailable": "Usage information is temporarily unavailable.",

  "auth.login.title": "Log in",
  "auth.login.subtitle": "Log in to continue creating animations.",
  "auth.login.cta": "Log in",
  "auth.login.link": "Log in",
  "auth.login.noAccount": "No account yet?",
  "auth.signup.title": "Create account",
  "auth.signup.subtitle": "Create an account to generate animations safely.",
  "auth.signup.cta": "Create account",
  "auth.signup.link": "Create account",
  "auth.signup.hasAccount": "Already have an account?",
  "auth.form.email": "Email",
  "auth.form.password": "Password",
  "auth.form.genericError": "Login or signup failed. Please try again.",
  "auth.form.errorInvalidCredentials": "Invalid email or password.",
  "auth.form.errorEmailInUse": "This email is already registered.",
  "auth.form.errorInvalidInput": "Check your email and password (min. 8 characters when signing up).",
  "auth.form.errorNetwork": "Network error. Check your connection and try again.",
  "auth.form.submittingLogin": "Signing in…",
  "auth.form.submittingSignup": "Creating account…",

  "projectDetail.title": "Saved animation project",
  "projectDetail.meta.createdAt": "Created at",
  "projectDetail.images.title": "Images in order",
  "projectDetail.images.empty": "No images saved for this project yet.",
  "projectDetail.transitions.title": "Transition pairs in order",
  "projectDetail.transitions.empty":
    "No transitions saved for this project yet.",
  "projectDetail.export.title": "Export status",
  "projectDetail.export.empty": "No export record available yet.",
  "projectDetail.back": "Back to create",
  "projectDetail.liveUpdating": "Live updating...",
  "projectDetail.refreshError":
    "Could not refresh latest status. Showing last known state.",

  "status.idle": "idle",
  "status.queued": "queued",
  "status.generating": "generating",
  "status.rendering": "rendering",
  "status.completed": "completed",
  "status.failed": "failed",

  "button.loading": "Generating...",

  "errors.presetInvalid": "Invalid quality tier. Choose basic, standard, or pro.",
  "errors.presetMaxImages":
    "This tier allows at most {max} images. Remove some or pick a higher tier.",
  "errors.presetMaxTransitions":
    "This tier does not allow enough transitions for your photo count (max {max} transitions).",
  "errors.presetReduceImages":
    "You have more images than this tier allows (max {max}). Remove some or pick a higher tier.",
  "errors.maxImages": "You can upload up to {max} images total.",
  "errors.imageRange": "Please upload between {min} and {max} images.",
  "errors.createProjectFailed": "Failed to save project. Please try again.",
  "errors.fileTooLarge":
    "One or more files are larger than {maxMb}MB and were skipped.",
  "errors.invalidImageType":
    "One or more files were not valid images and were skipped.",
  "errors.imageProcessFailed":
    "Could not optimize one or more images. Please try different files.",
  "errors.optimizedTooLarge":
    "One or more optimized images exceed 2MB and were skipped.",
  "errors.uploadFailed":
    "Could not upload optimized images. Please try again.",
  "errors.jobsStartFailed":
    "Could not start animation jobs on the server. Retry or start over.",
  "errors.pollFailed":
    "Could not refresh status after several attempts. Check your connection and retry.",
  "errors.exportStartFailed":
    "Could not start export on the server. Check your connection or try again.",
  "errors.exportPollFailed":
    "Could not refresh export status after several attempts. Try again.",
  "errors.authRequired": "Log in to start an animation.",
  "errors.usage.dailyLimit": "Daily limit reached: you cannot create more videos today.",
  "errors.usage.monthlyLimit":
    "Monthly limit reached: you cannot create more videos this month.",
  "errors.usage.creditLimit":
    "Estimated credit limit reached. Try again tomorrow or choose a lighter preset.",
  "errors.usage.presetLimit":
    "You reached the daily limit for this preset. Pick another preset or try tomorrow.",
};

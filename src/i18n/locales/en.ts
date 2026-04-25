import type { nl } from "./nl";

type LocaleSchema = Record<keyof typeof nl, string>;

export const en: LocaleSchema = {
  "nav.create": "Create",

  "landing.headline": "Turn photos into flowing AI animations",
  "landing.subtext":
    "Upload 2-7 images and create smooth animated transitions in the HomeCheff style.",
  "landing.cta": "Create animation",
  "landing.mascotPlaceholder": "HomeCheff mascot/logo placeholder area",

  "animate.title": "Build your animation sequence",
  "animate.subtitle":
    "Upload 2 to 7 photos, arrange them in order, and generate HomeCheff-style transitions.",
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
  "animate.completed.title": "Animation completed",
  "animate.completed.placeholder": "Final MP4 preview placeholder",
  "animate.button.create": "Create animation",
  "animate.button.startOver": "Start over",
  "animate.button.openSavedProject": "Open saved project",

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

  "errors.maxImages": "You can upload up to {max} images total.",
  "errors.imageRange": "Please upload between {min} and {max} images.",
  "errors.createProjectFailed": "Failed to save project. Please try again.",
  "errors.fileTooLarge":
    "One or more files are larger than {maxMb}MB and were skipped.",
  "errors.invalidImageType":
    "One or more files were not valid images and were skipped.",
  "errors.imageProcessFailed":
    "Could not optimize one or more images. Please try different files.",
};

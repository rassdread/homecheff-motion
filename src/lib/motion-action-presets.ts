import type {
  MotionActionPreset,
  MotionActionPresetId,
  MotionActionPresetMetadata,
} from "@/types/motion-action-presets";
import {
  EXPANDED_MOTION_ACTION_PRESETS,
  EXPANDED_PRESET_KEYWORD_RULES,
} from "@/lib/motion-action-presets-expanded";

const PRESETS: MotionActionPreset[] = [
  {
    id: "goal_celebration",
    category: "sports",
    title: "Doelpunt vieren",
    shortDescription: "Vier een doelpunt in een voetbalstadion",
    userFacingDescription:
      "Een korte sportvideo waarin jij een doelpunt viert in een stadion — rennen, juichen, publiek op de achtergrond.",
    difficulty: "easy",
    reliability: "high",
    recommendedDurationSeconds: 8,
    motionMode: "celebration",
    requiredInputs: ["person"],
    optionalInputs: ["football_outfit", "stadium_background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: true,
      feetVisiblePreferred: true,
      outfitRecommended: ["football shirt", "sports shoes"],
    },
    motionSettings: {
      cameraMotion: "tracking",
      energy: "high",
      movement: "running celebration, fist in the air",
      pacing: "fast",
      shotType: "sports broadcast cinematic",
    },
    sceneSettings: {
      environment: "football stadium",
      backgroundPrompt: "large football stadium, cheering crowd, bright stadium lights",
      atmosphere: "victory celebration",
      lighting: "bright stadium floodlights",
    },
    styleSettings: {
      visualStyle: "cinematic sports",
      realismLevel: "realistic",
      cinematicLevel: "high",
    },
    audioSuggestions: {
      musicMood: "triumphant",
      genre: "stadium anthem",
      voiceSuggestion: "crowd roar",
    },
    sfxSuggestions: ["crowd cheer", "stadium ambience", "whistle"],
    promptTemplate:
      "The main character celebrates after scoring a goal in a football stadium. The character runs forward with energetic body language, raises fist into the air, crowd cheering in the background, cinematic sports broadcast style, realistic motion.",
    negativePrompt:
      "Do not show distorted limbs, extra legs, broken feet, unrealistic ball contact, duplicate faces, or identity drift.",
    feasibilityNote:
      "Betrouwbaar voor doelpunt vieren. Exact balcontact of perfecte trapbeweging is minder betrouwbaar.",
  },
  {
    id: "stadium_entrance",
    category: "sports",
    title: "Stadionopkomst",
    shortDescription: "Loop het stadion binnen met zelfvertrouwen",
    userFacingDescription:
      "Een filmische entree: jij loopt door de tunnel het stadion in, publiek en lichten op de achtergrond.",
    difficulty: "easy",
    reliability: "high",
    recommendedDurationSeconds: 8,
    motionMode: "entrance",
    requiredInputs: ["person"],
    optionalInputs: ["outfit", "stadium_background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: false,
      feetVisiblePreferred: true,
      outfitRecommended: ["sports kit", "team jacket"],
    },
    motionSettings: {
      cameraMotion: "slow tracking",
      energy: "medium-high",
      movement: "confident walk through stadium tunnel",
      pacing: "steady",
      shotType: "cinematic entrance",
    },
    sceneSettings: {
      environment: "stadium tunnel entrance",
      backgroundPrompt: "stadium tunnel, crowd lights ahead, smoke haze, epic entrance",
      atmosphere: "anticipation and pride",
      lighting: "dramatic tunnel lighting",
    },
    styleSettings: {
      visualStyle: "cinematic sports",
      realismLevel: "realistic",
      cinematicLevel: "high",
    },
    audioSuggestions: {
      musicMood: "epic build-up",
      genre: "orchestral sports",
    },
    sfxSuggestions: ["crowd roar distant", "tunnel echo", "stadium ambience"],
    promptTemplate:
      "The main character walks confidently through a stadium tunnel toward the pitch, crowd lights visible ahead, cinematic slow tracking shot, proud body language, realistic motion.",
    negativePrompt:
      "No distorted anatomy, duplicate faces, broken legs, or identity drift.",
    feasibilityNote: "Betrouwbare entree-scène. Complexe interactie met teamgenoten kan wisselen.",
  },
  {
    id: "championship_celebration",
    category: "sports",
    title: "Kampioen vieren",
    shortDescription: "Trofee omhoog, confetti en juichen",
    userFacingDescription:
      "Vier het kampioenschap met trofee omhoog, confetti en juichend publiek.",
    difficulty: "medium",
    reliability: "medium",
    recommendedDurationSeconds: 8,
    motionMode: "celebration",
    requiredInputs: ["person"],
    optionalInputs: ["trophy", "outfit"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: true,
      feetVisiblePreferred: false,
      outfitRecommended: ["team kit", "medal ceremony outfit"],
    },
    motionSettings: {
      cameraMotion: "orbit",
      energy: "high",
      movement: "raising trophy overhead, celebrating",
      pacing: "fast",
      shotType: "championship moment",
    },
    sceneSettings: {
      environment: "championship podium",
      backgroundPrompt: "stadium podium, confetti falling, cheering crowd, golden lights",
      atmosphere: "championship victory",
      lighting: "golden celebratory",
    },
    styleSettings: {
      visualStyle: "cinematic sports",
      realismLevel: "realistic",
      cinematicLevel: "high",
    },
    audioSuggestions: {
      musicMood: "triumphant",
      genre: "victory anthem",
    },
    sfxSuggestions: ["confetti burst", "crowd cheer", "fireworks distant"],
    promptTemplate:
      "The main character celebrates winning a championship, raising a trophy overhead with both hands, confetti falling, crowd cheering, cinematic victory moment, realistic motion.",
    negativePrompt:
      "No broken hands holding trophy, extra fingers, distorted trophy, duplicate faces.",
    feasibilityNote:
      "Trofee en confetti werken goed. Exacte prop-grip kan soms wisselen — focus op het vieringsmoment.",
  },
  {
    id: "basketball_dunk_celebration",
    category: "sports",
    title: "Dunk vieren",
    shortDescription: "Basketbal dunk of viering na score",
    userFacingDescription:
      "Een basketbalmoment: dunk viering of energiek score-moment op het parket.",
    difficulty: "medium",
    reliability: "medium",
    recommendedDurationSeconds: 8,
    motionMode: "sport",
    requiredInputs: ["person"],
    optionalInputs: ["outfit", "background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: true,
      feetVisiblePreferred: true,
      outfitRecommended: ["basketball jersey", "sneakers"],
    },
    motionSettings: {
      cameraMotion: "low angle tracking",
      energy: "high",
      movement: "dunk celebration or powerful jump moment",
      pacing: "fast",
      shotType: "sports arena",
    },
    sceneSettings: {
      environment: "basketball arena",
      backgroundPrompt: "indoor basketball court, crowd, arena lights, hardwood floor",
      atmosphere: "high energy game moment",
      lighting: "arena spotlights",
    },
    styleSettings: {
      visualStyle: "cinematic sports",
      realismLevel: "realistic",
      cinematicLevel: "medium-high",
    },
    audioSuggestions: {
      musicMood: "energetic",
      genre: "hip-hop sports",
    },
    sfxSuggestions: ["crowd roar", "sneaker squeak", "basketball bounce"],
    promptTemplate:
      "The main character celebrates a basketball dunk or scoring moment on an indoor court, energetic body language, crowd in background, cinematic sports style, realistic athletic motion.",
    negativePrompt:
      "No impossible hang time, broken limbs, unrealistic ball physics, duplicate faces.",
    feasibilityNote:
      "Dunk-viering is betrouwbaarder dan perfect dunk-contact met de ring. Focus op het moment na de score.",
  },
  {
    id: "snowboard_jump",
    category: "sports",
    title: "Snowboard sprong",
    shortDescription: "Snowboard door de sneeuw met een sprong",
    userFacingDescription:
      "Rijd op een snowboard door besneeuwd terrein met een kleine sprong of trick.",
    difficulty: "medium",
    reliability: "medium",
    recommendedDurationSeconds: 8,
    motionMode: "sport",
    requiredInputs: ["person"],
    optionalInputs: ["snowboard", "outfit"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: false,
      feetVisiblePreferred: true,
      outfitRecommended: ["snowboard gear", "winter jacket"],
    },
    motionSettings: {
      cameraMotion: "tracking follow",
      energy: "high",
      movement: "snowboard ride with small jump",
      pacing: "fast",
      shotType: "action sports",
    },
    sceneSettings: {
      environment: "snowy mountain slope",
      backgroundPrompt: "snowy mountain slope, blue sky, powder snow, winter landscape",
      atmosphere: "winter adventure",
      lighting: "bright winter daylight",
    },
    styleSettings: {
      visualStyle: "action sports",
      realismLevel: "realistic",
      cinematicLevel: "medium",
    },
    audioSuggestions: {
      musicMood: "adrenaline",
      genre: "electronic sports",
    },
    sfxSuggestions: ["wind rush", "snow crunch", "board slide"],
    promptTemplate:
      "The main character rides a snowboard down a snowy slope and performs a small jump, powder snow spraying, cinematic action sports style, realistic winter motion.",
    negativePrompt:
      "No broken board attachment, impossible physics, distorted limbs, identity drift.",
    feasibilityNote:
      "Eenvoudige sprong door sneeuw werkt goed. Complexe tricks (backflip, grab) zijn experimenteel.",
  },
  {
    id: "skateboard_trick",
    category: "sports",
    title: "Skate trick",
    shortDescription: "Skateboard rijden of simpele trick",
    userFacingDescription:
      "Rijd op een skateboard of doe een simpele trick in een urban setting.",
    difficulty: "medium",
    reliability: "medium",
    recommendedDurationSeconds: 8,
    motionMode: "sport",
    requiredInputs: ["person"],
    optionalInputs: ["skateboard", "outfit"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: false,
      feetVisiblePreferred: true,
      outfitRecommended: ["streetwear", "sneakers"],
    },
    motionSettings: {
      cameraMotion: "low tracking",
      energy: "medium-high",
      movement: "skateboard ride or simple ollie",
      pacing: "medium-fast",
      shotType: "urban action",
    },
    sceneSettings: {
      environment: "urban skate spot",
      backgroundPrompt: "urban skate park or street, graffiti walls, afternoon light",
      atmosphere: "street culture",
      lighting: "natural urban daylight",
    },
    styleSettings: {
      visualStyle: "urban action",
      realismLevel: "realistic",
      cinematicLevel: "medium",
    },
    audioSuggestions: {
      musicMood: "cool energetic",
      genre: "hip-hop",
    },
    sfxSuggestions: ["wheels rolling", "board pop", "urban ambience"],
    promptTemplate:
      "The main character rides a skateboard in an urban setting, performing a simple trick or smooth ride, cinematic street style, realistic skate motion.",
    negativePrompt:
      "No floating board, broken feet, impossible kickflip physics, duplicate faces.",
    feasibilityNote:
      "Rijden en simpele bewegingen zijn betrouwbaar. Exacte kickflip of flip-tricks zijn experimenteel.",
  },
  {
    id: "cycling_finish",
    category: "sports",
    title: "Wielren finish",
    shortDescription: "Finishlijn passeren met armen omhoog",
    userFacingDescription:
      "Cross de finishlijn op de fiets met armen omhoog in overwinning.",
    difficulty: "easy",
    reliability: "high",
    recommendedDurationSeconds: 8,
    motionMode: "celebration",
    requiredInputs: ["person"],
    optionalInputs: ["outfit", "background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: true,
      feetVisiblePreferred: false,
      outfitRecommended: ["cycling jersey", "helmet"],
    },
    motionSettings: {
      cameraMotion: "side tracking",
      energy: "high",
      movement: "crossing finish line, arms raised in victory",
      pacing: "fast",
      shotType: "sports finish line",
    },
    sceneSettings: {
      environment: "cycling race finish",
      backgroundPrompt: "cycling race finish line, crowd barriers, cheering spectators",
      atmosphere: "race victory",
      lighting: "outdoor race daylight",
    },
    styleSettings: {
      visualStyle: "cinematic sports",
      realismLevel: "realistic",
      cinematicLevel: "medium-high",
    },
    audioSuggestions: {
      musicMood: "triumphant",
      genre: "epic sports",
    },
    sfxSuggestions: ["crowd cheer", "bike chain", "finish bell"],
    promptTemplate:
      "The main character crosses a cycling race finish line with arms raised in victory, crowd cheering, cinematic sports broadcast style, realistic motion.",
    negativePrompt:
      "No broken bicycle wheels, distorted limbs, unrealistic pedaling, duplicate faces.",
    feasibilityNote: "Finishlijn en armen omhoog zijn betrouwbaar. Exacte fietsfysica kan wisselen.",
  },
  {
    id: "moonwalk",
    category: "dance",
    title: "Moonwalk",
    shortDescription: "Smooth moonwalk dans op het podium",
    userFacingDescription:
      "Doe een moonwalk met podiumverlichting — smooth, iconisch dansmoment.",
    difficulty: "medium",
    reliability: "medium",
    recommendedDurationSeconds: 8,
    motionMode: "dance",
    requiredInputs: ["person"],
    optionalInputs: ["outfit", "background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: false,
      feetVisiblePreferred: true,
      outfitRecommended: ["stage outfit", "dance shoes"],
    },
    motionSettings: {
      cameraMotion: "static with subtle push",
      energy: "medium",
      movement: "smooth moonwalk dance step",
      pacing: "smooth",
      shotType: "stage performance",
    },
    sceneSettings: {
      environment: "stage with spotlights",
      backgroundPrompt: "dark stage, colored spotlights, subtle smoke, performance atmosphere",
      atmosphere: "iconic dance moment",
      lighting: "stage spotlights",
    },
    styleSettings: {
      visualStyle: "performance cinematic",
      realismLevel: "realistic",
      cinematicLevel: "high",
    },
    audioSuggestions: {
      musicMood: "groovy",
      genre: "pop funk",
    },
    sfxSuggestions: ["stage ambience", "crowd murmur"],
    promptTemplate:
      "The main character performs a smooth moonwalk dance on a lit stage, iconic dance move, stage spotlights, cinematic performance style, fluid realistic motion.",
    negativePrompt:
      "No sliding feet glitch, broken leg angles, identity drift, duplicate faces.",
    feasibilityNote:
      "Moonwalk-sfeer werkt goed. Perfecte voetwerk-details kunnen per generatie wisselen.",
  },
  {
    id: "stage_performance",
    category: "dance",
    title: "Podium optreden",
    shortDescription: "Optreden op podium met microfoon",
    userFacingDescription:
      "Sta op het podium met microfoon, publiek op de achtergrond — performance-moment.",
    difficulty: "easy",
    reliability: "high",
    recommendedDurationSeconds: 8,
    motionMode: "dance",
    requiredInputs: ["person"],
    optionalInputs: ["microphone", "outfit"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: false,
      handsVisiblePreferred: true,
      feetVisiblePreferred: false,
      outfitRecommended: ["stage outfit", "performance wear"],
    },
    motionSettings: {
      cameraMotion: "slow push-in",
      energy: "medium-high",
      movement: "performing on stage with microphone",
      pacing: "steady",
      shotType: "concert performance",
    },
    sceneSettings: {
      environment: "concert stage",
      backgroundPrompt: "concert stage, audience lights, microphone stand, performance lights",
      atmosphere: "live performance energy",
      lighting: "concert stage lights",
    },
    styleSettings: {
      visualStyle: "concert cinematic",
      realismLevel: "realistic",
      cinematicLevel: "high",
    },
    audioSuggestions: {
      musicMood: "energetic performance",
      genre: "pop concert",
      voiceSuggestion: "singing or speaking",
    },
    sfxSuggestions: ["crowd cheer", "stage reverb", "mic feedback subtle"],
    promptTemplate:
      "The main character performs on a concert stage holding a microphone, engaging with the audience, stage lights, cinematic performance shot, realistic motion.",
    negativePrompt:
      "No broken microphone grip, distorted hands, duplicate faces, identity drift.",
    feasibilityNote: "Podiumoptreden met microfoon is betrouwbaar. Complexe danschoreografie kan wisselen.",
  },
  {
    id: "fashion_runway",
    category: "dance",
    title: "Catwalk lopen",
    shortDescription: "Loop de catwalk met fashion-verlichting",
    userFacingDescription:
      "Loop over de catwalk met fashion-verlichting — stijlvol en zelfverzekerd.",
    difficulty: "easy",
    reliability: "high",
    recommendedDurationSeconds: 8,
    motionMode: "entrance",
    requiredInputs: ["person"],
    optionalInputs: ["outfit", "background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: false,
      feetVisiblePreferred: true,
      outfitRecommended: ["fashion outfit", "designer wear"],
    },
    motionSettings: {
      cameraMotion: "tracking along runway",
      energy: "medium",
      movement: "confident catwalk stride",
      pacing: "steady elegant",
      shotType: "fashion runway",
    },
    sceneSettings: {
      environment: "fashion runway",
      backgroundPrompt: "fashion runway, audience seated, bright runway lights, elegant atmosphere",
      atmosphere: "high fashion show",
      lighting: "runway spotlights",
    },
    styleSettings: {
      visualStyle: "fashion editorial",
      realismLevel: "realistic",
      cinematicLevel: "high",
    },
    audioSuggestions: {
      musicMood: "stylish",
      genre: "electronic fashion",
    },
    sfxSuggestions: ["camera shutters", "runway music beat"],
    promptTemplate:
      "The main character walks confidently down a fashion runway, elegant stride, audience on sides, bright runway lights, cinematic fashion editorial style.",
    negativePrompt:
      "No broken walk cycle, distorted legs, identity drift, duplicate faces.",
    feasibilityNote: "Catwalk-lopen is zeer betrouwbaar voor korte fashion-clips.",
  },
  {
    id: "fans_recognize_me",
    category: "comedy",
    title: "Fans herkennen mij",
    shortDescription: "Mensen herkennen je op straat",
    userFacingDescription:
      "Mensen herkennen jou op straat — zwaaien, lachen, grappig herkenningsmoment.",
    difficulty: "easy",
    reliability: "high",
    recommendedDurationSeconds: 8,
    motionMode: "comedy",
    requiredInputs: ["person"],
    optionalInputs: ["outfit", "background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: false,
      handsVisiblePreferred: true,
      feetVisiblePreferred: false,
      outfitRecommended: ["casual streetwear"],
    },
    motionSettings: {
      cameraMotion: "handheld street",
      energy: "medium",
      movement: "waving, surprised reaction, fans approaching",
      pacing: "natural",
      shotType: "street social",
    },
    sceneSettings: {
      environment: "city street",
      backgroundPrompt: "busy city street, pedestrians, casual urban setting, daylight",
      atmosphere: "funny recognition moment",
      lighting: "natural daylight",
    },
    styleSettings: {
      visualStyle: "social viral",
      realismLevel: "realistic",
      cinematicLevel: "low-medium",
    },
    audioSuggestions: {
      musicMood: "playful",
      genre: "upbeat social",
    },
    sfxSuggestions: ["street ambience", "excited chatter", "phone camera click"],
    promptTemplate:
      "The main character is recognized by fans on a city street, people waving and smiling, funny surprised reaction, social viral video style, natural realistic motion.",
    negativePrompt:
      "No duplicate faces, creepy crowd behavior, identity drift, distorted hands.",
    feasibilityNote: "Herkenningsmoment op straat is betrouwbaar met een duidelijke bronfoto.",
  },
  {
    id: "red_carpet_moment",
    category: "comedy",
    title: "Rode loper moment",
    shortDescription: "Camera flashes en celebrity pose",
    userFacingDescription:
      "Rode loper moment met camera flashes, pose en celebrity-sfeer.",
    difficulty: "easy",
    reliability: "high",
    recommendedDurationSeconds: 8,
    motionMode: "cinematic",
    requiredInputs: ["person"],
    optionalInputs: ["outfit", "background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: false,
      feetVisiblePreferred: true,
      outfitRecommended: ["formal outfit", "red carpet attire"],
    },
    motionSettings: {
      cameraMotion: "paparazzi angles",
      energy: "medium",
      movement: "posing on red carpet, confident stance",
      pacing: "elegant",
      shotType: "red carpet celebrity",
    },
    sceneSettings: {
      environment: "red carpet event",
      backgroundPrompt: "red carpet, camera flashes, event backdrop, velvet ropes, evening lights",
      atmosphere: "celebrity premiere",
      lighting: "camera flash bursts",
    },
    styleSettings: {
      visualStyle: "celebrity cinematic",
      realismLevel: "realistic",
      cinematicLevel: "high",
    },
    audioSuggestions: {
      musicMood: "glamorous",
      genre: "orchestral glamour",
    },
    sfxSuggestions: ["camera shutters", "crowd murmur", "flash pops"],
    promptTemplate:
      "The main character poses on a red carpet with camera flashes, confident celebrity moment, elegant stance, cinematic premiere style, realistic motion.",
    negativePrompt:
      "No distorted pose, broken limbs, identity drift, duplicate faces.",
    feasibilityNote: "Rode loper pose en flashes zijn zeer betrouwbaar.",
  },
  {
    id: "street_interview",
    category: "comedy",
    title: "Straatinterview",
    shortDescription: "Reporter komt naar je toe",
    userFacingDescription:
      "Een reporter komt naar je toe voor een straatinterview — spontaan en grappig.",
    difficulty: "easy",
    reliability: "high",
    recommendedDurationSeconds: 8,
    motionMode: "comedy",
    requiredInputs: ["person"],
    optionalInputs: ["reporter", "background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: false,
      handsVisiblePreferred: true,
      feetVisiblePreferred: false,
      outfitRecommended: ["casual clothes"],
    },
    motionSettings: {
      cameraMotion: "handheld interview",
      energy: "medium",
      movement: "being interviewed on street, gesturing while talking",
      pacing: "conversational",
      shotType: "street interview",
    },
    sceneSettings: {
      environment: "city sidewalk",
      backgroundPrompt: "city sidewalk, reporter with microphone, pedestrians passing, urban daylight",
      atmosphere: "spontaneous street interview",
      lighting: "natural daylight",
    },
    styleSettings: {
      visualStyle: "social documentary",
      realismLevel: "realistic",
      cinematicLevel: "low",
    },
    audioSuggestions: {
      musicMood: "lighthearted",
      genre: "acoustic social",
      voiceSuggestion: "conversational",
    },
    sfxSuggestions: ["street ambience", "microphone rustle"],
    promptTemplate:
      "A reporter approaches the main character on a city sidewalk for a street interview, conversational gestures, handheld camera style, natural realistic motion.",
    negativePrompt:
      "No distorted microphone, broken hands, identity drift, inappropriate content.",
    feasibilityNote: "Straatinterview-sfeer is betrouwbaar. Exacte lip-sync is niet gegarandeerd.",
  },
  {
    id: "beach_comedy_scene",
    category: "comedy",
    title: "Strand comedy scene",
    shortDescription: "Grappige strand/social scene",
    userFacingDescription:
      "Een grappige, lichte scene op het strand — social en speels.",
    difficulty: "medium",
    reliability: "medium",
    recommendedDurationSeconds: 8,
    motionMode: "comedy",
    requiredInputs: ["person"],
    optionalInputs: ["outfit", "background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: false,
      handsVisiblePreferred: true,
      feetVisiblePreferred: false,
      outfitRecommended: ["beach casual", "summer outfit"],
    },
    motionSettings: {
      cameraMotion: "handheld beach",
      energy: "medium",
      movement: "funny beach reaction or playful gesture",
      pacing: "light",
      shotType: "beach social comedy",
    },
    sceneSettings: {
      environment: "sunny beach",
      backgroundPrompt: "sunny beach, sand, ocean waves, summer atmosphere, bright sky",
      atmosphere: "lighthearted beach comedy",
      lighting: "bright summer sun",
    },
    styleSettings: {
      visualStyle: "social comedy",
      realismLevel: "realistic",
      cinematicLevel: "low-medium",
    },
    audioSuggestions: {
      musicMood: "fun summer",
      genre: "tropical pop",
    },
    sfxSuggestions: ["ocean waves", "seagulls", "laughter"],
    promptTemplate:
      "The main character in a lighthearted funny moment on a sunny beach, playful gesture, summer vibes, social comedy style, safe family-friendly content.",
    negativePrompt:
      "No explicit content, inappropriate gestures, identity drift, duplicate faces.",
    feasibilityNote:
      "Lichte strandcomedy is betrouwbaar. Houd het veilig en niet expliciet.",
  },
  {
    id: "hero_entrance",
    category: "adventure",
    title: "Hero entrance",
    shortDescription: "Filmische entree naar de camera",
    userFacingDescription:
      "Een filmische hero-entree: loop zelfverzekerd naar de camera toe.",
    difficulty: "easy",
    reliability: "high",
    recommendedDurationSeconds: 8,
    motionMode: "entrance",
    requiredInputs: ["person"],
    optionalInputs: ["outfit", "background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: false,
      feetVisiblePreferred: true,
      outfitRecommended: ["hero outfit", "dramatic coat"],
    },
    motionSettings: {
      cameraMotion: "slow dolly back",
      energy: "medium-high",
      movement: "confident walk toward camera",
      pacing: "dramatic",
      shotType: "cinematic hero entrance",
    },
    sceneSettings: {
      environment: "dramatic open space",
      backgroundPrompt: "dramatic open space, atmospheric haze, cinematic depth, epic mood",
      atmosphere: "hero arrival",
      lighting: "dramatic backlight",
    },
    styleSettings: {
      visualStyle: "cinematic blockbuster",
      realismLevel: "realistic",
      cinematicLevel: "high",
    },
    audioSuggestions: {
      musicMood: "epic",
      genre: "orchestral cinematic",
    },
    sfxSuggestions: ["wind gust", "dramatic bass hit"],
    promptTemplate:
      "The main character walks confidently toward the camera in a dramatic cinematic hero entrance, atmospheric lighting, epic mood, realistic motion.",
    negativePrompt:
      "No broken walk cycle, identity drift, duplicate faces, distorted proportions.",
    feasibilityNote: "Hero-entree naar camera is zeer betrouwbaar.",
  },
  {
    id: "sports_car_arrival",
    category: "adventure",
    title: "Uit sportwagen stappen",
    shortDescription: "Stap uit een luxe sportwagen",
    userFacingDescription:
      "Stap uit een luxe sportwagen — zelfverzekerd, lifestyle-vibe.",
    difficulty: "medium",
    reliability: "medium",
    recommendedDurationSeconds: 8,
    motionMode: "lifestyle",
    requiredInputs: ["person"],
    optionalInputs: ["sports_car", "outfit"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: false,
      feetVisiblePreferred: true,
      outfitRecommended: ["luxury casual", "designer outfit"],
    },
    motionSettings: {
      cameraMotion: "low angle static",
      energy: "medium",
      movement: "stepping out of sports car confidently",
      pacing: "smooth",
      shotType: "luxury lifestyle",
    },
    sceneSettings: {
      environment: "luxury arrival",
      backgroundPrompt: "luxury sports car, upscale location, evening lights, premium atmosphere",
      atmosphere: "luxury lifestyle",
      lighting: "golden hour or evening",
    },
    styleSettings: {
      visualStyle: "luxury cinematic",
      realismLevel: "realistic",
      cinematicLevel: "high",
    },
    audioSuggestions: {
      musicMood: "sophisticated",
      genre: "luxury electronic",
    },
    sfxSuggestions: ["car door open", "engine idle", "urban ambience"],
    promptTemplate:
      "The main character steps confidently out of a luxury sports car, upscale setting, cinematic lifestyle shot, realistic motion.",
    negativePrompt:
      "No broken car door interaction, distorted limbs, identity drift, duplicate faces.",
    feasibilityNote:
      "Uitstappen en pose zijn betrouwbaar. Exacte auto-details en deurgreep kunnen wisselen.",
  },
  {
    id: "mountain_summit",
    category: "adventure",
    title: "Bergtop bereiken",
    shortDescription: "Overwinning op de bergtop",
    userFacingDescription:
      "Bereik de bergtop en vier de overwinning met uitzicht over de vallei.",
    difficulty: "easy",
    reliability: "high",
    recommendedDurationSeconds: 8,
    motionMode: "celebration",
    requiredInputs: ["person"],
    optionalInputs: ["outfit", "background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: false,
      handsVisiblePreferred: true,
      feetVisiblePreferred: false,
      outfitRecommended: ["hiking gear", "outdoor jacket"],
    },
    motionSettings: {
      cameraMotion: "wide panoramic",
      energy: "medium-high",
      movement: "reaching summit, arms raised in triumph",
      pacing: "steady",
      shotType: "epic landscape",
    },
    sceneSettings: {
      environment: "mountain summit",
      backgroundPrompt: "mountain summit, panoramic valley view, clouds below, epic landscape",
      atmosphere: "achievement and triumph",
      lighting: "golden mountain light",
    },
    styleSettings: {
      visualStyle: "adventure cinematic",
      realismLevel: "realistic",
      cinematicLevel: "high",
    },
    audioSuggestions: {
      musicMood: "inspirational",
      genre: "orchestral adventure",
    },
    sfxSuggestions: ["wind on summit", "eagle cry distant"],
    promptTemplate:
      "The main character reaches a mountain summit and raises arms in triumph, panoramic valley view, epic adventure cinematic style, realistic motion.",
    negativePrompt:
      "No floating body, distorted limbs, identity drift, duplicate faces.",
    feasibilityNote: "Bergtop-moment met armen omhoog is zeer betrouwbaar.",
  },
  {
    id: "city_sprint",
    category: "adventure",
    title: "Sprint door de stad",
    shortDescription: "Rennen door de stad",
    userFacingDescription:
      "Sprint door de stad — dynamisch, energiek urban actiemoment.",
    difficulty: "medium",
    reliability: "medium",
    recommendedDurationSeconds: 8,
    motionMode: "sport",
    requiredInputs: ["person"],
    optionalInputs: ["outfit", "background"],
    characterRequirements: {
      motionReadyPreferred: true,
      fullBodyRequired: true,
      handsVisiblePreferred: false,
      feetVisiblePreferred: true,
      outfitRecommended: ["athletic wear", "running shoes"],
    },
    motionSettings: {
      cameraMotion: "tracking alongside",
      energy: "high",
      movement: "sprinting through city streets",
      pacing: "fast",
      shotType: "urban action",
    },
    sceneSettings: {
      environment: "city streets",
      backgroundPrompt: "city streets, buildings passing, urban energy, motion blur background",
      atmosphere: "urban adrenaline",
      lighting: "urban daylight",
    },
    styleSettings: {
      visualStyle: "action urban",
      realismLevel: "realistic",
      cinematicLevel: "medium",
    },
    audioSuggestions: {
      musicMood: "intense",
      genre: "electronic action",
    },
    sfxSuggestions: ["footsteps fast", "city traffic distant", "wind rush"],
    promptTemplate:
      "The main character sprints through city streets with dynamic energy, buildings in background, cinematic urban action style, realistic running motion.",
    negativePrompt:
      "No broken running cycle, extra legs, identity drift, duplicate faces.",
    feasibilityNote:
      "Stadssprint werkt goed. Perfecte hardloopfysica kan per generatie wisselen.",
  },
  ...EXPANDED_MOTION_ACTION_PRESETS,
];

const PRESET_BY_ID = new Map<MotionActionPresetId, MotionActionPreset>(
  PRESETS.map((preset) => [preset.id, preset])
);

export const MOTION_ACTION_PRESET_FEATURED_IDS: MotionActionPresetId[] = PRESETS.map(
  (preset) => preset.id
);

type PresetKeywordRule = {
  id: MotionActionPresetId;
  keywords: string[];
};

const PRESET_KEYWORD_RULES: PresetKeywordRule[] = [
  { id: "goal_celebration", keywords: ["doelpunt", "scoor", "score goal", "goal celebration", "ik scoor"] },
  { id: "stadium_entrance", keywords: ["stadion binnen", "stadium entrance", "tunnel", "stadionopkomst", "het stadion"] },
  { id: "championship_celebration", keywords: ["kampioen", "championship", "trofee", "trophy", "confetti"] },
  { id: "basketball_dunk_celebration", keywords: ["dunk", "basketbal", "basketball"] },
  { id: "snowboard_jump", keywords: ["snowboard", "sneeuw sprong", "snowboard sprong"] },
  { id: "skateboard_trick", keywords: ["skateboard", "skate", "skate trick", "kickflip"] },
  { id: "cycling_finish", keywords: ["wielren", "cycling", "fiets finish", "finishlijn fiets"] },
  { id: "moonwalk", keywords: ["moonwalk"] },
  { id: "stage_performance", keywords: ["podium", "optreden", "stage performance", "concert"] },
  { id: "fashion_runway", keywords: ["catwalk", "runway", "modepodium", "fashion"] },
  { id: "fans_recognize_me", keywords: ["fans herkennen", "herkennen mij", "recognize me", "herkend worden"] },
  { id: "red_carpet_moment", keywords: ["rode loper", "red carpet", "premiere"] },
  { id: "street_interview", keywords: ["straatinterview", "street interview", "reporter"] },
  { id: "beach_comedy_scene", keywords: ["strand comedy", "beach comedy", "grappig strand"] },
  { id: "hero_entrance", keywords: ["hero entrance", "helden entree", "epische entree"] },
  { id: "sports_car_arrival", keywords: ["sportwagen", "sports car", "luxe auto", "uit auto stappen"] },
  { id: "mountain_summit", keywords: ["bergtop", "mountain summit", "top bereiken"] },
  { id: "city_sprint", keywords: ["sprint door", "rennen door de stad", "city sprint"] },
  ...EXPANDED_PRESET_KEYWORD_RULES,
];

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getAllMotionActionPresets(): MotionActionPreset[] {
  return [...PRESETS];
}

export function getMotionActionPreset(id: MotionActionPresetId): MotionActionPreset | null {
  return PRESET_BY_ID.get(id) ?? null;
}

export function isMotionActionPresetId(value: unknown): value is MotionActionPresetId {
  return typeof value === "string" && PRESET_BY_ID.has(value as MotionActionPresetId);
}

export function detectMotionActionPresetFromMessage(message: string): MotionActionPresetId | null {
  const text = normalize(message);
  if (!text) {
    return null;
  }

  let best: { id: MotionActionPresetId; score: number } | null = null;
  for (const rule of PRESET_KEYWORD_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (text.includes(keyword)) {
        score += keyword.length;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { id: rule.id, score };
    }
  }

  if (best) {
    return best.id;
  }

  if (text.includes("voetbal") || text.includes("football") || text.includes("wedstrijd")) {
    return "goal_celebration";
  }
  if (text.includes("stadion") || text.includes("stadium")) {
    return "stadium_entrance";
  }
  if (
    (text.includes("grappig") || text.includes("herkennen") || text.includes("straat")) &&
    (text.includes("video") || text.includes("filmpje") || text.includes("clip"))
  ) {
    return "fans_recognize_me";
  }

  return null;
}

export function buildMotionActionPresetMetadata(
  preset: MotionActionPreset
): MotionActionPresetMetadata {
  return {
    actionPresetId: preset.id,
    actionPresetCategory: preset.category,
    actionPresetTitle: preset.title,
    promptTemplate: preset.promptTemplate,
    feasibilityNote: preset.feasibilityNote,
  };
}

export function validateMotionActionPresets(): string[] {
  const errors: string[] = [];
  for (const preset of PRESETS) {
    const required = [
      "id",
      "category",
      "title",
      "promptTemplate",
      "negativePrompt",
      "feasibilityNote",
    ] as const;
    for (const field of required) {
      if (!preset[field]?.trim()) {
        errors.push(`${preset.id}: missing ${field}`);
      }
    }
    if (preset.requiredInputs.length === 0) {
      errors.push(`${preset.id}: missing requiredInputs`);
    }
    if (!preset.motionSettings.movement?.trim()) {
      errors.push(`${preset.id}: missing motionSettings.movement`);
    }
    if (!preset.sceneSettings.environment?.trim()) {
      errors.push(`${preset.id}: missing sceneSettings.environment`);
    }
  }
  return errors;
}

export function motionActionPresetToInstantStyle(preset: MotionActionPreset): string {
  if (preset.motionMode === "comedy" || preset.styleSettings.visualStyle.includes("social")) {
    return "social";
  }
  if (
    preset.motionMode === "cinematic" ||
    preset.motionMode === "sport" ||
    preset.styleSettings.cinematicLevel === "high"
  ) {
    return "cinematic";
  }
  return "realistic";
}

export function motionActionPresetMissingInputKeys(
  preset: MotionActionPreset
): `assistant.prefill.missing.${string}`[] {
  const keys: `assistant.prefill.missing.${string}`[] = ["assistant.prefill.missing.person"];
  return keys;
}

export function isHelpDiscoveryMessage(message: string): boolean {
  const text = normalize(message);
  return (
    text.includes("wat kan ik") ||
    text.includes("what can i") ||
    text.includes("wat kan je") ||
    text.includes("help me choose") ||
    text.includes("suggesties")
  );
}

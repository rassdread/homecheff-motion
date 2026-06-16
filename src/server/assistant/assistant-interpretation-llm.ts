import {
  interpretAssistantRequest,
  validateAssistantInterpretation,
} from "@/lib/assistant-interpretation-engine";
import {
  enrichConversationalInterpretation,
  interpretConversationally,
} from "@/lib/assistant-conversational-interpretation";
import type { AssistantInterpretation } from "@/types/assistant-interpretation";

const DEFAULT_MODEL = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";

const SYSTEM_PROMPT = `You interpret creative requests for HomeCheff, a video/character/studio platform.
Return ONLY valid JSON matching this shape:
{
  "originalMessage": string,
  "understoodGoal": string (short human summary, NEVER copy the user message verbatim),
  "detectedIntent": string (one of: prepare_motion_character, outfit_from_reference, create_motion_video, studio_story, character_new, character_from_reference),
  "confidence": "high" | "medium" | "low",
  "targetModule": "studio" | "editor" | "motion" | "publish" | "characters" | "fusion",
  "likelyActionId": string (one of: prepare_motion_character, create_fusion, create_motion_video, create_character, create_character_from_reference),
  "extractedEntities": {
    "people": string[] (concrete roles like "You / main character", NOT raw user text),
    "characters": string[],
    "locations": string[],
    "actions": string[],
    "style": string[],
    "constraints": string[]
  },
  "inferredSettings": object,
  "missingInputs": string[],
  "followUpQuestions": [{
    "id": string,
    "label": string,
    "reason": string,
    "options": string[],
    "required": boolean,
    "affectsSettings": string[]
  }],
  "safetyOrFeasibilityNotes": string[],
  "suggestedRoute": string
}
Rules:
- NEVER paste the user prompt into characters, locations, CTA, or story fields.
- Propose concrete creative interpretations.
- Ask only necessary follow-up questions (max 6).
- Do NOT suggest generation, rendering, or provider calls.
- For sports/action clips, note feasibility limits for complex motion.`;

export async function interpretAssistantRequestWithLlm(input: {
  message: string;
  locale?: "nl" | "en";
}): Promise<AssistantInterpretation | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const locale = input.locale ?? "en";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Locale: ${locale}\nUser message: ${input.message.trim()}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    return null;
  }

  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  const row = parsed as Record<string, unknown>;
  if (!row.originalMessage) {
    row.originalMessage = input.message.trim();
  }

  return validateAssistantInterpretation(row);
}

export function resolveAssistantInterpretation(input: {
  message: string;
  locale?: "nl" | "en";
  useLlm?: boolean;
}): Promise<AssistantInterpretation | null> {
  const rules = interpretConversationally(input.message, { locale: input.locale });
  if (!input.useLlm) {
    return Promise.resolve(rules);
  }

  return interpretAssistantRequestWithLlm(input).then((llm) => {
    const picked = llm ?? rules;
    if (!picked) {
      return null;
    }
    return enrichConversationalInterpretation(picked, input.message, { locale: input.locale });
  });
}

"use client";

import type { GuidedQuestionDef } from "@/lib/studio-creative-director/guided-questions";

type Props = {
  questions: GuidedQuestionDef[];
  values: Record<string, string | boolean | null | undefined>;
  onChange: (question: GuidedQuestionDef, value: string | boolean) => void;
};

export function StudioGuidedQuestions({ questions, values, onChange }: Props) {
  if (questions.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No extra questions for this experience.</p>
    );
  }

  return (
    <div className="space-y-5" role="group" aria-label="Experience questions">
      {questions.map((q) => {
        const raw = values[q.answerKey];
        const selected =
          typeof raw === "boolean" ? String(raw) : raw == null ? "" : String(raw);

        return (
          <fieldset key={q.id} className="space-y-2">
            <legend className="text-sm font-semibold text-zinc-900">{q.label}</legend>
            {q.help ? <p className="text-xs text-zinc-500">{q.help}</p> : null}

            {q.type === "boolean" ? (
              <div className="flex flex-wrap gap-2">
                {[
                  { value: true, label: "Yes" },
                  { value: false, label: "No" },
                ].map((opt) => {
                  const isOn = raw === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      aria-pressed={isOn}
                      onClick={() => onChange(q, opt.value)}
                      className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                        isOn
                          ? "border-[#006D52] bg-[#006D52]/10 text-[#006D52] ring-2 ring-[#006D52]/30"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {q.type === "short_text" ? (
              <input
                type="text"
                value={selected}
                onChange={(e) => onChange(q, e.target.value)}
                className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#006D52] focus:ring-2 focus:ring-[#006D52]/20"
                aria-label={q.label}
              />
            ) : null}

            {(q.type === "single_choice" ||
              q.type === "platform_choice" ||
              q.type === "style_choice") &&
            q.options ? (
              <div className="flex flex-wrap gap-2" role="listbox" aria-label={q.label}>
                {q.options.map((opt) => {
                  const isOn = selected === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isOn}
                      onClick={() => onChange(q, opt.value)}
                      className={`min-h-11 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                        isOn
                          ? "border-[#006D52] bg-[#006D52]/10 text-[#006D52] ring-2 ring-[#006D52]/30"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}

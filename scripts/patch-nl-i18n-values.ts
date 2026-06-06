/**
 * One-off: patch nl.ts translation VALUES only (never keys).
 * Run: npx tsx scripts/patch-nl-i18n-values.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const path = "src/i18n/locales/nl.ts";
const src = readFileSync(path, "utf8");

const VALUE_REPLACEMENTS: Array<[string, string]> = [
  ["Review nodig", "Nog werk nodig"],
  ["Story health", "Verhaalsterkte"],
  ["Shotplan", "Camerplan"],
  ["Storyboards", "Videoverhalen"],
  ["Storyboard ", "Videoverhaal "],
  [" storyboard", " videoverhaal"],
  ["storyboard", "videoverhaal"],
  ["Providerregistry", "Dienstregister"],
  ["Providerstatus", "Dienststatus"],
  ["Provider execution plan", "Dienstuitvoeringsplan"],
  ["Provider execution planning", "Dienstuitvoeringsplanning"],
  ["Provider execution", "Dienstuitvoering"],
  ["Provider-duur", "Dienstduur"],
  ["Director V2", "AI-regisseur"],
  ["Director Console", "AI-regisseur"],
  ["inspector en assets sidebar", "projectanalyse en onderdelenbibliotheek"],
  ["Scene-voor-scene workspace met AI-regisseur", "Scène voor scène bewerken in de verhaaleditor — met AI-regisseur"],
  [": \"Provider\"", ": \"Dienst\""],
  ["Transition Mode", "Overgangsmodus"],
  ["Story Mode", "Verhaalmodus"],
  ["Fast —", "Snel —"],
  ["Standard —", "Standaard —"],
  ["Cinematic —", "Filmisch —"],
  ["Hero Text", "Hero-tekst"],
  ["Pipeline-internals", "Technische details"],
  ["Text beats", "Tekstregels"],
  ["Voice plan", "Stemplan"],
  ["Music plan", "Muziekplan"],
  ["Sound plan", "Geluidplan"],
  ["Motion instructions", "Motion-instructies"],
  ["Headline", "Koptekst"],
  ["Subheadline", "Subkop"],
  ["Audio Production Director", "Geluidsproductie"],
  ["Scene Composer", "Scène-editor"],
  ["Uniforme registry", "Uniforme catalogus"],
  ["execution-framework", "uitvoeringskader"],
  ["videoproviders", "videodiensten"],
  ["voice-, muziek-, sound-", "stem-, muziek-, geluid-"],
  ["Voice ", "Stem "],
  ["voice-", "stem-"],
  ["Voice-over", "Voice-over"], // keep brand-ish - actually NL: voice-over ok or "Stem"
];

function patchValue(value: string): string {
  let out = value;
  for (const [from, to] of VALUE_REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

const lines = src.split("\n");
const out: string[] = [];

for (const line of lines) {
  // Single-line string value:  "key": "value",
  const single = line.match(/^(\s*"[^"]+":\s*")((?:\\.|[^"\\])*)(",?\s*)$/);
  if (single) {
    out.push(single[1] + patchValue(single[2]) + single[3]);
    continue;
  }
  // Continuation line starting with quoted string
  const cont = line.match(/^(\s*)("(?:\\.|[^"\\])*)("?,?\s*)$/);
  if (cont && !line.includes(":")) {
    out.push(cont[1] + patchValue(cont[2]) + cont[3]);
    continue;
  }
  out.push(line);
}

writeFileSync(path, out.join("\n"));
console.log("Patched nl.ts values");

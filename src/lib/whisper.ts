/**
 * Turns a spoken or typed note about someone into one short line to whisper.
 *
 *   "This is Raj, my neighbour, had knee surgery last month"
 *     -> "Raj, your neighbour. Knee surgery last month."
 *
 * Plain rules, no network and no key, so it always works. The line is always
 * editable by the user afterwards.
 */

const MAX_WORDS = 18;

const INTRO = /^(?:so\s+|ok(?:ay)?\s+|um+\s+|uh+\s+)*(?:this is|that is|that's|thats|meet|it's|it is|here is|here's|say hi to|this guy is|this girl is)\s+/i;

// First person (the user talking) becomes second person (the whisper talking to the user).
const PRONOUNS: Array<[RegExp, string]> = [
  [/\bI am\b/gi, 'you are'],
  [/\bI'm\b/gi, "you're"],
  [/\bI've\b/gi, "you've"],
  [/\bI'd\b/gi, "you'd"],
  [/\bI'll\b/gi, "you'll"],
  [/\bI was\b/gi, 'you were'],
  [/\bwe're\b/gi, "you're"],
  [/\bwe've\b/gi, "you've"],
  [/\bwe were\b/gi, 'you were'],
  [/\bwe are\b/gi, 'you are'],
  [/\bmyself\b/gi, 'yourself'],
  [/\bmine\b/gi, 'yours'],
  [/\bmy\b/gi, 'your'],
  [/\bour\b/gi, 'your'],
  [/\bours\b/gi, 'yours'],
  [/\bme\b/gi, 'you'],
  [/\bus\b/g, 'you'],
  [/\bI\b/g, 'you'],
  [/\bwe\b/gi, 'you'],
];

// "she had knee surgery" -> "knee surgery"; "he is a nurse" -> "a nurse"
const SUBJECT = /^(?:he|she|they|he's|she's|they're|they've|he has|she has|they have)\s+/i;
const LEAD_VERB = /^(?:had|has|have|is|was|are|were)\s+/i;
const KEEP_VERB_AFTER = /^(?:had|has)\s+(?:been|to|a\s+baby|just)\b/i;

function normalise(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function swapPronouns(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PRONOUNS) {
    // Lower case here; each clause is capitalised again when the line is assembled.
    out = out.replace(pattern, replacement);
  }
  return out;
}

function tidyClause(clause: string): string {
  let c = clause.trim().replace(/^(?:and|also|plus|but)\s+/i, '');
  c = c.replace(SUBJECT, '');
  if (!KEEP_VERB_AFTER.test(c)) c = c.replace(LEAD_VERB, '');
  return c.replace(/[\s,;:.!?-]+$/g, '').trim();
}

function isRelationship(clause: string): boolean {
  return /^your\b/i.test(clause) || /^(?:a|an|the)\s+\w+\s+(?:from|at|in)\b/i.test(clause);
}

function limitWords(parts: string[]): string[] {
  const kept: string[] = [];
  let words = 0;
  for (const part of parts) {
    const count = part.split(' ').length;
    if (kept.length > 0 && words + count > MAX_WORDS) break;
    kept.push(part);
    words += count;
  }
  return kept;
}

/**
 * Rule-based whisper. `name` is the name typed at the consent step and always
 * leads the whisper, so the most important word comes first.
 */
export function makeWhisper(name: string, note: string): string {
  const cleanName = normalise(name);
  let text = normalise(note);
  if (!text) return cleanName ? `${cleanName}.` : '';

  text = text.replace(INTRO, '');
  if (cleanName) {
    const nameAtStart = new RegExp(`^${escapeRegExp(cleanName)}(?:'s)?\\b[\\s,.-]*`, 'i');
    text = text.replace(nameAtStart, '');
    // "...this is Raj" said mid-sentence, or "Raj is my neighbour"
    text = text.replace(new RegExp(`\\b${escapeRegExp(cleanName)}\\s+(?:is|was)\\s+`, 'i'), '');
  }
  text = swapPronouns(text);

  const clauses = text
    .split(/(?:[.;!?]+\s*|,\s*|\s+-\s+|\n+)/)
    .map(tidyClause)
    .filter((c) => c.length > 0 && c.toLowerCase() !== cleanName.toLowerCase());

  let relationship = '';
  const facts: string[] = [];
  for (const clause of clauses) {
    if (!relationship && facts.length === 0 && isRelationship(clause)) relationship = clause;
    else facts.push(clause);
  }

  const head = relationship ? `${cleanName}, ${relationship}` : cleanName;
  const parts = limitWords([head, ...facts].filter(Boolean));
  return parts.map(capitalise).join('. ') + '.';
}

/** The words a person's cue notes turn into, for the caption card. */
export function cueLine(cues: { clothes?: string; hair?: string; glasses?: string; other?: string }): string {
  return [cues.clothes, cues.hair, cues.glasses, cues.other]
    .map((c) => (c ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}

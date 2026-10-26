/**
 * Spoken enrolment: one sentence such as "This is Raj, my neighbour, had knee
 * surgery last month, wears a green parka, we met at the climbing gym" is split
 * into a name, the note, cue notes and where you met. Rules only, on the phone;
 * the result is always shown for checking before anything is saved.
 */
import type { Cues } from './types';

export interface Intro {
  name: string;
  note: string;
  cues: Cues;
  met: string;
}

const NAME_LEAD = /\b(?:this is|that's|that is|it's|it is|meet|here's|here is|say hi to)\s+([\p{L}][\p{L}'’-]*)/iu;
const STOP_NAMES = new Set(['my', 'our', 'the', 'a', 'an', 'your', 'his', 'her', 'their', 'mister', 'miss']);

function capitalise(word: string): string {
  return word.charAt(0).toLocaleUpperCase() + word.slice(1);
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/^[\s,;.]+|[\s,;.]+$/g, '').trim();
}

/** Splits on commas, semicolons, full stops and a joining "and". */
function clauses(text: string): string[] {
  return text
    .split(/[,;.]|\s+and\s+(?=(?:wears|wearing|has|with|we|met|last|usually|always|she|he|they)\b)/i)
    .map(clean)
    .filter(Boolean);
}

const CLOTHES = /^(?:(?:he|she|they)\s+)?(?:usually\s+|always\s+)?(?:wears|wearing|is wearing|dresses in)\s+(.+)$/i;
const HAIR = /\bhair\b|\bbald\b|\bbeard\b|\bmoustache\b|\bstubble\b/i;
const GLASSES = /\bglasses\b|\bspecs\b|\bearrings?\b|\bhat\b|\bcap\b|\bscarf\b|\bpiercings?\b/i;
const MET = /^(?:(?:we|i)\s+)?(?:first\s+)?(?:met|last saw|saw (?:him|her|them) last|know (?:him|her|them) from)\b\s*(?:(?:him|her|them)\s+)?(.*)$/i;
const OTHER = /\bvoice\b|\baccent\b|\blaugh\b|\bwalks\b|\bdog\b/i;
const LEAD_VERB = /^(?:(?:he|she|they)\s+)?(?:usually\s+|always\s+)?(?:has|have|with|wears|wearing|got|is)\s+/i;

/** "he has a deep voice" -> "Deep voice". */
function cue(part: string): string {
  return capitalise(clean(part.replace(LEAD_VERB, '').replace(/^(?:a|an|the|his|her|their)\s+/i, '')));
}

const short = (part: string) => part.split(' ').length <= 8;

export function parseIntro(raw: string): Intro {
  const text = clean(raw);
  const cues: Cues = {};
  let met = '';
  let name = '';

  const lead = NAME_LEAD.exec(text);
  if (lead && !STOP_NAMES.has(lead[1].toLowerCase())) name = capitalise(lead[1]);
  if (!name) {
    // No "this is": take the first word if it looks like a name ("Raj, my neighbour...").
    const first = /^([\p{Lu}][\p{L}'’-]+)\b/u.exec(text);
    if (first && !/^(this|that|he|she|they|my|our|we|i)$/i.test(first[1])) name = first[1];
  }

  const keep: string[] = [];
  for (const part of clauses(text)) {
    const metMatch = MET.exec(part);
    if (metMatch && metMatch[1]) {
      met = met || clean(metMatch[1]);
      continue;
    }
    if (GLASSES.test(part) && short(part)) {
      cues.glasses = cues.glasses || cue(part);
      continue;
    }
    if (HAIR.test(part) && short(part)) {
      cues.hair = cues.hair || cue(part);
      continue;
    }
    const clothes = CLOTHES.exec(part);
    if (clothes) {
      cues.clothes = cues.clothes || cue(clothes[1]);
      continue;
    }
    if (OTHER.test(part) && short(part) && keep.length > 0) {
      cues.other = cues.other || cue(part);
      continue;
    }
    keep.push(part);
  }

  return { name, note: keep.join(', '), cues, met: met ? capitalise(met) : '' };
}

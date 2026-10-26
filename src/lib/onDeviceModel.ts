/**
 * Optional: if the browser ships a built-in, on-device language model
 * (Chrome's Prompt API, `LanguageModel`) and it is already downloaded, use it
 * to write the whisper. Never required, never downloads anything on its own,
 * never sends the note anywhere. Falls back to the rule-based writer.
 */

interface LanguageModelSession {
  prompt(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}

interface LanguageModelApi {
  availability(options?: unknown): Promise<string>;
  create(options?: unknown): Promise<LanguageModelSession>;
}

function api(): LanguageModelApi | null {
  const g = globalThis as unknown as { LanguageModel?: LanguageModelApi };
  return g.LanguageModel && typeof g.LanguageModel.availability === 'function' ? g.LanguageModel : null;
}

const LANGS = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };

export async function onDeviceModelAvailable(): Promise<boolean> {
  const lm = api();
  if (!lm) return false;
  try {
    return (await lm.availability(LANGS)) === 'available';
  } catch {
    return false;
  }
}

const SYSTEM = [
  'You write one short line that will be whispered into the ear of someone with face blindness,',
  'reminding them who the person in front of them is. Use second person ("your neighbour").',
  'Start with the name. At most 14 words. Keep only facts from the note. No quotes, no emoji.',
].join(' ');

export async function whisperWithModel(name: string, note: string, timeoutMs = 6000): Promise<string | null> {
  const lm = api();
  if (!lm) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let session: LanguageModelSession | null = null;
  try {
    session = await lm.create({ ...LANGS, initialPrompts: [{ role: 'system', content: SYSTEM }] });
    const out = await session.prompt(`Name: ${name}\nNote: ${note}\nWhisper:`, { signal: controller.signal });
    const line = out.replace(/["“”]/g, '').split('\n')[0].trim();
    if (!line || line.split(' ').length > 22) return null;
    return /[.!?]$/.test(line) ? line : `${line}.`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    session?.destroy();
  }
}

/** The helper page: a trusted person prepares a card as text and sends it as a link. Nothing here talks to a server. */
import { cardLink } from '../src/lib/cardLink';
import { shareLink } from '../src/lib/consentLink';
import { makeWhisper } from '../src/lib/whisper';
import { BRAND } from '../src/brand';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const form = $<HTMLFormElement>('[data-form]');
const nameInput = $<HTMLInputElement>('[data-name]');
const noteInput = $<HTMLTextAreaElement>('[data-note]');
const line = $('[data-line]');
let url = '';

const preview = () => {
  const name = nameInput.value.trim();
  const note = noteInput.value.trim();
  line.textContent = name || note ? `“${makeWhisper(name || 'They', note || name)}”` : '…';
};
nameInput.addEventListener('input', preview);
noteInput.addEventListener('input', preview);

const doShare = async (name: string) => {
  const result = await shareLink(url, `${BRAND.name}: a card for ${name}`, `A ${BRAND.name} card for ${name}`);
  $('[data-done-text]').textContent =
    result === 'copied'
      ? 'The link is copied. Paste it to them; they check the card and add the person when they next meet.'
      : 'Send the link to them. They open it, check the card and add the person when they next meet.';
};

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const get = (k: string) => String(data.get(k) ?? '');
  const name = get('name').trim();
  if (!name) return;
  url = cardLink(location.origin, {
    name,
    note: get('note') || name,
    cues: { clothes: get('clothes'), hair: get('hair'), glasses: get('glasses'), other: get('other') },
    met: get('met'),
    by: get('by'),
  });
  form.hidden = true;
  $('[data-done]').hidden = false;
  $('[data-url]').textContent = url;
  void doShare(name);
});
$('[data-share]').addEventListener('click', () => void doShare(nameInput.value.trim()));
$('[data-again]').addEventListener('click', () => {
  form.reset();
  preview();
  form.hidden = false;
  $('[data-done]').hidden = true;
  nameInput.focus();
});

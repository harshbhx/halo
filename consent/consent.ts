/** The page the person being added opens on their own phone. Nothing here talks to a server. */
import { answerLink, readAsk, shareLink } from '../src/lib/consentLink';
import { BRAND } from '../src/brand';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const ask = readAsk(location.hash);
const origin = location.origin;

if (!ask) {
  $('[data-broken]').hidden = false;
} else {
  $('[data-hello]').textContent = `Hi ${ask.name}.`;
  $('[data-line]').textContent = `“${ask.line}”`;
  $('[data-line-wrap]').hidden = false;
  const form = $<HTMLFormElement>('[data-form]');
  form.hidden = false;
  const intro = $<HTMLTextAreaElement>('[data-intro]');
  intro.value = ask.line;
  const agree = $<HTMLInputElement>('[data-agree]');
  const send = $<HTMLButtonElement>('[data-send]');
  agree.addEventListener('change', () => (send.disabled = !agree.checked));
  let url = '';
  const doShare = async () => {
    const result = await shareLink(url, `${BRAND.name}: my answer`, `Yes from ${ask.name}`);
    $('[data-done-text]').textContent =
      result === 'copied' ? 'The link is copied. Paste it back to them in the chat they used to ask you.' : 'Send the link back to them, in the same chat they used to ask you.';
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!agree.checked) return;
    const data = new FormData(form);
    url = answerLink(origin, { name: ask.name, intro: String(data.get('intro') ?? ''), cue: String(data.get('cue') ?? '') });
    form.hidden = true;
    $('[data-done]').hidden = false;
    $('[data-url]').textContent = url;
    void doShare();
  });
  $('[data-share]').addEventListener('click', () => void doShare());
}

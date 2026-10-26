import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { CalendarHeart, ChevronLeft, Ear, Lock, Settings as SettingsIcon, Shuffle, UsersRound } from 'lucide-react';
import { navigate, type Route } from '../lib/router';
import { unlockAudio } from '../lib/voice';

/** The brand mark: a face-shaped ring with a whisper beside it. */
export function HaloMark({ size = 24 }: { size?: number }) {
  return (
    <svg className="halo-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" strokeLinecap="round">
      <ellipse cx="9.5" cy="12" rx="5.6" ry="7" stroke="currentColor" strokeWidth="2" />
      <path d="M17.2 8.6c1 .9 1.6 2.1 1.6 3.4s-.6 2.5-1.6 3.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 6.2c1.6 1.5 2.5 3.5 2.5 5.8s-.9 4.3-2.5 5.8" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <HaloMark />
      Face Whisper
    </span>
  );
}

export function BackButton({ to = '/', label = 'Back' }: { to?: string; label?: string }) {
  return (
    <button type="button" className="icon-btn" onClick={() => navigate(to)} aria-label={label}>
      <ChevronLeft size={24} aria-hidden="true" />
    </button>
  );
}

const TABS: Array<{ name: Route['name']; path: string; label: string; icon: typeof UsersRound; also?: Route['name'][] }> = [
  { name: 'home', path: '/', label: 'People', icon: UsersRound, also: ['person'] },
  { name: 'today', path: '/today', label: 'Today', icon: CalendarHeart },
  { name: 'whisper', path: '/whisper', label: 'Whisper', icon: Ear },
  { name: 'practice', path: '/practice', label: 'Practice', icon: Shuffle },
  { name: 'settings', path: '/settings', label: 'Settings', icon: SettingsIcon, also: ['privacy', 'backup'] },
];

export function TabBar({ route }: { route: Route }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => {
        const current = route.name === t.name || t.also?.includes(route.name);
        const Icon = t.icon;
        if (t.name === 'whisper') {
          return (
            <button
              key={t.name}
              type="button"
              className="tab tab--whisper"
              onClick={() => {
                unlockAudio();
                navigate(t.path);
              }}
              aria-label="Start Whisper mode"
            >
              <span className="tab__lamp">
                <Icon size={26} strokeWidth={2.2} aria-hidden="true" />
              </span>
            </button>
          );
        }
        return (
          <button
            key={t.name}
            type="button"
            className="tab"
            aria-current={current ? 'page' : undefined}
            onClick={() => navigate(t.path)}
          >
            <Icon size={24} aria-hidden="true" />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

export function LocalBadge() {
  return (
    <span className="badge-local" role="status">
      <Lock size={16} strokeWidth={2.6} aria-hidden="true" />
      Recognised on this phone only
    </span>
  );
}

export function Avatar({ src, name, large = false }: { src?: string; name: string; large?: boolean }) {
  const cls = `avatar${large ? ' avatar--lg' : ''}`;
  if (src) return <img className={cls} src={src} alt="" width={large ? 120 : 64} height={large ? 120 : 64} />;
  return (
    <span className={`${cls} avatar--initial`} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/* ---------- Toasts: failures and effects the screen cannot show ---------- */

let toastMessage: { id: number; text: string } | null = null;
const toastListeners = new Set<() => void>();
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(text: string, ms = 4200): void {
  toastMessage = { id: Date.now(), text };
  toastListeners.forEach((l) => l());
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage = null;
    toastListeners.forEach((l) => l());
  }, ms);
}

function subscribeToast(l: () => void) {
  toastListeners.add(l);
  return () => toastListeners.delete(l);
}

export function Toaster() {
  const message = useSyncExternalStore(subscribeToast, () => toastMessage, () => toastMessage);
  return (
    <div className="toasts" aria-live="polite" role="status">
      {message && (
        <div className="toast" key={message.id}>
          {message.text}
        </div>
      )}
    </div>
  );
}

/* ---------- Confirm sheet (a native dialog: focus trap and Escape for free) ---------- */

export function ConfirmSheet({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
    >
      <div className="sheet__body">
        <h2 id="sheet-title">{title}</h2>
        <div className="muted">{children}</div>
        <button type="button" className="btn btn--block btn--quiet" onClick={onCancel} autoFocus>
          Keep everything
        </button>
        <button type="button" className={`btn btn--block ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

/* ---------- Form controls ---------- */

export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button type="button" id={id} role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            const i = options.findIndex((x) => x.value === value);
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') onChange(options[(i + 1) % options.length].value);
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') onChange(options[(i - 1 + options.length) % options.length].value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A machined fader over a native range input (keyboard and screen readers for free). */
export function Fader({
  id,
  value,
  min,
  max,
  step,
  onChange,
  valueText,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  valueText: string;
}) {
  const level = `${((value - min) / (max - min)) * 100}%`;
  return (
    <input
      id={id}
      className="fader"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-valuetext={valueText}
      style={{ ['--level' as string]: level }}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function EmptyState({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <section className="empty" aria-label={title}>
      <HaloMark size={40} />
      <h2>{title}</h2>
      <p>{children}</p>
      <div className="empty__actions">{actions}</div>
    </section>
  );
}

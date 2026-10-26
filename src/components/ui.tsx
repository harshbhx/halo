import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ChevronLeft, Ear, Lock, Settings as SettingsIcon, UsersRound } from 'lucide-react';
import { navigate, type Route } from '../lib/router';
import { unlockAudio } from '../lib/voice';

export function Brand() {
  return (
    <span className="brand">
      <span className="brand__mark" aria-hidden="true">
        <Ear size={18} strokeWidth={2.4} />
      </span>
      Face Whisper
    </span>
  );
}

export function BackButton({ to = '/', label = 'Back' }: { to?: string; label?: string }) {
  return (
    <button type="button" className="icon-btn" onClick={() => navigate(to)} aria-label={label}>
      <ChevronLeft size={26} aria-hidden="true" />
    </button>
  );
}

export function BottomBar({ route }: { route: Route }) {
  const isPeople = route.name === 'home' || route.name === 'person';
  return (
    <nav className="bottom-bar" aria-label="Main">
      <button
        type="button"
        className="bar-item"
        aria-current={isPeople ? 'page' : undefined}
        onClick={() => navigate('/')}
      >
        <UsersRound size={26} aria-hidden="true" />
        People
      </button>
      <button
        type="button"
        className="bar-whisper"
        onClick={() => {
          unlockAudio();
          navigate('/whisper');
        }}
        aria-label="Start Whisper mode"
      >
        <Ear size={30} strokeWidth={2.2} aria-hidden="true" />
        <span aria-hidden="true">Whisper</span>
      </button>
      <button
        type="button"
        className="bar-item"
        aria-current={route.name === 'settings' || route.name === 'privacy' ? 'page' : undefined}
        onClick={() => navigate('/settings')}
      >
        <SettingsIcon size={26} aria-hidden="true" />
        Settings
      </button>
    </nav>
  );
}

export function PrivacyBadge() {
  return (
    <span className="privacy-badge glass" role="status">
      <Lock size={16} strokeWidth={2.6} aria-hidden="true" />
      Recognised on this phone only
    </span>
  );
}

export function Avatar({ src, name, large = false }: { src?: string; name: string; large?: boolean }) {
  const cls = `avatar${large ? ' avatar--lg' : ''}`;
  if (src) return <img className={cls} src={src} alt="" />;
  return (
    <span className={`${cls} avatar--fallback`} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/* ---------- Toasts ---------- */

let toastMessage: { id: number; text: string } | null = null;
const toastListeners = new Set<() => void>();
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(text: string, ms = 3200): void {
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
    <div className="toast-wrap" aria-live="polite" role="status">
      {message && (
        <div className="toast" key={message.id}>
          {message.text}
        </div>
      )}
    </div>
  );
}

/* ---------- Confirm sheet (native <dialog>: focus trap and Escape for free) ---------- */

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
        <h2 id="sheet-title" className="sheet__title">
          {title}
        </h2>
        <div className="muted">{children}</div>
        <button type="button" className={`btn btn--block btn--lg ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="btn btn--block btn--ghost" onClick={onCancel} autoFocus>
          Cancel
        </button>
      </div>
    </dialog>
  );
}

/** Announces route changes to screen readers and moves focus to the new heading. */
export function useFocusHeading(dep: unknown) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [dep]);
  return ref;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/* ---------- Form controls ---------- */

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    />
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
    <div className="segmented" role="radiogroup" aria-label={label}>
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

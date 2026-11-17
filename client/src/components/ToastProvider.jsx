import { useSyncExternalStore } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

/**
 * Toasts live in a tiny module-level store rather than component state, so any
 * component can raise a notification and the rendered container always matches
 * the latest list.
 */
let toasts = [];
let counter = 0;
const listeners = new Set();
const timers = new Map();

function emit() {
  for (const listener of listeners) listener();
}

function dismissToast(id) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

function pushToast(message, type = 'info', duration = 4200) {
  counter += 1;
  const id = counter;
  toasts = [...toasts.slice(-3), { id, message, type }];
  emit();
  if (duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), duration)
    );
  }
  return id;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

const toastApi = {
  success: (message, options) => pushToast(message, 'success', options?.duration),
  error: (message, options) => pushToast(message, 'error', options?.duration ?? 6000),
  info: (message, options) => pushToast(message, 'info', options?.duration),
  dismiss: dismissToast,
};

const TONES = {
  success: { icon: CheckCircle2, className: 'border-forest-200 bg-white text-forest-800' },
  error: { icon: AlertCircle, className: 'border-red-200 bg-white text-red-700' },
  info: { icon: Info, className: 'border-line bg-white text-ink' },
};

/** No provider is required, but keeping the wrapper avoids touching call sites. */
export function ToastProvider({ children }) {
  return children;
}

export function ToastContainer() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[900] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {items.map((toast) => {
        const tone = TONES[toast.type] || TONES.info;
        const Icon = tone.icon;
        return (
          <div
            key={toast.id}
            className={`toast pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lift ${tone.className}`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="flex-1 leading-relaxed">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded-md p-0.5 text-muted hover:bg-canvas hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function useToast() {
  return toastApi;
}

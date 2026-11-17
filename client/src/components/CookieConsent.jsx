import { useCallback, useEffect, useState } from 'react';
import { Cookie, Settings2 } from 'lucide-react';
import { readConsent, saveConsent } from '../lib/consent';

export default function CookieConsent() {
  const [consent, setConsent] = useState(() => readConsent());
  const [panelOpen, setPanelOpen] = useState(false);
  const [analytics, setAnalytics] = useState(() => readConsent()?.analytics ?? false);

  const openPanel = useCallback(() => {
    setAnalytics(readConsent()?.analytics ?? false);
    setPanelOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener('caa:open-consent', openPanel);
    return () => window.removeEventListener('caa:open-consent', openPanel);
  }, [openPanel]);

  function decide(allowsAnalytics) {
    const next = saveConsent({ analytics: allowsAnalytics });
    setConsent(next);
    setAnalytics(next.analytics);
    setPanelOpen(false);
  }

  const visible = panelOpen || !consent;
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[800] px-3 pb-3 sm:px-5 sm:pb-5">
      <div
        className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-4 shadow-lift sm:p-5"
        role="dialog"
        aria-label="Cookie preferences"
        aria-modal="false"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-leaf text-forest-700">
            <Cookie className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-ink">Cookies on this site</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              We use one strictly necessary cookie to keep you signed in. Optional analytics cookies
              are off unless you turn them on, and no advertising or cross-site trackers are used.
            </p>

            {panelOpen ? (
              <div className="mt-3 space-y-2 rounded-xl bg-canvas p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-ink">Strictly necessary</p>
                    <p className="text-[11px] text-muted">Session cookie (ca_token). Always on.</p>
                  </div>
                  <span className="rounded-full bg-leaf px-2 py-0.5 text-[10px] font-semibold text-forest-700">
                    Always on
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3 border-t border-line pt-2">
                  <div>
                    <p className="text-xs font-semibold text-ink">Analytics</p>
                    <p className="text-[11px] text-muted">
                      Anonymous usage events that help improve the tools.
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-line text-forest-600 focus:ring-forest-300"
                      checked={analytics}
                      onChange={(event) => setAnalytics(event.target.checked)}
                    />
                    Allow
                  </label>
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => decide(true)} className="btn-primary btn-sm">
                Accept all
              </button>
              <button type="button" onClick={() => decide(false)} className="btn-outline btn-sm">
                Necessary only
              </button>
              <button
                type="button"
                onClick={() => (panelOpen ? decide(analytics) : openPanel())}
                className="btn-ghost btn-sm"
              >
                <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                {panelOpen ? 'Save preferences' : 'Preferences'}
              </button>
              {consent ? (
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="btn-ghost btn-sm ml-auto"
                >
                  Close
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

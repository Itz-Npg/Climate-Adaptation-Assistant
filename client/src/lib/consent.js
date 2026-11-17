const CONSENT_KEY = 'caa:consent';
const CONSENT_EVENT = 'caa:consent-changed';

export const DEFAULT_CONSENT = { necessary: true, analytics: false, updatedAt: null };

export function readConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return null;
  }
}

export function saveConsent(consent) {
  const value = {
    necessary: true,
    analytics: Boolean(consent.analytics),
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  } catch {
    /* storage can be blocked by the browser; consent simply stays unset */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  return value;
}

export function hasAnalyticsConsent() {
  return Boolean(readConsent()?.analytics);
}

/** Open the consent preferences panel from anywhere (e.g. the footer link). */
export function openConsentPreferences() {
  window.dispatchEvent(new CustomEvent('caa:open-consent'));
}

export { CONSENT_KEY, CONSENT_EVENT };

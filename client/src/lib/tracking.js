import { hasAnalyticsConsent } from './consent';

/**
 * Conversion / product event tracking.
 *
 * Events are pushed onto a dataLayer and to gtag when an analytics provider is
 * present; nothing is sent anywhere else and analytics events are only emitted
 * when the visitor has allowed analytics cookies.
 */
export function trackEvent(name, properties = {}) {
  const payload = { event: name, ...properties, timestamp: new Date().toISOString() };

  if (typeof window === 'undefined') return payload;

  window.dataLayer = window.dataLayer || [];

  if (!hasAnalyticsConsent()) {
    if (import.meta.env.DEV) console.debug('[track:consent-pending]', name, properties);
    return payload;
  }

  window.dataLayer.push(payload);

  if (typeof window.gtag === 'function') {
    window.gtag('event', name, properties);
  }
  if (import.meta.env.DEV) console.debug('[track]', name, properties);

  return payload;
}

export const events = {
  signup: (props) => trackEvent('sign_up', props),
  login: (props) => trackEvent('login', props),
  riskAssessed: (props) => trackEvent('risk_assessed', props),
  planCreated: (props) => trackEvent('plan_created', props),
  comparisonCreated: (props) => trackEvent('comparison_created', props),
  mapSearched: (props) => trackEvent('map_searched', props),
};

// frontend/src/lib/analytics.js
// Vendor-neutral, privacy-first analytics shim.
//
// It only does anything if an analytics provider is actually loaded:
//  - Plausible: set VITE_PLAUSIBLE_DOMAIN and uncomment the script in index.html
//  - or assign any `window.track`-compatible collector.
// Until then every call here is a safe no-op — so we can instrument the funnel
// now and flip analytics on later without touching call sites.
//
// Funnel events to standardise on:
//   signup · search_started · results_viewed · trip_saved ·
//   checkout_started · checkout_completed · invitation_sent · invitation_accepted

export function track(event, props = {}) {
  try {
    if (typeof window === 'undefined') return;
    // Plausible custom events: window.plausible(name, { props })
    if (typeof window.plausible === 'function') {
      window.plausible(event, { props });
      return;
    }
    // PostHog (if later added): window.posthog.capture(name, props)
    if (window.posthog?.capture) {
      window.posthog.capture(event, props);
      return;
    }
    if (import.meta.env.DEV) {
      console.debug('[analytics:noop]', event, props);
    }
  } catch {
    /* analytics must never break the app */
  }
}

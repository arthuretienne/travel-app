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
//   signup · hero_search_submitted · onboarding_started/completed/skipped ·
//   search_started · search_failed · search_no_results · search_timeout ·
//   results_viewed · trip_saved · pricing_viewed · paywall_viewed ·
//   checkout_started · checkout_completed · trip_pass_purchased ·
//   invitation_sent · invite_landing_viewed · invitation_accepted

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

// frontend/src/lib/devAuth.js
// DEV-ONLY persona impersonation for local testing.
// Lets you browse protected pages as a seeded user WITHOUT a Clerk login, by
// sending `Authorization: Bearer dev:<userId>` to the API. Active only when
// import.meta.env.DEV is true (Vite dev server). It is a no-op in production builds.

const KEY = 'devUser';

export const DEV_AUTH_ACTIVE = import.meta.env.DEV;

/** Returns the impersonated user id, or null. */
export function getDevUserId() {
  if (!DEV_AUTH_ACTIVE) return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id || null;
  } catch {
    return null;
  }
}

export function getDevUser() {
  if (!DEV_AUTH_ACTIVE) return null;
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

export function isDevImpersonating() {
  return !!getDevUserId();
}

export function setDevUser(user) {
  if (!DEV_AUTH_ACTIVE || !user?.id) return;
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearDevUser() {
  localStorage.removeItem(KEY);
}

/**
 * On boot, read `?devUser=<id>` (and optional &devName=) from the URL.
 * `?devUser=clear` wipes the persona. The param is then stripped from the URL.
 */
export function initDevAuthFromUrl() {
  if (!DEV_AUTH_ACTIVE) return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('devUser')) return;

  const id = params.get('devUser');
  if (id === 'clear' || id === '') {
    clearDevUser();
  } else {
    const name = params.get('devName') || undefined;
    setDevUser({ id, firstName: name });
  }

  // Strip dev params from the visible URL without a reload
  params.delete('devUser');
  params.delete('devName');
  const qs = params.toString();
  const url = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
  window.history.replaceState({}, '', url);
}

/**
 * Patch window.fetch so API requests carry the dev impersonation token.
 * Only rewrites same-origin-app requests to the configured API base.
 */
export function installDevFetchShim() {
  if (!DEV_AUTH_ACTIVE || window.__devFetchShimInstalled) return;
  window.__devFetchShimInstalled = true;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const devId = getDevUserId();
    if (!devId) return originalFetch(input, init);

    const url = typeof input === 'string' ? input : input?.url || '';
    const targetsApi = url.startsWith(API_URL) || url.startsWith('/api');
    if (!targetsApi) return originalFetch(input, init);

    // Merge headers from both Request object and init, then override auth.
    const headers = new Headers(
      (typeof input !== 'string' && input?.headers) || init.headers || {}
    );
    headers.set('Authorization', `Bearer dev:${devId}`);

    if (typeof input !== 'string') {
      // input is a Request — rebuild with new headers
      return originalFetch(new Request(input, { headers }), init);
    }
    return originalFetch(input, { ...init, headers });
  };
}

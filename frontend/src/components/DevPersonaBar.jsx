// frontend/src/components/DevPersonaBar.jsx
// DEV-ONLY floating persona switcher. Lets you browse the app as any seeded
// `@skusku-test.dev` user without a Clerk login. Renders nothing in production
// (App.jsx only mounts it when DEV_AUTH_ACTIVE).
import { useEffect, useState } from 'react';
import {
  DEV_AUTH_ACTIVE,
  getDevUser,
  setDevUser,
  clearDevUser,
} from '../lib/devAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function DevPersonaBar() {
  const [open, setOpen] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const current = getDevUser();

  useEffect(() => {
    if (!DEV_AUTH_ACTIVE || !open || personas.length) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/dev/personas`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setPersonas(data.personas || []);
        setTrips(data.trips || []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Échec du chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, personas.length]);

  if (!DEV_AUTH_ACTIVE) return null;

  const impersonate = (p) => {
    setDevUser({ id: p.id, firstName: p.firstName, lastName: p.lastName });
    // Land on the persona's first trip if they have one, else dashboard.
    const firstTrip = p.memberships?.[0]?.tripId;
    window.location.assign(firstTrip ? `/trips/${firstTrip}` : '/dashboard');
  };

  const stop = () => {
    clearDevUser();
    window.location.assign('/');
  };

  const initials = (p) =>
    `${(p.firstName || '?')[0] || ''}${(p.lastName || '')[0] || ''}`.toUpperCase();

  return (
    <div className="fixed bottom-3 left-3 z-[9999] font-sans text-sm">
      {open ? (
        <div className="w-80 overflow-hidden rounded-[14px] border border-sand-200 bg-white shadow-3">
          <div className="flex items-center justify-between bg-sand-900 px-4 py-2.5 text-white">
            <span className="font-mono text-xs uppercase tracking-wide">
              🧪 Dev · Personas
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 transition hover:text-white"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          {current?.id && (
            <div className="flex items-center justify-between border-b border-sand-200 bg-sand-50 px-4 py-2">
              <span className="text-text-secondary">
                Connecté&nbsp;:{' '}
                <span className="font-medium text-text-main">
                  {current.firstName || current.id}
                </span>
              </span>
              <button
                onClick={stop}
                className="font-mono text-xs text-clay-500 transition hover:underline"
              >
                Quitter
              </button>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="px-4 py-6 text-center text-text-muted">
                Chargement…
              </div>
            )}
            {error && (
              <div className="px-4 py-6 text-center text-clay-500">
                {error}
                <div className="mt-1 text-xs text-text-light">
                  Backend lancé en DEV_MODE&nbsp;?
                </div>
              </div>
            )}
            {!loading && !error && personas.length === 0 && (
              <div className="px-4 py-6 text-center text-text-muted">
                Aucune persona seedée.
              </div>
            )}
            {personas.map((p) => {
              const active = current?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => impersonate(p)}
                  className={`flex w-full items-center gap-3 border-b border-sand-100 px-4 py-2.5 text-left transition hover:bg-sand-50 ${
                    active ? 'bg-sand-50' : 'bg-white'
                  }`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                    {initials(p)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-text-main">
                      {p.firstName} {p.lastName}
                      {active && (
                        <span className="ml-1 text-xs text-moss-700">●</span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-text-light">
                      {p.memberships?.length
                        ? p.memberships
                            .map((m) => `${m.tripName} · ${m.role}`)
                            .join('  |  ')
                        : 'Aucun voyage'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {trips.length > 0 && (
            <div className="border-t border-sand-200 bg-sand-50 px-4 py-2 text-xs text-text-light">
              {trips.length} voyage(s) seedé(s)
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-sand-900 px-4 py-2 font-mono text-xs text-white shadow-3 transition hover:bg-sand-800"
        >
          🧪 {current?.firstName ? `Dev · ${current.firstName}` : 'Dev personas'}
        </button>
      )}
    </div>
  );
}

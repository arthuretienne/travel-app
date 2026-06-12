import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { Logo } from '../ui';
import { MEGA_MENU, MENU_PHOTO } from '../../data/megaMenu';
import { formatEUR } from '../../utils/format';

/* ---------- Sub-link row inside a column ---------- */
function SubLink({ item, withPrice }) {
  return (
    <Link
      to={item.href}
      className="group -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-[7px] text-sm leading-snug text-text-main transition-colors hover:bg-sand-50 hover:text-ember-700"
    >
      <span>{item.label}</span>
      {withPrice && item.from && (
        <span className="font-mono text-xs font-medium text-text-secondary tabular-nums group-hover:text-ember-700">
          dès {formatEUR(item.from)}
        </span>
      )}
    </Link>
  );
}

function ColHeader({ title, kicker }) {
  return (
    <div className="mb-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
        {title}
      </div>
      {kicker && <div className="mt-1 text-xs leading-snug text-text-light">{kicker}</div>}
    </div>
  );
}

/* ---------- Right-hand editorial feature card ---------- */
function FeatureCard({ feature }) {
  return (
    <Link
      to={feature.href}
      className="block self-start overflow-hidden rounded-[14px] border border-sand-200 bg-white shadow-1 transition-shadow hover:shadow-2"
    >
      <div
        className="aspect-[4/2.5] bg-sand-300 bg-cover bg-center"
        style={{ backgroundImage: `url(${MENU_PHOTO[feature.photo]})` }}
      />
      <div className="p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">
          {feature.eyebrow}
        </div>
        <div className="mt-1.5 font-display text-xl font-medium leading-tight text-text-main">
          {feature.title}
        </div>
        <div className="mt-1.5 text-[13px] leading-normal text-text-secondary">{feature.sub}</div>
        <div className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-ember-700">
          {feature.cta} <ArrowRight size={14} />
        </div>
      </div>
    </Link>
  );
}

/* ---------- Panel footer (secondary link + Esc hint) ---------- */
function PanelFooter({ entry }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-b-[18px] border-t border-sand-200 bg-sand-50 px-8 py-3">
      <Link
        to={entry.secondary.href}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-ember-700"
      >
        {entry.secondary.label}
        <ArrowRight size={14} />
      </Link>
      <div className="font-mono text-xs text-text-light">
        <kbd className="rounded border border-sand-200 bg-white px-1.5 py-px text-[11px]">Esc</kbd>{' '}
        pour fermer
      </div>
    </div>
  );
}

function PanelAccroche({ entry }) {
  return (
    <p className="max-w-[640px] px-8 pt-5 text-[13.5px] leading-normal text-text-secondary">
      {entry.accroche}
    </p>
  );
}

/* ---------- Per-entry panel bodies ---------- */
function PanelDestinations({ entry }) {
  return (
    <>
      <PanelAccroche entry={entry} />
      <div className="grid grid-cols-[1fr_1.1fr_0.95fr] gap-9 px-8 pb-6 pt-7">
        <div>
          <ColHeader title={entry.columns[0].title} kicker={entry.columns[0].kicker} />
          <div className="grid gap-0.5">
            {entry.columns[0].items.map((it) => (
              <SubLink key={it.href} item={it} />
            ))}
          </div>
        </div>
        <div>
          <ColHeader title={entry.columns[1].title} kicker={entry.columns[1].kicker} />
          <div className="grid grid-cols-2 gap-2.5">
            {entry.columns[1].items.map((it) => (
              <Link
                key={it.href}
                to={it.href}
                className="relative block aspect-[4/3] overflow-hidden rounded-xl shadow-1"
                style={{
                  backgroundImage: `url(${MENU_PHOTO[it.photo]})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <span className="absolute inset-0 bg-gradient-to-t from-sand-900/60 to-transparent" />
                <span className="absolute inset-x-2.5 bottom-2 flex items-end justify-between text-white">
                  <span>
                    <span className="block font-display text-[17px] font-medium leading-tight">
                      {it.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] opacity-85">{it.country}</span>
                  </span>
                  <span className="font-mono text-[11px] opacity-95">{formatEUR(it.from)}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
        <FeatureCard feature={entry.feature} />
      </div>
      <PanelFooter entry={entry} />
    </>
  );
}

function renderPanel(entry) {
  switch (entry.id) {
    case 'destinations':
      return <PanelDestinations entry={entry} />;
    default:
      return null;
  }
}

/* ---------- Mobile drawer section ---------- */
function MobileSection({ entry }) {
  return (
    <div className="pb-3.5">
      <p className="mb-2.5 px-1 text-[12.5px] leading-normal text-text-light">{entry.accroche}</p>

      {entry.columns?.map((col) => (
        <div key={col.title} className="mb-3.5">
          <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-light">
            {col.title}
          </div>
          {col.items.map((it) => (
            <Link
              key={it.href}
              to={it.href}
              className="flex items-center justify-between border-b border-sand-100 px-1 py-[11px] text-sm text-text-main"
            >
              <span>{it.label}</span>
              {it.from && (
                <span className="font-mono text-xs text-text-light">dès {formatEUR(it.from)}</span>
              )}
            </Link>
          ))}
        </div>
      ))}

      {entry.feature && (
        <Link
          to={entry.feature.href}
          className="flex items-center gap-3 rounded-xl border border-sand-200 bg-white p-2.5"
        >
          <span
            className="h-14 w-14 flex-shrink-0 rounded-[10px] bg-cover bg-center"
            style={{ backgroundImage: `url(${MENU_PHOTO[entry.feature.photo]})` }}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-ember-700">
              {entry.feature.eyebrow}
            </span>
            <span className="mt-0.5 block text-sm font-medium leading-snug text-text-main">
              {entry.feature.title}
            </span>
          </span>
          <ArrowRight size={14} className="text-text-light" />
        </Link>
      )}
    </div>
  );
}

/**
 * Skusku desktop mega menu + mobile drawer.
 *
 * @param {React.ReactNode} actions     Right-side cluster on desktop (language switcher,
 *                                       auth buttons, persistent CTA) — owned by the caller.
 * @param {React.ReactNode} mobileCta   Sticky button at the bottom of the mobile drawer.
 * @param {React.ReactNode} mobileFooter Auth row shown above the sticky CTA in the drawer.
 */
export default function MegaMenu({ actions, mobileCta, mobileFooter }) {
  const [open, setOpen] = useState(null); // desktop: open entry id
  const [hoverId, setHoverId] = useState(null);
  const [drawer, setDrawer] = useState(false); // mobile drawer
  const [expanded, setExpanded] = useState(null); // mobile accordion
  const closeTimer = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(null);
        setDrawer(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawer]);

  const handleEnter = (entry) => {
    clearTimeout(closeTimer.current);
    setHoverId(entry.id);
    if (!entry.simple) setOpen(entry.id);
  };
  const handleLeaveNav = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 140);
  };
  const activeEntry = MEGA_MENU.find((m) => m.id === open);

  return (
    <div className="relative" onMouseLeave={handleLeaveNav}>
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-sand-200 bg-surface-subtle/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center px-5 md:px-8">
          <Link to="/" aria-label="Skusku — accueil" className="shrink-0">
            <Logo size={30} />
          </Link>

          {/* Desktop entries */}
          <div className="ml-7 hidden shrink-0 items-center gap-0.5 xl:flex">
            {MEGA_MENU.map((entry) => {
              const isOpen = open === entry.id;
              const isHover = hoverId === entry.id;
              if (entry.simple) {
                return (
                  <Link
                    key={entry.id}
                    to={entry.href}
                    onMouseEnter={() => handleEnter(entry)}
                    className="inline-flex h-9 items-center whitespace-nowrap rounded-[10px] px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-sand-100 hover:text-text-main"
                  >
                    {entry.label}
                  </Link>
                );
              }
              return (
                // Survol = panneau, clic = navigation vers la page d'index de
                // l'entrée. L'ancien clic-toggle refermait le panneau ouvert au
                // survol — pattern déroutant relevé par l'audit V3.
                <Link
                  key={entry.id}
                  to={entry.href}
                  onMouseEnter={() => handleEnter(entry)}
                  onClick={() => setOpen(null)}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  className={[
                    'inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-[10px] px-3 text-sm font-medium transition-colors',
                    isOpen
                      ? 'bg-sand-100 text-text-main'
                      : isHover
                        ? 'text-text-main'
                        : 'text-text-secondary hover:text-text-main',
                  ].join(' ')}
                >
                  {entry.label}
                  <ChevronDown
                    size={14}
                    className={[
                      'transition-transform duration-200',
                      isOpen ? 'rotate-180' : 'rotate-0',
                    ].join(' ')}
                  />
                </Link>
              );
            })}
          </div>

          <div className="flex-1" />

          {/* Right-side actions (desktop) */}
          <div className="hidden shrink-0 items-center gap-2 xl:flex">{actions}</div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={drawer ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => {
              setDrawer((v) => !v);
              setExpanded(null);
            }}
            className="ml-auto grid h-10 w-10 place-items-center rounded-[10px] border border-sand-200 bg-white text-text-main xl:hidden"
          >
            {drawer ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Desktop panel */}
      <div
        className="pointer-events-none fixed inset-x-0 top-16 z-40"
        onMouseEnter={() => clearTimeout(closeTimer.current)}
      >
        {activeEntry && (
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(null)}
            className="fixed inset-x-0 bottom-0 top-16 -z-10 cursor-default bg-sand-900/[0.18]"
          />
        )}
        <div
          className={[
            'mx-auto max-w-6xl origin-top rounded-b-[18px] border-b border-sand-200 bg-white transition-all duration-200',
            activeEntry
              ? 'pointer-events-auto translate-y-0 opacity-100 shadow-3'
              : '-translate-y-2 opacity-0',
          ].join(' ')}
        >
          {activeEntry && renderPanel(activeEntry)}
        </div>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 top-16 z-40 flex flex-col bg-white xl:hidden">
          <div className="flex-1 overflow-y-auto px-4 pb-28 pt-3">
            {MEGA_MENU.map((entry) => {
              if (entry.simple) {
                return (
                  <Link
                    key={entry.id}
                    to={entry.href}
                    onClick={() => setDrawer(false)}
                    className="flex items-center justify-between border-b border-sand-200 px-1 py-3.5 text-base font-medium text-text-main"
                  >
                    {entry.label}
                    <ChevronRight size={16} className="text-text-light" />
                  </Link>
                );
              }
              const isExp = expanded === entry.id;
              return (
                <div key={entry.id} className="border-b border-sand-200">
                  <button
                    type="button"
                    onClick={() => setExpanded(isExp ? null : entry.id)}
                    aria-expanded={isExp}
                    className="flex w-full items-center justify-between px-1 py-3.5 text-left text-base font-medium text-text-main"
                  >
                    {entry.label}
                    <ChevronRight
                      size={16}
                      className={[
                        'text-text-light transition-transform duration-200',
                        isExp ? 'rotate-90' : 'rotate-0',
                      ].join(' ')}
                    />
                  </button>
                  {isExp && <MobileSection entry={entry} />}
                </div>
              );
            })}

            {mobileFooter && <div className="mt-5 px-1">{mobileFooter}</div>}
          </div>

          <div className="absolute inset-x-0 bottom-0 border-t border-sand-200 bg-gradient-to-t from-white from-[28%] to-transparent px-4 pb-6 pt-3">
            {mobileCta}
          </div>
        </div>
      )}
    </div>
  );
}

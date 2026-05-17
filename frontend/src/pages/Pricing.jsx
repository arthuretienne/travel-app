// frontend/src/pages/Pricing.jsx
// Rebuilt from the Claude Design handoff "Pricing Page skusku".
// Desktop (≥768px) and mobile layouts mirror the design's vp branch.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  Check, ArrowRight, ChevronDown, Search, Sparkles,
  Calendar, Target, Ban, Loader2,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/* ─── Static content (FR marketing copy, from the design) ──────────────── */

const PLANS = [
  {
    id: 'free',
    plan: 'FREE',
    name: 'Free',
    tagline: 'Découvre ta prochaine destination',
    audience: "Tester l'app",
    price: { monthly: 0, annual: 0 },
    priceNote: { monthly: '0 €/mois', annual: '0 €/an' },
    cta: 'Commencer gratuitement',
    ctaSub: 'Sans carte bancaire',
    ctaVariant: 'outline',
    featured: false,
  },
  {
    id: 'starter',
    plan: 'EXPLORER',
    name: 'Starter',
    tagline: 'Planifie tous tes voyages de l’année',
    audience: 'Voyageur solo / couple occasionnel',
    price: { monthly: 3.99, annual: 29 },
    priceNote: { monthly: '/mois', annual: '/an' },
    annualPerMonth: '2,42 €/mois',
    cta: 'Choisir Starter',
    ctaSub: 'Annulable à tout moment',
    ctaVariant: 'primary',
    featured: true,
    badge: 'Le plus choisi',
  },
  {
    id: 'wanderer',
    plan: 'WANDERER',
    name: 'Wanderer',
    tagline: 'Le voyage sans limites, à plusieurs',
    audience: 'Voyageurs fréquents & groupes',
    price: { monthly: 6.99, annual: 49 },
    priceNote: { monthly: '/mois', annual: '/an' },
    annualPerMonth: '4,08 €/mois',
    cta: 'Passer à Wanderer',
    ctaSub: 'Annulable à tout moment',
    ctaVariant: 'ink',
    featured: false,
  },
];

const FEATURE_GROUPS = [
  {
    title: 'Découverte & planification',
    rows: [
      ['Recherches de destinations', '5 / mois', '40 / mois', 'Illimité*', 'Illimité (7 j)'],
      ['Itinéraire IA jour-par-jour', '1 / mois · aperçu 3 jours', 'Illimité', 'Illimité', 'Illimité'],
      ['Voyages sauvegardés', '1', 'Illimité', 'Illimité', 'Illimité'],
      ['Export PDF de l’itinéraire', false, true, true, true],
      ['Synchronisation calendrier', false, true, true, true],
    ],
  },
  {
    title: 'Suivi des prix',
    rows: [
      ['Alertes de prix', false, '3', 'Illimité', '—'],
      ['Notifications push (baisses)', false, false, true, '—'],
    ],
  },
  {
    title: 'Voyage à plusieurs',
    rows: [
      ['Voyage de groupe (vote + planif.)', false, false, true, '—'],
      ['Partage de dépenses (style Tricount)', false, false, true, '—'],
    ],
  },
  {
    title: 'Confort',
    rows: [
      ['Accès prioritaire (pas d’attente)', false, false, true, true],
    ],
  },
];

const FAQ = [
  {
    q: 'Puis-je essayer sans payer ?',
    a: 'Oui, l’offre Free est gratuite à vie, sans carte bancaire (5 recherches/mois).',
  },
  {
    q: 'Quelle différence entre Starter et Wanderer ?',
    a: 'Starter couvre tes voyages perso (recherches + itinéraires + export). Wanderer ajoute le voyage à plusieurs : planification de groupe, vote, partage des dépenses et alertes prix illimitées.',
  },
  {
    q: 'Le Trip Pass, c’est quoi ?',
    a: 'Un accès illimité de 7 jours pour 5,99 €, sans abonnement — idéal si tu planifies un seul voyage.',
  },
  {
    q: 'Pourquoi l’annuel est moins cher ?',
    a: 'L’annuel équivaut à 2 mois offerts. Tu planifies souvent tes voyages par vagues : l’annuel couvre toute l’année.',
  },
  {
    q: 'Puis-je changer d’offre ou annuler ?',
    a: 'Oui, à tout moment, en 1 clic depuis ton compte.',
  },
  {
    q: 'Que se passe-t-il si j’atteins ma limite de recherches ?',
    a: 'Tu peux attendre le mois suivant, prendre un Trip Pass, ou passer à une offre supérieure.',
  },
];

function fmtEUR(n) {
  if (n === 0) return '0';
  return (Math.round(n * 100) / 100).toString().replace('.', ',');
}

function planHighlights(id) {
  if (id === 'free') return [
    '5 recherches de destinations / mois',
    '1 itinéraire IA · aperçu 3 jours',
    '1 voyage sauvegardé',
    'Sans carte bancaire',
  ];
  if (id === 'starter') return [
    '40 recherches / mois',
    'Itinéraire IA illimité · jour-par-jour',
    'Export PDF & sync calendrier',
    '3 alertes de prix',
  ];
  if (id === 'wanderer') return [
    'Recherches & alertes illimitées',
    'Voyage de groupe : vote + planif. collab.',
    'Partage des dépenses (style Tricount)',
    'Accès prioritaire · sans attente',
  ];
  return [];
}

/* ─── Responsive hook (mirrors the design's `mobile` branch) ───────────── */

function useIsMobile(breakpoint = 768) {
  const get = () => (typeof window !== 'undefined' ? window.innerWidth < breakpoint : false);
  const [mobile, setMobile] = useState(get);
  useEffect(() => {
    const onResize = () => setMobile(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
}

/* ─── Button (matches the design system Button primitive) ──────────────── */

const BTN_VARIANTS = {
  primary: { bg: 'var(--ember-600)', fg: '#fff', shadow: 'var(--shadow-2)', hover: 'var(--ember-700)' },
  ink: { bg: 'var(--sand-900)', fg: '#fff', shadow: 'var(--shadow-2)', hover: 'var(--sand-800)' },
  outline: { bg: '#fff', fg: 'var(--sand-900)', border: '1px solid var(--sand-200)', shadow: 'none', hover: 'var(--sand-50)' },
};

function Button({ variant = 'primary', full, iconRight, disabled, onClick, children }) {
  const [hover, setHover] = useState(false);
  const v = BTN_VARIANTS[variant] || BTN_VARIANTS.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, height: 48, padding: '0 20px',
        fontSize: 16, fontWeight: 500, borderRadius: 12,
        background: disabled ? 'var(--sand-200)' : (hover ? v.hover : v.bg),
        color: disabled ? 'var(--sand-500)' : v.fg,
        border: v.border || '0',
        boxShadow: disabled ? 'none' : v.shadow,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)',
        width: full ? '100%' : undefined,
      }}
    >
      {children && <span>{children}</span>}
      {iconRight}
    </button>
  );
}

/* ─── Billing toggle ───────────────────────────────────────────────────── */

function BillingToggle({ value, onChange, mobile }) {
  const opts = [
    { id: 'monthly', label: 'Mensuel' },
    { id: 'annual', label: 'Annuel' },
  ];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: 6, background: '#fff',
      border: '1px solid var(--sand-200)', borderRadius: 999,
      boxShadow: 'var(--shadow-1)',
    }}>
      {opts.map(o => {
        const active = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            position: 'relative', border: 0, cursor: 'pointer',
            background: active ? 'var(--sand-900)' : 'transparent',
            color: active ? '#fff' : 'var(--sand-700)',
            borderRadius: 999, padding: mobile ? '8px 16px' : '10px 20px',
            fontSize: mobile ? 13 : 14, fontWeight: 500,
            transition: 'background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            {o.label}
            {o.id === 'annual' && (
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                background: active ? 'var(--ember-600)' : 'var(--ember-50)',
                color: active ? '#fff' : 'var(--ember-700)',
                padding: '3px 7px', borderRadius: 999, lineHeight: 1,
              }}>2 mois offerts</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Price block ──────────────────────────────────────────────────────── */

function PricePill({ plan, billing, mobile }) {
  const n = plan.price[billing];
  const note = plan.priceNote[billing];
  if (plan.id === 'free') {
    return (
      <div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 500,
          fontSize: mobile ? 44 : 56, lineHeight: 1, letterSpacing: '-0.02em',
          color: 'var(--sand-900)',
        }}>0 €</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--sand-500)', marginTop: 8, fontFeatureSettings: '"tnum"' }}>
          Gratuit à vie
        </div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 500,
          fontSize: mobile ? 44 : 56, lineHeight: 1, letterSpacing: '-0.02em',
          color: 'var(--sand-900)',
        }}>{fmtEUR(n)} €</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: mobile ? 14 : 15, color: 'var(--sand-500)', fontWeight: 500 }}>
          {note}
        </span>
      </div>
      {billing === 'annual' && plan.annualPerMonth && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--sand-500)', marginTop: 8, fontFeatureSettings: '"tnum"' }}>
          soit {plan.annualPerMonth}
        </div>
      )}
      {billing === 'monthly' && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--sand-500)', marginTop: 8, fontFeatureSettings: '"tnum"' }}>
          ou {fmtEUR(plan.price.annual)} €/an
        </div>
      )}
    </div>
  );
}

/* ─── Plan card ────────────────────────────────────────────────────────── */

function PlanCard({ plan, billing, mobile, isCurrent, loading, onSelect }) {
  const featured = plan.featured;
  return (
    <div style={{
      position: 'relative', background: '#fff', borderRadius: 20,
      border: featured ? '1.5px solid var(--ember-600)' : '1px solid var(--sand-200)',
      boxShadow: featured ? 'var(--shadow-3)' : 'var(--shadow-1)',
      padding: mobile ? 24 : 28,
      display: 'flex', flexDirection: 'column',
      minHeight: mobile ? 0 : 540,
      transform: featured && !mobile ? 'translateY(-12px)' : 'none',
    }}>
      {featured && (
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ember-600)', color: '#fff',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          padding: '8px 14px', borderRadius: 999, boxShadow: 'var(--shadow-2)', whiteSpace: 'nowrap',
        }}>★ {plan.badge}</div>
      )}

      {isCurrent && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: 'var(--moss-100)', color: 'var(--moss-500)',
          fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
        }}>Formule actuelle</div>
      )}

      <div>
        <h3 style={{
          margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500,
          fontSize: mobile ? 26 : 30, letterSpacing: '-0.015em', lineHeight: 1.05,
          color: 'var(--sand-900)',
        }}>{plan.name}</h3>
        <p style={{ margin: '6px 0 0', fontSize: mobile ? 13 : 14, color: 'var(--sand-500)', lineHeight: 1.45 }}>
          {plan.audience}
        </p>
      </div>

      <div style={{ height: 1, background: 'var(--sand-100)', margin: mobile ? '20px 0' : '24px 0' }} />

      <PricePill plan={plan} billing={billing} mobile={mobile} />

      <p style={{
        margin: mobile ? '20px 0 0' : '24px 0 0',
        fontFamily: 'var(--font-display)', fontStyle: 'italic',
        fontSize: mobile ? 18 : 20, lineHeight: 1.25,
        color: 'var(--ember-700)', fontWeight: 400,
        minHeight: mobile ? 0 : 50,
      }}>{plan.tagline}</p>

      <ul style={{
        listStyle: 'none', padding: 0, margin: mobile ? '20px 0 24px' : '24px 0 28px',
        display: 'flex', flexDirection: 'column', gap: 10, flex: 1,
      }}>
        {planHighlights(plan.id).map((h, i) => (
          <li key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            fontSize: mobile ? 14 : 15, color: 'var(--sand-700)', lineHeight: 1.45,
          }}>
            <span style={{
              flexShrink: 0, marginTop: 2, width: 18, height: 18, borderRadius: 999,
              background: featured ? 'var(--ember-50)' : 'var(--sand-100)',
              color: featured ? 'var(--ember-700)' : 'var(--sand-700)',
              display: 'grid', placeItems: 'center',
            }}>
              <Check size={11} strokeWidth={2.4} />
            </span>
            <span>{h}</span>
          </li>
        ))}
      </ul>

      <Button
        variant={plan.ctaVariant}
        full
        disabled={isCurrent || loading}
        onClick={() => onSelect(plan)}
        iconRight={plan.id !== 'free' && !loading ? <ArrowRight size={16} /> : undefined}
      >
        {loading ? 'Chargement…' : isCurrent ? 'Formule actuelle' : plan.cta}
      </Button>
      <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 12, color: 'var(--sand-500)' }}>
        {plan.ctaSub}
      </p>
    </div>
  );
}

/* ─── Trip Pass block ──────────────────────────────────────────────────── */

function TripPassBlock({ mobile, loading, active, expiresAt, onSelect }) {
  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : null;
  return (
    <div style={{
      background: 'var(--sand-100)', borderRadius: 20,
      border: '1px solid var(--sand-200)', padding: mobile ? 24 : 28,
      display: mobile ? 'block' : 'grid',
      gridTemplateColumns: mobile ? undefined : '1.4fr 1fr auto',
      gap: mobile ? 0 : 28, alignItems: 'center',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--ember-50)', color: 'var(--ember-700)',
            display: 'grid', placeItems: 'center',
          }}>
            <Target size={20} />
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'var(--ember-700)',
          }}>Sans abonnement</span>
          {active && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
              background: 'var(--moss-100)', color: 'var(--moss-500)',
            }}>
              Actif{expiryLabel ? ` · jusqu’au ${expiryLabel}` : ''}
            </span>
          )}
        </div>
        <h3 style={{
          margin: '14px 0 0', fontFamily: 'var(--font-display)', fontWeight: 500,
          fontSize: mobile ? 24 : 28, lineHeight: 1.1, letterSpacing: '-0.01em',
          color: 'var(--sand-900)',
        }}>
          Trip Pass — <span style={{ fontStyle: 'italic', color: 'var(--ember-700)' }}>débloque tout, le temps d’un voyage</span>
        </h3>
        <p style={{
          margin: '10px 0 0', fontSize: mobile ? 14 : 15, color: 'var(--sand-700)', lineHeight: 1.5,
          maxWidth: 460,
        }}>
          Accès illimité pendant 7 jours · paiement unique, sans abonnement.
          Idéal si tu planifies un seul voyage là, maintenant.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: mobile ? 10 : 8, margin: mobile ? '20px 0 0' : 0 }}>
        {[
          [Search, 'Recherches illimitées'],
          [Sparkles, 'Itinéraire IA illimité'],
          [Calendar, 'Sync calendrier'],
          [Target, 'Accès prioritaire'],
        ].map(([Ic, l]) => (
          <span key={l} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fff', border: '1px solid var(--sand-200)',
            borderRadius: 999, padding: '6px 10px',
            fontSize: 12, color: 'var(--sand-700)',
          }}>
            <Ic size={13} color="var(--ember-700)" />{l}
          </span>
        ))}
      </div>

      <div style={{
        marginTop: mobile ? 24 : 0,
        display: 'flex', flexDirection: 'column', alignItems: mobile ? 'stretch' : 'flex-end', gap: 12,
      }}>
        <div style={{ textAlign: mobile ? 'left' : 'right' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 500,
            fontSize: mobile ? 36 : 40, lineHeight: 1, letterSpacing: '-0.02em',
            color: 'var(--sand-900)',
          }}>5,99 €</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--sand-500)', marginTop: 6 }}>
            paiement unique · 7 jours
          </div>
        </div>
        <Button variant="ink" full={mobile} disabled={loading || active} onClick={onSelect} iconRight={!loading && !active ? <ArrowRight size={16} /> : undefined}>
          {loading ? 'Chargement…' : active ? 'Trip Pass actif' : 'Débloquer 7 jours'}
        </Button>
      </div>
    </div>
  );
}

/* ─── Reassurance band ─────────────────────────────────────────────────── */

function Reassurance({ mobile }) {
  const items = [
    [Check, 'Paiement sécurisé', 'Stripe · 3D Secure'],
    [Ban, 'Sans engagement', 'Résiliable en 1 clic'],
    [Sparkles, '2 mois offerts', 'Sur l’abonnement annuel'],
  ];
  return (
    <div style={{
      display: mobile ? 'flex' : 'grid',
      flexDirection: mobile ? 'column' : undefined,
      gridTemplateColumns: mobile ? undefined : 'repeat(3, 1fr)',
      gap: mobile ? 12 : 16,
    }}>
      {items.map(([Ic, t, s]) => (
        <div key={t} style={{
          background: '#fff', border: '1px solid var(--sand-200)',
          borderRadius: 14, padding: mobile ? 16 : 18,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--moss-100)', color: 'var(--moss-500)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <Ic size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sand-900)' }}>{t}</div>
            <div style={{ fontSize: 13, color: 'var(--sand-500)', marginTop: 2 }}>{s}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Feature matrix ───────────────────────────────────────────────────── */

function FeatureCell({ v, featured }) {
  if (v === true) return (
    <span style={{
      display: 'inline-flex', width: 22, height: 22, borderRadius: 999,
      background: featured ? 'var(--ember-50)' : 'var(--sand-100)',
      color: featured ? 'var(--ember-700)' : 'var(--sand-700)',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Check size={13} strokeWidth={2.4} />
    </span>
  );
  if (v === false) return <span style={{ color: 'var(--sand-300)', fontSize: 16, fontWeight: 500 }}>—</span>;
  const looksNumeric = /\d/.test(v);
  return (
    <span style={{
      fontFamily: looksNumeric ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: 13, fontWeight: 500,
      color: featured ? 'var(--ember-800)' : 'var(--sand-700)',
      fontFeatureSettings: '"tnum"',
    }}>{v}</span>
  );
}

function FeatureMatrixDesktop() {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--sand-200)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr)',
        padding: '20px 24px', alignItems: 'center',
        background: 'var(--sand-50)', borderBottom: '1px solid var(--sand-200)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--sand-500)' }}>
          Comparer les offres
        </div>
        {['Free', 'Starter', 'Wanderer', 'Trip Pass'].map((n, i) => (
          <div key={n} style={{
            textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 18,
            color: i === 1 ? 'var(--ember-700)' : 'var(--sand-900)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {i === 1 && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ember-600)' }} />}
            {n}
          </div>
        ))}
      </div>

      {FEATURE_GROUPS.map(group => (
        <div key={group.title}>
          <div style={{ padding: '18px 24px 8px', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ember-700)' }}>
            {group.title}
          </div>
          {group.rows.map((row, ri) => (
            <div key={ri} style={{
              display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr)',
              padding: '14px 24px', alignItems: 'center', borderTop: '1px solid var(--sand-100)',
            }}>
              <div style={{ fontSize: 14, color: 'var(--sand-900)', fontWeight: 500 }}>{row[0]}</div>
              {[1, 2, 3, 4].map(ci => (
                <div key={ci} style={{
                  textAlign: 'center', background: ci === 2 ? 'var(--ember-50)' : 'transparent',
                  padding: '8px 0', borderRadius: 8,
                }}>
                  <FeatureCell v={row[ci]} featured={ci === 2} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      <div style={{ padding: '14px 24px', fontSize: 12, color: 'var(--sand-500)', borderTop: '1px solid var(--sand-100)', background: 'var(--sand-50)' }}>
        * Usage équitable.
      </div>
    </div>
  );
}

function FeatureMatrixMobile() {
  const [plan, setPlan] = useState('starter');
  const colIndex = { free: 1, starter: 2, wanderer: 3, trippass: 4 }[plan];
  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
        background: 'var(--sand-100)', borderRadius: 999, padding: 4, marginBottom: 20,
      }}>
        {[['free', 'Free'], ['starter', 'Starter'], ['wanderer', 'Wanderer'], ['trippass', 'Trip Pass']].map(([k, l]) => {
          const active = plan === k;
          return (
            <button key={k} onClick={() => setPlan(k)} style={{
              border: 0, cursor: 'pointer',
              background: active ? '#fff' : 'transparent',
              color: active ? 'var(--sand-900)' : 'var(--sand-500)',
              borderRadius: 999, padding: '8px 0', fontSize: 12, fontWeight: 600,
              boxShadow: active ? 'var(--shadow-1)' : 'none',
            }}>{l}</button>
          );
        })}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--sand-200)', borderRadius: 16, overflow: 'hidden' }}>
        {FEATURE_GROUPS.map(group => (
          <div key={group.title}>
            <div style={{
              padding: '14px 18px 6px', fontSize: 10, fontWeight: 600, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: 'var(--ember-700)', background: 'var(--sand-50)',
            }}>{group.title}</div>
            {group.rows.map((row, ri) => (
              <div key={ri} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderTop: '1px solid var(--sand-100)', gap: 12,
              }}>
                <span style={{ fontSize: 13, color: 'var(--sand-900)', flex: 1 }}>{row[0]}</span>
                <span style={{ flexShrink: 0 }}>
                  <FeatureCell v={row[colIndex]} featured={plan === 'starter'} />
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: 'var(--sand-500)', margin: '12px 4px 0' }}>* Usage équitable.</p>
    </div>
  );
}

/* ─── FAQ accordion ────────────────────────────────────────────────────── */

function FAQAccordion({ mobile }) {
  const [open, setOpen] = useState(0);
  return (
    <div style={{ background: '#fff', border: '1px solid var(--sand-200)', borderRadius: mobile ? 16 : 20, overflow: 'hidden' }}>
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} style={{ borderTop: i === 0 ? 0 : '1px solid var(--sand-100)' }}>
            <button onClick={() => setOpen(isOpen ? -1 : i)} style={{
              width: '100%', border: 0, background: 'transparent', cursor: 'pointer',
              padding: mobile ? '18px 18px' : '22px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, textAlign: 'left',
            }}>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: mobile ? 15 : 17,
                fontWeight: 500, color: 'var(--sand-900)', lineHeight: 1.4,
              }}>{item.q}</span>
              <span style={{
                width: 28, height: 28, borderRadius: 999,
                background: isOpen ? 'var(--ember-600)' : 'var(--sand-100)',
                color: isOpen ? '#fff' : 'var(--sand-700)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
                transform: isOpen ? 'rotate(180deg)' : 'none',
                transition: 'all var(--dur-base) var(--ease-out)',
              }}>
                <ChevronDown size={15} />
              </span>
            </button>
            {isOpen && (
              <div style={{
                padding: mobile ? '0 18px 20px' : '0 24px 24px',
                fontSize: mobile ? 14 : 15, lineHeight: 1.6,
                color: 'var(--sand-700)', maxWidth: 720,
              }}>{item.a}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────────────── */

function Hero({ billing, setBilling, mobile }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'var(--ember-50)', color: 'var(--ember-700)',
        padding: '6px 14px', borderRadius: 999,
        fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ember-600)' }} />
        Tarifs · sans engagement
      </span>
      <h1 style={{
        margin: mobile ? '18px 0 0' : '22px 0 0',
        fontFamily: 'var(--font-display)', fontWeight: 500,
        fontSize: mobile ? 38 : 56, lineHeight: 1.04, letterSpacing: '-0.018em',
        color: 'var(--sand-900)', textWrap: 'pretty',
      }}>
        Trouve, planifie et réserve ton prochain voyage —{' '}
        <span style={{ fontStyle: 'italic', color: 'var(--ember-700)' }}>sans prise de tête</span>
      </h1>
      <p style={{
        margin: mobile ? '16px auto 0' : '20px auto 0',
        fontSize: mobile ? 16 : 18, lineHeight: 1.55, color: 'var(--sand-700)', maxWidth: 560,
      }}>
        Commence gratuitement. Passe au premium quand tu veux aller plus loin.
      </p>
      <div style={{ marginTop: mobile ? 24 : 32, display: 'flex', justifyContent: 'center' }}>
        <BillingToggle value={billing} onChange={setBilling} mobile={mobile} />
      </div>
    </div>
  );
}

/* ─── Final CTA ────────────────────────────────────────────────────────── */

function FinalCTA({ mobile, onStart }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'var(--sand-900)', borderRadius: mobile ? 20 : 28,
      color: '#fff', padding: mobile ? '48px 24px' : '64px 40px',
      textAlign: 'center', boxShadow: 'var(--shadow-3)',
    }}>
      <div style={{
        pointerEvents: 'none', position: 'absolute',
        left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: mobile ? 380 : 600, height: mobile ? 380 : 600,
        background: 'radial-gradient(circle, rgba(164,77,48,0.55) 0%, rgba(164,77,48,0) 65%)',
      }} />
      <span style={{
        position: 'relative', display: 'inline-flex',
        fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: 'var(--ember-300)',
      }}>3 minutes · gratuit · sans carte</span>
      <h2 style={{
        position: 'relative', margin: '14px 0 0',
        fontFamily: 'var(--font-display)', fontWeight: 500,
        fontSize: mobile ? 32 : 44, lineHeight: 1.08, letterSpacing: '-0.015em',
      }}>
        Prêt à composer{' '}
        <span style={{ fontStyle: 'italic', color: 'var(--ember-300)' }}>ton prochain voyage&nbsp;?</span>
      </h2>
      <div style={{ position: 'relative', marginTop: 28, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Button variant="primary" onClick={onStart} iconRight={<ArrowRight size={18} />}>
          Commencer gratuitement
        </Button>
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */

export default function Pricing() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const mobile = useIsMobile();

  const [billing, setBilling] = useState('annual');
  const [currentPlan, setCurrentPlan] = useState(null);
  const [tripPass, setTripPass] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/billing/subscription`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setCurrentPlan(data.subscription?.plan ?? null);
          setTripPass(data.tripPass?.active ? data.tripPass : null);
        }
      } catch (error) {
        console.error('[Pricing] Error fetching subscription:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  const startCheckout = async (planName, cycle) => {
    try {
      setCheckoutLoading(planName);
      setCheckoutError(null);
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/billing/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName, billing: cycle }),
      });
      if (!response.ok) throw new Error('checkout failed');
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error('[Pricing] Error creating checkout:', error);
      setCheckoutError('Impossible de démarrer le paiement. Veuillez réessayer.');
      setCheckoutLoading(null);
    }
  };

  const handleSelectPlan = (plan) => {
    if (plan.id === 'free') {
      navigate('/create-trip');
      return;
    }
    startCheckout(plan.plan, billing);
  };

  return (
    <div style={{ width: '100%', background: 'var(--sand-50)', color: 'var(--sand-900)', fontFamily: 'var(--font-sans)' }}>
      {checkoutError && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
          padding: '12px 20px', borderRadius: 12, boxShadow: 'var(--shadow-2)',
          fontSize: 14, fontWeight: 500, background: 'var(--clay-500)', color: '#fff',
        }}>
          ✕ {checkoutError}
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: mobile ? '48px 20px 36px' : '80px 32px 56px', maxWidth: 1152, margin: '0 auto' }}>
        <Hero billing={billing} setBilling={setBilling} mobile={mobile} />
      </section>

      {/* Plan cards */}
      <section style={{ padding: mobile ? '12px 20px 0' : '0 32px', maxWidth: 1152, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 20, paddingTop: mobile ? 8 : 28,
        }}>
          {PLANS.map(p => (
            <PlanCard
              key={p.id}
              plan={p}
              billing={billing}
              mobile={mobile}
              isCurrent={currentPlan === p.plan}
              loading={checkoutLoading === p.plan}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>
      </section>

      {/* Trip Pass */}
      <section style={{ padding: mobile ? '32px 20px 0' : '48px 32px 0', maxWidth: 1152, margin: '0 auto' }}>
        <div style={{ marginBottom: mobile ? 14 : 18, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--sand-500)' }}>
            Pas envie de t’abonner&nbsp;?
          </span>
          <span style={{ fontSize: 13, color: 'var(--sand-500)' }}>· paiement unique, 7 jours</span>
        </div>
        <TripPassBlock
          mobile={mobile}
          loading={checkoutLoading === 'TRIP_PASS'}
          active={Boolean(tripPass?.active)}
          expiresAt={tripPass?.expiresAt}
          onSelect={() => startCheckout('TRIP_PASS', 'monthly')}
        />
      </section>

      {/* Reassurance */}
      <section style={{ padding: mobile ? '28px 20px 0' : '40px 32px 0', maxWidth: 1152, margin: '0 auto' }}>
        <Reassurance mobile={mobile} />
      </section>

      {/* Feature matrix */}
      <section style={{ padding: mobile ? '56px 20px 0' : '88px 32px 0', maxWidth: 1152, margin: '0 auto' }}>
        <div style={{ textAlign: mobile ? 'left' : 'center', maxWidth: 720, margin: '0 auto' }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ember-700)' }}>
            Comparer en détail
          </span>
          <h2 style={{
            margin: '10px 0 0', fontFamily: 'var(--font-display)', fontWeight: 500,
            fontSize: mobile ? 28 : 40, lineHeight: 1.08, letterSpacing: '-0.015em', color: 'var(--sand-900)',
          }}>
            Tout ce qui est inclus, <span style={{ fontStyle: 'italic', color: 'var(--ember-700)' }}>offre par offre</span>
          </h2>
        </div>
        <div style={{ marginTop: mobile ? 24 : 36 }}>
          {mobile ? <FeatureMatrixMobile /> : <FeatureMatrixDesktop />}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: mobile ? '56px 20px 0' : '96px 32px 0', maxWidth: 840, margin: '0 auto' }}>
        <div style={{ textAlign: mobile ? 'left' : 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ember-700)' }}>
            Questions fréquentes
          </span>
          <h2 style={{
            margin: '10px 0 0', fontFamily: 'var(--font-display)', fontWeight: 500,
            fontSize: mobile ? 28 : 36, lineHeight: 1.1, letterSpacing: '-0.015em', color: 'var(--sand-900)',
          }}>
            On a sûrement déjà la réponse
          </h2>
        </div>
        <div style={{ marginTop: mobile ? 24 : 32 }}>
          <FAQAccordion mobile={mobile} />
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: mobile ? '64px 20px 56px' : '96px 32px 80px', maxWidth: 1152, margin: '0 auto' }}>
        <FinalCTA mobile={mobile} onStart={() => navigate('/create-trip')} />
      </section>
    </div>
  );
}

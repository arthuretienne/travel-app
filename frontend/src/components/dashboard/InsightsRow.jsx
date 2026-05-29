import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function renderHeadline(body, keyword) {
  const parts = body.split('{keyword}');
  return (
    <>
      {parts[0]}
      <em className="font-display italic text-ember-700 not-italic">{keyword}</em>
      {parts[1]}
    </>
  );
}

export default function InsightsRow({ insights }) {
  if (!insights?.length) return null;

  return (
    <section className="mb-10">
      <div className="mb-5">
        <h2 className="font-display text-2xl font-medium text-text-main">
          Tes <em className="font-display italic text-ember-700 not-italic">habitudes</em>, en pistes
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {insights.length} observation{insights.length > 1 ? 's' : ''} basée{insights.length > 1 ? 's' : ''} sur tes recherches · ignorables, jamais imposées
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {insights.map((ins) => (
          <Link
            key={ins.id}
            to={ins.href}
            className="group flex flex-col rounded-[18px] border border-sand-200 bg-white p-5 shadow-1 transition-all hover:border-ember-200 hover:shadow-2"
          >
            <div className="text-[11px] font-mono uppercase tracking-widest text-text-secondary">
              {ins.eyebrow}
            </div>
            <p className="mt-3 flex-1 font-display text-lg leading-snug text-text-main">
              {renderHeadline(ins.body, ins.keyword)}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-mono font-semibold text-ember-700 group-hover:gap-2 transition-all">
              {ins.cta}
              <ChevronRight size={14} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

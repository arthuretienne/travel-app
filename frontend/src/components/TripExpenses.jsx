// frontend/src/components/TripExpenses.jsx
// Tricount-style expense splitting for collaborative trips

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Plus, Trash2, ArrowRight, Loader2, Scale,
  Utensils, Plane, Home, ShoppingBag, Ticket, HelpCircle,
} from 'lucide-react';
import { Avatar, Button, Card } from './ui';
import { formatEUR } from '../utils/format';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const CATEGORIES = [
  { id: 'food', label: 'Repas & Boissons', icon: Utensils },
  { id: 'transport', label: 'Transport', icon: Plane },
  { id: 'accommodation', label: 'Hébergement', icon: Home },
  { id: 'activity', label: 'Activité', icon: Ticket },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'other', label: 'Autre', icon: HelpCircle },
];

function getCategoryInfo(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

export default function TripExpenses({ tripId, currentUserId }) {
  const { getToken } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({});
  const [members, setMembers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');

  useEffect(() => {
    fetchExpenses();
  }, [tripId]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      const [expRes, settleRes] = await Promise.all([
        fetch(`${API_URL}/api/trips/${tripId}/expenses`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/trips/${tripId}/expenses/settlements`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (expRes.ok) {
        const data = await expRes.json();
        setExpenses(data.expenses || []);
        setBalances(data.balances || {});
        setMembers(data.members || []);
      }
      if (settleRes.ok) {
        const data = await settleRes.json();
        setSettlements(data.settlements || []);
      }
    } catch (err) {
      console.error('[Expenses] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!description.trim() || !amount || parseFloat(amount) <= 0) return;

    try {
      setSubmitting(true);
      const token = await getToken();

      const res = await fetch(`${API_URL}/api/trips/${tripId}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: description.trim(),
          amount: parseFloat(amount),
          category,
        }),
      });

      if (res.ok) {
        setDescription('');
        setAmount('');
        setCategory('other');
        setShowForm(false);
        fetchExpenses();
      }
    } catch (err) {
      console.error('[Expenses] Error adding:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expenseId) => {
    if (!confirm('Supprimer cette dépense ?')) return;
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/trips/${tripId}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchExpenses();
    } catch (err) {
      console.error('[Expenses] Error deleting:', err);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const perPerson = members.length > 0 ? totalExpenses / members.length : 0;

  const memberName = (m) => `${m?.firstName || ''} ${m?.lastName || ''}`.trim() || 'Invité';

  if (loading) {
    return (
      <Card className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-ember-500" />
      </Card>
    );
  }

  const inputClass =
    'h-11 w-full rounded-[11px] border border-sand-200 bg-white px-3.5 text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div className="sk-stagger flex flex-col gap-5">
      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Total des dépenses</span>
          <div className="mt-2 font-display text-[34px] font-medium leading-none text-text-main">{formatEUR(Math.round(totalExpenses))}</div>
          <div className="mt-1.5 text-[13px] text-text-muted">{expenses.length} dépenses · {members.length} participants</div>
        </Card>
        <Card className="p-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Par personne</span>
          <div className="mt-2 font-display text-[34px] font-medium leading-none text-text-main">{formatEUR(Math.round(perPerson))}</div>
          <div className="mt-1.5 text-[13px] text-text-muted">part moyenne</div>
        </Card>
        <Card className="p-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Remboursements</span>
          <div className="mt-2 font-display text-[34px] font-medium leading-none text-text-main">{settlements.length}</div>
          <div className="mt-1.5 text-[13px] text-text-muted">transferts pour solder</div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Expenses list */}
        <Card className="p-0">
          <div className="flex items-center justify-between gap-3 px-6 pt-5">
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">Dépenses du groupe</span>
              <h2 className="mt-1 font-display text-[22px] font-medium tracking-[-0.01em] text-text-main">Dépenses</h2>
            </div>
            <Button size="sm" icon={<Plus size={15} />} onClick={() => setShowForm(v => !v)}>Ajouter</Button>
          </div>

          {showForm && (
            <form onSubmit={handleAddExpense} className="sk-pop mx-6 mt-4 flex flex-col gap-2.5 rounded-[14px] bg-sand-50 p-4">
              <input
                type="text"
                placeholder="Intitulé (ex : Restaurant)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
                autoFocus
              />
              <input
                type="number"
                placeholder="Montant €"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className={inputClass}
              />
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-xs font-medium transition-colors',
                        active
                          ? 'border-ember-600 bg-ember-50 text-ember-700'
                          : 'border-sand-200 bg-white text-text-secondary hover:border-sand-300',
                      ].join(' ')}
                    >
                      <Icon size={14} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[12.5px] text-text-muted">Divisé équitablement entre les {members.length} membres</p>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" type="button" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button size="sm" type="submit" disabled={submitting || !description.trim() || !amount}>
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : 'Enregistrer'}
                </Button>
              </div>
            </form>
          )}

          <div className="px-6 pb-5 pt-2">
            {expenses.length === 0 ? (
              <div className="py-10 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-sand-100 text-sand-500">
                  <Utensils size={24} />
                </span>
                <p className="mt-4 font-display text-[18px] font-medium text-text-main">Aucune dépense pour l'instant</p>
                <p className="mx-auto mt-1.5 max-w-xs text-sm text-text-secondary">
                  Ajoutez des dépenses pour les partager équitablement avec votre groupe.
                </p>
              </div>
            ) : (
              expenses.map((expense, i) => {
                const cat = getCategoryInfo(expense.category);
                const Icon = cat.icon;
                const canDelete = expense.paidById === currentUserId;
                return (
                  <div
                    key={expense.id}
                    className={['flex items-center gap-3.5 py-3.5', i ? 'border-t border-sand-200' : ''].join(' ')}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sand-100 text-sand-600">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-semibold text-text-main">{expense.description}</div>
                      <div className="text-[12.5px] text-text-muted">
                        Payé par {expense.paidBy?.firstName || 'Inconnu'} · {new Date(expense.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <span className="font-mono text-sm font-medium text-text-main">{formatEUR(expense.amount, { decimals: 2 })}</span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(expense.id)}
                        aria-label="Supprimer"
                        className="grid place-items-center p-1 text-text-muted transition-colors hover:text-clay-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Balances + reimbursement plan */}
        <aside className="flex flex-col gap-4">
          <Card className="p-5">
            <span className="mb-3.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-700">Soldes</span>
            {members.length === 0 ? (
              <p className="text-sm text-text-muted">Aucun participant.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {members.map(m => {
                  const v = balances[m.id] || 0;
                  const rounded = Math.round(v);
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <Avatar name={memberName(m)} src={m.imageUrl} size={30} />
                      <span className="flex-1 text-sm font-medium text-text-main">{m.firstName || 'Invité'}</span>
                      <span
                        className={[
                          'whitespace-nowrap font-mono text-[13.5px] font-semibold',
                          rounded === 0 ? 'text-text-muted' : rounded > 0 ? 'text-moss-500' : 'text-clay-500',
                        ].join(' ')}
                      >
                        {rounded > 0 ? '+' : ''}{formatEUR(rounded, { decimals: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="border-0 bg-sand-900 p-5 text-white">
            <span className="mb-3.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
              <Scale size={15} className="text-gold-500" /> Plan de remboursement
            </span>
            {settlements.length === 0 ? (
              <div className="text-[13.5px] text-white/70">Tout est équilibré 🎉</div>
            ) : (
              <div className="flex flex-col gap-3">
                {settlements.map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[13.5px]">
                    <Avatar name={s.from?.firstName || 'Invité'} src={s.from?.imageUrl} size={26} />
                    <span className="font-medium">{s.from?.firstName || 'Invité'}</span>
                    <ArrowRight size={15} className="text-ember-300" />
                    <Avatar name={s.to?.firstName || 'Invité'} src={s.to?.imageUrl} size={26} />
                    <span className="font-medium">{s.to?.firstName || 'Invité'}</span>
                    <span className="ml-auto font-mono font-semibold text-ember-200">{formatEUR(s.amount, { decimals: 2 })}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

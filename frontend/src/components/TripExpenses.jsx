// frontend/src/components/TripExpenses.jsx
// Tricount-style expense splitting for collaborative trips

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Plus, Trash2, ArrowRight, Loader2,
  Utensils, Plane, Home, ShoppingBag, Ticket, HelpCircle,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const CATEGORIES = [
  { id: 'food', label: 'Food & Drinks', icon: Utensils, color: 'text-orange-600 bg-orange-50' },
  { id: 'transport', label: 'Transport', icon: Plane, color: 'text-blue-600 bg-blue-50' },
  { id: 'accommodation', label: 'Accommodation', icon: Home, color: 'text-purple-600 bg-purple-50' },
  { id: 'activity', label: 'Activity', icon: Ticket, color: 'text-green-600 bg-green-50' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'text-pink-600 bg-pink-50' },
  { id: 'other', label: 'Other', icon: HelpCircle, color: 'text-stone-600 bg-stone-50' },
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
    if (!confirm('Delete this expense?')) return;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-stone-100">
          <p className="text-xs text-text-secondary mb-1">Total expenses</p>
          <p className="text-2xl font-bold text-text-main">{totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-100">
          <p className="text-xs text-text-secondary mb-1">Per person</p>
          <p className="text-2xl font-bold text-primary">{perPerson.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-100 col-span-2 md:col-span-1">
          <p className="text-xs text-text-secondary mb-1">Members</p>
          <p className="text-2xl font-bold text-text-main">{members.length}</p>
        </div>
      </div>

      {/* Settlements (who owes whom) */}
      {settlements.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-100 p-5">
          <h3 className="font-semibold text-text-main mb-3">Settlements</h3>
          <div className="space-y-3">
            {settlements.map((s, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-surface-subtle rounded-lg">
                <span className="font-medium text-text-main text-sm">{s.from?.firstName || 'Unknown'}</span>
                <ArrowRight size={16} className="text-text-light flex-shrink-0" />
                <span className="font-medium text-text-main text-sm">{s.to?.firstName || 'Unknown'}</span>
                <span className="ml-auto font-bold text-primary">{s.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Balances per member */}
      {Object.keys(balances).length > 0 && (
        <div className="bg-white rounded-xl border border-stone-100 p-5">
          <h3 className="font-semibold text-text-main mb-3">Balances</h3>
          <div className="space-y-2">
            {members.map(m => {
              const balance = balances[m.id] || 0;
              return (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                  <div className="flex items-center gap-2">
                    {m.imageUrl ? (
                      <img src={m.imageUrl} alt="" className="w-7 h-7 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-bold">
                        {(m.firstName || '?')[0]}
                      </div>
                    )}
                    <span className="text-sm font-medium text-text-main">{m.firstName} {m.lastName?.[0] || ''}</span>
                  </div>
                  <span className={`text-sm font-bold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-500' : 'text-text-light'}`}>
                    {balance > 0 ? '+' : ''}{balance.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Expense Button / Form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
        >
          <Plus size={18} />
          Add Expense
        </button>
      ) : (
        <form onSubmit={handleAddExpense} className="bg-white rounded-xl border border-stone-100 p-5 space-y-4">
          <h3 className="font-semibold text-text-main">New Expense</h3>

          <input
            type="text"
            placeholder="Description (e.g. Restaurant dinner)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            autoFocus
          />

          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            step="0.01"
            className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    category === cat.id
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-stone-200 text-text-secondary hover:border-stone-300'
                  }`}
                >
                  <Icon size={14} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-text-light">Split equally among all {members.length} members</p>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !description.trim() || !amount}
              className="flex-1 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-stone-100 text-stone-600 font-medium rounded-lg hover:bg-stone-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Expense List */}
      {expenses.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-100 divide-y divide-stone-50">
          {expenses.map(expense => {
            const cat = getCategoryInfo(expense.category);
            const Icon = cat.icon;
            const canDelete = expense.paidById === currentUserId;

            return (
              <div key={expense.id} className="flex items-center gap-3 p-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-main text-sm truncate">{expense.description}</p>
                  <p className="text-xs text-text-secondary">
                    Paid by {expense.paidBy?.firstName || 'Unknown'} — {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-text-main text-sm">{expense.amount.toFixed(2)}</p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="p-1.5 text-stone-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-100 p-8 text-center">
          <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3">
            <Utensils size={24} className="text-primary" />
          </div>
          <p className="font-medium text-text-main mb-1">No expenses yet</p>
          <p className="text-sm text-text-secondary">Add expenses to split costs with your group</p>
        </div>
      )}
    </div>
  );
}

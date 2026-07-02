// backend/src/routes/expenses.js
// Expense splitting routes for collaborative trips (Tricount-style)

import express from 'express';
import { authenticateUser, authenticateUserOrGuest } from '../middleware/auth.js';
import prisma from '../db/prisma.js';

const router = express.Router();

/**
 * Participants du split = TOUS les membres du trip, invités guest compris
 * (audit V3 T4 : l'invitée guest était exclue du partage des dépenses, ce
 * qui faussait tous les soldes). Sans migration : les comptes gardent leur
 * userId comme clé, les guests utilisent `guest:<memberId>` — stocké tel
 * quel dans le Json splitAmong. Un guest peut DEVOIR de l'argent ; seul un
 * compte peut être payeur (paidById est une FK User).
 */
async function getParticipants(tripId) {
  const members = await prisma.tripMember.findMany({
    where: { tripId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, imageUrl: true } },
    },
  });
  const seen = new Set();
  const participants = [];
  for (const m of members) {
    const key = m.userId || `guest:${m.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    participants.push({
      id: key,
      firstName: m.user?.firstName || m.guestName || 'Invité',
      lastName: m.user?.lastName || '',
      imageUrl: m.user?.imageUrl || null,
      isGuest: !m.userId,
    });
  }
  return participants;
}

/**
 * GET /api/trips/:tripId/expenses
 * Get all expenses for a trip
 */
router.get('/:tripId/expenses', authenticateUserOrGuest, async (req, res) => {
  try {
    const { tripId } = req.params;

    // Verify user is a member of the trip (guest = membre de CE voyage)
    const isGuestWithAccess = req.user.isGuest === true && req.user.allowedTripId === tripId;
    const member = isGuestWithAccess ? true : await prisma.tripMember.findFirst({
      where: { tripId, userId: req.user.id },
    });
    if (!member) {
      return res.status(403).json({ error: 'Not a member of this trip' });
    }

    const expenses = await prisma.tripExpense.findMany({
      where: { tripId },
      include: {
        paidBy: { select: { id: true, firstName: true, lastName: true, imageUrl: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Participants = membres + guests (clé userId ou guest:<memberId>)
    const participants = await getParticipants(tripId);

    // Calculate balances
    const balances = calculateBalances(expenses, participants);

    res.json({
      success: true,
      expenses,
      balances,
      members: participants,
    });
  } catch (error) {
    console.error('[Expenses] Error fetching:', error.message);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

/**
 * POST /api/trips/:tripId/expenses
 * Add a new expense
 */
router.post('/:tripId/expenses', authenticateUser, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { description, amount, category, date, splitType, splitAmong } = req.body;

    if (!description || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Description and positive amount required' });
    }

    // Verify user is a member
    const member = await prisma.tripMember.findFirst({
      where: { tripId, userId: req.user.id },
    });
    if (!member) {
      return res.status(403).json({ error: 'Not a member of this trip' });
    }

    // If no splitAmong provided, default to equal split among all members
    let finalSplitAmong = splitAmong;
    if (!finalSplitAmong) {
      const participants = await getParticipants(tripId);
      const share = amount / participants.length;
      finalSplitAmong = participants.map(p => ({ userId: p.id, amount: share }));
    }

    const expense = await prisma.tripExpense.create({
      data: {
        tripId,
        paidById: req.user.id,
        description,
        amount,
        category: category || 'other',
        date: date ? new Date(date) : new Date(),
        splitType: splitType || 'equal',
        splitAmong: finalSplitAmong,
      },
      include: {
        paidBy: { select: { id: true, firstName: true, lastName: true, imageUrl: true } },
      },
    });

    res.status(201).json({ success: true, expense });
  } catch (error) {
    console.error('[Expenses] Error creating:', error.message);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

/**
 * DELETE /api/trips/:tripId/expenses/:expenseId
 * Delete an expense (only the person who paid can delete)
 */
router.delete('/:tripId/expenses/:expenseId', authenticateUser, async (req, res) => {
  try {
    const { tripId, expenseId } = req.params;

    const expense = await prisma.tripExpense.findFirst({
      where: { id: expenseId, tripId },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Only the payer or trip organizer can delete
    const member = await prisma.tripMember.findFirst({
      where: { tripId, userId: req.user.id },
    });

    if (expense.paidById !== req.user.id && member?.role !== 'organizer') {
      return res.status(403).json({ error: 'Only the payer or organizer can delete this expense' });
    }

    await prisma.tripExpense.delete({ where: { id: expenseId } });
    res.json({ success: true });
  } catch (error) {
    console.error('[Expenses] Error deleting:', error.message);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

/**
 * GET /api/trips/:tripId/expenses/settlements
 * Calculate optimal settlement plan (who owes whom)
 */
router.get('/:tripId/expenses/settlements', authenticateUserOrGuest, async (req, res) => {
  try {
    const { tripId } = req.params;

    const isGuestWithAccess = req.user.isGuest === true && req.user.allowedTripId === tripId;
    const member = isGuestWithAccess ? true : await prisma.tripMember.findFirst({
      where: { tripId, userId: req.user.id },
    });
    if (!member) {
      return res.status(403).json({ error: 'Not a member of this trip' });
    }

    const expenses = await prisma.tripExpense.findMany({
      where: { tripId },
      include: {
        paidBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Même source de participants que GET /expenses (audit V4 P1 #4) :
    // l'ancienne requête excluait les guests ET indexait les soldes par
    // TripMember.id — aucune clé ne matchait paidById/splitAmong, donc le
    // plan répondait « Tout est équilibré » sur des soldes non nuls.
    const participants = await getParticipants(tripId);

    const balances = calculateBalances(expenses, participants);
    const settlements = calculateSettlements(balances, participants);

    res.json({ success: true, settlements, balances });
  } catch (error) {
    console.error('[Expenses] Error calculating settlements:', error.message);
    res.status(500).json({ error: 'Failed to calculate settlements' });
  }
});

/**
 * Calculate net balance for each member
 * Positive = they are owed money, Negative = they owe money
 */
function calculateBalances(expenses, participants) {
  const balances = {};

  // Initialize all participants (comptes + guests) to 0
  participants.forEach(p => {
    balances[p.id] = 0;
  });

  expenses.forEach(expense => {
    const splitAmong = expense.splitAmong || [];

    // Add what the payer paid
    if (balances[expense.paidById] !== undefined) {
      balances[expense.paidById] += expense.amount;
    }

    // Subtract each person's share
    splitAmong.forEach(split => {
      if (balances[split.userId] !== undefined) {
        balances[split.userId] -= split.amount || (expense.amount / splitAmong.length);
      }
    });
  });

  // Round to 2 decimal places
  Object.keys(balances).forEach(k => {
    balances[k] = Math.round(balances[k] * 100) / 100;
  });

  return balances;
}

/**
 * Calculate minimal settlements to resolve all debts
 * Uses greedy algorithm: match largest creditor with largest debtor
 */
function calculateSettlements(balances, participants) {
  const memberMap = {};
  participants.forEach(p => {
    memberMap[p.id] = p;
  });

  // Separate creditors and debtors
  const creditors = []; // positive balance = owed money
  const debtors = [];   // negative balance = owes money

  Object.entries(balances).forEach(([userId, balance]) => {
    if (balance > 0.01) creditors.push({ userId, amount: balance });
    if (balance < -0.01) debtors.push({ userId, amount: Math.abs(balance) });
  });

  // Sort descending
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].amount, debtors[di].amount);
    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount > 0) {
      settlements.push({
        from: memberMap[debtors[di].userId],
        to: memberMap[creditors[ci].userId],
        amount: roundedAmount,
      });
    }

    creditors[ci].amount -= amount;
    debtors[di].amount -= amount;

    if (creditors[ci].amount < 0.01) ci++;
    if (debtors[di].amount < 0.01) di++;
  }

  return settlements;
}

export default router;

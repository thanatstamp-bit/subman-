// Core business rules (§6): currency conversion, monthly equivalents,
// countdown badges, renewal auto-advance, trial handling.
import { parseISODate, toISODate, daysUntil, todayBangkok } from './format.js';

const CYCLE_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };

export function toTHB(amount, currency, settings) {
  return currency === 'USD' ? amount * settings.usd_to_thb_rate : amount;
}

/** Convert a THB total to the user's chosen primary display currency. */
export function toDisplayCurrency(amountThb, settings) {
  if (settings.primary_currency === 'USD') {
    return { amount: amountThb / settings.usd_to_thb_rate, currency: 'USD' };
  }
  return { amount: amountThb, currency: 'THB' };
}

export function isTrialActive(expense, todayISO) {
  return !!(expense.is_trial && expense.trial_end_date && expense.trial_end_date >= todayISO);
}

/** monthlyEq(e) — §6.2. Excluded (0) when not active, or currently in trial. */
export function monthlyEq(expense, settings, todayISO = toISODate(todayBangkok())) {
  if (expense.status !== 'active') return 0;
  if (isTrialActive(expense, todayISO)) return 0;
  const amountThb = toTHB(expense.amount, expense.currency, settings);
  return amountThb / CYCLE_MONTHS[expense.billing_cycle];
}

/** Add N months to an ISO date, clamping day-of-month (31 ม.ค. -> 28/29 ก.พ.). */
export function advanceRenewalDate(iso, billingCycle) {
  const months = CYCLE_MONTHS[billingCycle];
  const date = parseISODate(iso);
  const day = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDayOfTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDayOfTargetMonth));
  return toISODate(next);
}

/**
 * §6.5 — pure computation of the transactions to log + the final renewal date
 * for one active expense, walking next_renewal_date forward until >= today.
 */
export function computeRenewalAdvances(expense, todayISO, settings) {
  const transactions = [];
  let renewalDate = expense.next_renewal_date;
  const todayDate = parseISODate(todayISO);
  let guard = 0;
  while (parseISODate(renewalDate) < todayDate && guard < 240) {
    const amountThb = toTHB(expense.amount, expense.currency, settings);
    transactions.push({
      expense_id: expense.id,
      name: expense.name,
      category_id: expense.category_id,
      paid_date: renewalDate,
      amount: expense.amount,
      currency: expense.currency,
      amount_thb: amountThb,
    });
    renewalDate = advanceRenewalDate(renewalDate, expense.billing_cycle);
    guard++;
  }
  return { transactions, finalRenewalDate: renewalDate, changed: transactions.length > 0 };
}

/** §6.6 — trial -> first-charge conversion when trial_end_date has passed. */
export function checkTrialExpiry(expense, todayISO) {
  if (expense.is_trial && expense.trial_end_date && expense.trial_end_date < todayISO) {
    return { is_trial: false, next_renewal_date: expense.trial_end_date };
  }
  return null;
}

/** §6.3 — countdown color bucket, shared by pill and plain-text renderings. */
export function countdownColor(days) {
  if (days <= 3) return 'danger';
  if (days <= 5) return 'warning';
  if (days <= 7) return 'brand';
  return 'secondary';
}

export function countdownPillLabel(days) {
  if (days <= 0) return 'วันนี้';
  if (days === 1) return 'พรุ่งนี้';
  return `${days} วัน`;
}

export function countdownPlainLabel(days) {
  if (days <= 0) return 'วันนี้';
  if (days === 1) return 'พรุ่งนี้';
  return `in ${days} วัน`;
}

const COUNTDOWN_COLOR_VAR = {
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  brand: 'var(--color-brand-strong)',
  secondary: 'var(--color-text-secondary)',
};

/** CSS color value for a countdown pill background or plain-text color. */
export function countdownColorVar(days) {
  return COUNTDOWN_COLOR_VAR[countdownColor(days)];
}

/** Σ transactions.amount_thb for a given calendar month/year, plus whether any rows exist. */
export function sumTransactionsForMonth(transactions, year, month) {
  const rows = transactions.filter(t => {
    const d = parseISODate(t.paid_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  return { total: rows.reduce((s, t) => s + Number(t.amount_thb), 0), hasData: rows.length > 0 };
}

/** Σ transactions.amount_thb for a given calendar year. */
export function sumTransactionsForYear(transactions, year) {
  const rows = transactions.filter(t => parseISODate(t.paid_date).getFullYear() === year);
  return { total: rows.reduce((s, t) => s + Number(t.amount_thb), 0), hasData: rows.length > 0 };
}

export { daysUntil };

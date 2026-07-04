// ALL Supabase queries: expenses, categories, settings, transactions.
import { supabase } from './supabase.js';
import { store } from './store.js';
import { toISODate, todayBangkok } from './format.js';
import { computeRenewalAdvances, checkTrialExpiry } from './logic.js';

const DEFAULT_CATEGORIES = [
  { name: 'บันเทิง', emoji: '🎬', color: 'purple' },
  { name: 'ที่พักอาศัย', emoji: '🏠', color: 'orange' },
  { name: 'การทำงาน', emoji: '💼', color: 'teal' },
  { name: 'สุขภาพ', emoji: '💊', color: 'green' },
  { name: 'อาหาร', emoji: '🍜', color: 'blue' },
  { name: 'อื่นๆ', emoji: '📦', color: 'magenta' },
];

// ---------- First-run bootstrap (§5.3) ----------
export async function bootstrapUser(userId) {
  const { data: existingSettings } = await supabase
    .from('settings').select('*').eq('user_id', userId).maybeSingle();

  if (!existingSettings) {
    await supabase.from('settings').insert({ user_id: userId });
    const rows = DEFAULT_CATEGORIES.map((c, i) => ({ ...c, user_id: userId, sort_order: i }));
    await supabase.from('categories').insert(rows);
  }
}

// ---------- Settings ----------
export async function getSettings(userId) {
  const { data, error } = await supabase.from('settings').select('*').eq('user_id', userId).single();
  if (error) throw error;
  store.settings = data;
  return data;
}

export async function updateSettings(userId, patch) {
  const { data, error } = await supabase
    .from('settings').update(patch).eq('user_id', userId).select().single();
  if (error) throw error;
  store.settings = data;
  return data;
}

// ---------- Categories ----------
export async function getCategories(userId) {
  const { data, error } = await supabase
    .from('categories').select('*').eq('user_id', userId).order('sort_order');
  if (error) throw error;
  store.categories = data;
  return data;
}

export async function createCategory(userId, { name, emoji, color }) {
  const sort_order = store.categories.length;
  const { data, error } = await supabase
    .from('categories').insert({ user_id: userId, name, emoji, color, sort_order })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id, patch) {
  const { data, error } = await supabase.from('categories').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(userId, id) {
  const fallback = store.categories.find(c => c.name === 'อื่นๆ');
  if (fallback) {
    await supabase.from('expenses').update({ category_id: fallback.id }).eq('user_id', userId).eq('category_id', id);
  }
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Expenses ----------
export async function getExpenses(userId) {
  const { data, error } = await supabase
    .from('expenses').select('*').eq('user_id', userId).order('next_renewal_date');
  if (error) throw error;
  return data;
}

export async function createExpense(userId, expense) {
  const { data, error } = await supabase
    .from('expenses').insert({ ...expense, user_id: userId }).select().single();
  if (error) throw error;
  return data;
}

export async function updateExpense(id, patch) {
  const { data, error } = await supabase
    .from('expenses').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Transactions ----------
export async function getTransactions(userId) {
  const { data, error } = await supabase
    .from('transactions').select('*').eq('user_id', userId).order('paid_date');
  if (error) throw error;
  return data;
}

async function insertTransactions(userId, rows) {
  if (!rows.length) return;
  const withUser = rows.map(r => ({ ...r, user_id: userId }));
  const { error } = await supabase.from('transactions').insert(withUser);
  if (error) throw error;
}

/**
 * §6.5 + §6.6 — runs once per app load, after auth. Converts expired trials
 * to real billing, then walks each active expense's renewal date forward,
 * logging a transaction per passed cycle.
 */
export async function processRenewalsAndTrials(userId, settings) {
  const todayISO = toISODate(todayBangkok());
  const expenses = await getExpenses(userId);

  for (const expense of expenses) {
    if (expense.status !== 'active') continue;

    let working = expense;
    const trialUpdate = checkTrialExpiry(working, todayISO);
    if (trialUpdate) {
      working = await updateExpense(working.id, trialUpdate);
    }

    const { transactions, finalRenewalDate, changed } = computeRenewalAdvances(working, todayISO, settings);
    if (changed) {
      await insertTransactions(userId, transactions);
      await updateExpense(working.id, { next_renewal_date: finalRenewalDate });
    }
  }
}

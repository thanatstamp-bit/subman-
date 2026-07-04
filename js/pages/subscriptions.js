// Subscriptions (§8.3)
import { store } from '../store.js';
import { getExpenses, updateExpense, deleteExpense } from '../api.js';
import { monthlyEq, isTrialActive, daysUntil, countdownPillLabel, countdownPlainLabel, countdownColorVar, countdownColor, toDisplayCurrency } from '../logic.js';
import { formatMoney, formatShortDate, toISODate, todayBangkok } from '../format.js';
import { openExpenseModal } from '../ui/modal.js';
import { confirmDialog } from '../ui/confirm.js';
import { toast } from '../ui/toast.js';

export async function render(container) {
  const state = { view: 'monthly', pausedOpen: false };
  const today = todayBangkok();
  const todayISO = toISODate(today);
  const settings = store.settings;

  const extraSlot = document.getElementById('page-header-extra');
  if (extraSlot) {
    extraSlot.innerHTML = `
      <select class="select" id="view-select" style="width:auto;">
        <option value="monthly">Monthly View</option>
        <option value="yearly">Yearly View</option>
      </select>
    `;
    extraSlot.querySelector('#view-select').addEventListener('change', (e) => {
      state.view = e.target.value;
      renderBody();
    });
  }

  container.innerHTML = `<div class="skeleton" style="height: 400px;"></div>`;

  let expenses = [];
  try {
    expenses = await getExpenses(store.session.user.id);
  } catch (err) {
    console.error(err);
  }

  function subPriceHtml(e) {
    const mEq = monthlyEq(e, settings, todayISO);
    const amount = state.view === 'yearly' ? mEq * 12 : mEq;
    const { amount: dispAmount, currency } = toDisplayCurrency(amount, settings);
    const unit = state.view === 'yearly' ? 'Yearly' : 'Monthly';
    return `${formatMoney(dispAmount, currency)} / ${unit}`;
  }

  function renderBody() {
    const subs = expenses.filter(e => e.type === 'subscription');
    const activeSubs = subs.filter(e => e.status === 'active');
    const pausedCancelled = subs.filter(e => e.status !== 'active');

    // ---- Summary card ----
    const totalMonthly = activeSubs.reduce((s, e) => s + monthlyEq(e, settings, todayISO), 0);
    const summaryAmount = state.view === 'yearly' ? totalMonthly * 12 : totalMonthly;
    const { amount: dispSummary, currency: dispCurrency } = toDisplayCurrency(summaryAmount, settings);
    const summaryCaption = state.view === 'yearly' ? 'รายจ่ายรายปี' : 'รายจ่ายรายเดือนเฉลี่ย';

    // ---- Warning items ----
    const warningItems = activeSubs
      .map(e => {
        const trial = isTrialActive(e, todayISO);
        const dueISO = trial ? e.trial_end_date : e.next_renewal_date;
        const days = daysUntil(dueISO);
        return { e, trial, dueISO, days };
      })
      .filter(x => {
        if (x.trial) return settings.remind_trial_enabled && x.days <= settings.trial_remind_days;
        return settings.remind_renewal_enabled && x.days <= settings.remind_before_days;
      })
      .sort((a, b) => a.days - b.days);

    const warningIds = new Set(warningItems.map(x => x.e.id));
    const activeListItems = activeSubs
      .filter(e => !warningIds.has(e.id))
      .map(e => {
        const trial = isTrialActive(e, todayISO);
        const dueISO = trial ? e.trial_end_date : e.next_renewal_date;
        return { e, trial, dueISO, days: daysUntil(dueISO) };
      })
      .sort((a, b) => new Date(a.e.next_renewal_date) - new Date(b.e.next_renewal_date));

    container.innerHTML = `
      <div class="card">
        <div class="summary-inline">
          <div class="summary-inline__stat">
            <div class="stat-card__caption">${summaryCaption}</div>
            <div class="stat-card__value">${formatMoney(dispSummary, dispCurrency)}</div>
          </div>
          <div class="summary-inline__stat">
            <div class="stat-card__caption">รายการที่ใช้งานอยู่</div>
            <div class="stat-card__value">${activeSubs.length} รายการ</div>
          </div>
        </div>
      </div>

      ${warningItems.length ? `
        <div>
          <h2 class="card__heading" style="display:flex; align-items:center; gap: var(--space-2); margin-bottom: var(--space-4); color: var(--color-warning);">
            ⚠️ ใกล้ต่ออายุ / ทดลองใช้ใกล้หมด <span class="badge-count">${warningItems.length}</span>
          </h2>
          <div class="warning-grid" id="warning-grid"></div>
        </div>
      ` : ''}

      <div>
        <h2 class="card__heading" style="display:flex; align-items:center; gap: var(--space-2); margin-bottom: var(--space-4);">
          Active Subscriptions <span class="badge-count">${activeListItems.length}</span>
        </h2>
        <div id="active-list" style="display:flex; flex-direction:column; gap: var(--space-3);"></div>
      </div>

      <div class="card">
        <button type="button" class="collapsible-header${state.pausedOpen ? ' is-open' : ''}" id="paused-toggle">
          <i data-lucide="chevron-right"></i>
          <span style="font-weight:700; color: var(--color-text-brand);">Paused / Cancelled</span>
          <span class="badge-count">${pausedCancelled.length}</span>
        </button>
        <div class="collapsible-body" id="paused-body" style="display:${state.pausedOpen ? 'flex' : 'none'};"></div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    // Warning cards
    if (warningItems.length) {
      const grid = document.getElementById('warning-grid');
      grid.innerHTML = warningItems.map(x => `
        <div class="warning-card" data-id="${x.e.id}">
          <span class="badge-pill warning-card__badge" style="background: ${countdownColorVar(x.days)};">${countdownPillLabel(x.days)}</span>
          ${x.trial ? '<span class="badge-trial" style="width:fit-content;">Trial</span>' : ''}
          <div class="warning-card__name">${x.e.name}</div>
          <div class="warning-card__price">${subPriceHtml(x.e)}</div>
          <div class="warning-card__footer">
            <span class="warning-card__footer-text">${x.trial ? 'Trial ends' : 'Renewal'}: ${formatShortDate(x.dueISO)}</span>
            <button type="button" class="btn-outline btn-sm" data-action="cancel" data-id="${x.e.id}">Cancel</button>
          </div>
        </div>
      `).join('');
      grid.querySelectorAll('[data-action="cancel"]').forEach(btn => {
        btn.addEventListener('click', () => handleCancel(btn.dataset.id));
      });
    }

    // Active list
    const activeList = document.getElementById('active-list');
    if (!activeListItems.length) {
      activeList.innerHTML = `<p style="text-align:center; color: var(--color-text-secondary); padding: var(--space-4) 0;">ไม่มีรายการ</p>`;
    } else {
      activeList.innerHTML = activeListItems.map(x => `
        <div class="sub-row" data-id="${x.e.id}">
          <div>
            <div class="sub-row__name">${x.e.name}</div>
            <div class="sub-row__sub">${subPriceHtml(x.e)} • Next: ${formatShortDate(x.e.next_renewal_date)}</div>
          </div>
          <div class="sub-row__right">
            <span class="countdown-text--${countdownColor(x.days)}">${countdownPlainLabel(x.days)}</span>
            <button type="button" class="btn-outline btn-sm" data-action="pause" data-id="${x.e.id}">Pause</button>
          </div>
        </div>
      `).join('');
      activeList.querySelectorAll('[data-action="pause"]').forEach(btn => {
        btn.addEventListener('click', () => handlePause(btn.dataset.id));
      });
    }

    // Paused/cancelled collapsible
    document.getElementById('paused-toggle').addEventListener('click', () => {
      state.pausedOpen = !state.pausedOpen;
      renderBody();
    });

    const pausedBody = document.getElementById('paused-body');
    if (state.pausedOpen) {
      pausedBody.innerHTML = pausedCancelled.length ? pausedCancelled.map(e => `
        <div class="sub-row" data-id="${e.id}">
          <div>
            <div class="sub-row__name">${e.name}</div>
            <div class="sub-row__sub">${formatMoney(e.amount, e.currency)} / ${e.billing_cycle}</div>
          </div>
          <div class="sub-row__right">
            <span class="status-text status-text--${e.status}">${e.status.charAt(0).toUpperCase() + e.status.slice(1)}</span>
            <button type="button" class="btn-text" data-action="resume" data-id="${e.id}">Resume</button>
            <button type="button" class="btn-danger-text" data-action="delete" data-id="${e.id}">Delete</button>
          </div>
        </div>
      `).join('') : `<p style="text-align:center; color: var(--color-text-secondary); padding: var(--space-4) 0;">ไม่มีรายการ</p>`;

      pausedBody.querySelectorAll('[data-action="resume"]').forEach(btn => {
        btn.addEventListener('click', () => handleResume(btn.dataset.id));
      });
      pausedBody.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => handleDelete(btn.dataset.id));
      });
    }
  }

  async function handleCancel(id) {
    const e = expenses.find(x => x.id === id);
    const ok = await confirmDialog(`ยกเลิก "${e.name}" ใช่ไหม?`, { danger: true });
    if (!ok) return;
    try {
      await updateExpense(id, { status: 'cancelled' });
      e.status = 'cancelled';
      toast(`ยกเลิก ${e.name} แล้ว`);
      renderBody();
    } catch (err) {
      console.error(err);
      toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
    }
  }

  async function handlePause(id) {
    const e = expenses.find(x => x.id === id);
    try {
      await updateExpense(id, { status: 'paused' });
      e.status = 'paused';
      toast(`หยุด ${e.name} ชั่วคราวแล้ว`);
      renderBody();
    } catch (err) {
      console.error(err);
      toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
    }
  }

  async function handleResume(id) {
    const e = expenses.find(x => x.id === id);
    if (e.next_renewal_date < todayISO) {
      openExpenseModal({ expense: e, onSaved: () => render(container) });
      return;
    }
    try {
      await updateExpense(id, { status: 'active' });
      e.status = 'active';
      toast(`เปิดใช้งาน ${e.name} แล้ว`);
      renderBody();
    } catch (err) {
      console.error(err);
      toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
    }
  }

  async function handleDelete(id) {
    const e = expenses.find(x => x.id === id);
    const ok = await confirmDialog(`ลบ "${e.name}" ถาวรใช่ไหม?`, { danger: true });
    if (!ok) return;
    try {
      await deleteExpense(id);
      expenses = expenses.filter(x => x.id !== id);
      toast('ลบรายการแล้ว');
      renderBody();
    } catch (err) {
      console.error(err);
      toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
    }
  }

  renderBody();
}

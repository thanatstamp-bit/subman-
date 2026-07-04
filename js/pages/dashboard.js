// Dashboard (§8.1)
import { store } from '../store.js';
import { getExpenses, getTransactions } from '../api.js';
import { monthlyEq, isTrialActive, daysUntil, countdownPillLabel, countdownColorVar, sumTransactionsForMonth } from '../logic.js';
import { formatMoney, formatMonthlyEq, formatShortDate, formatMonthYear, toISODate, todayBangkok } from '../format.js';
import { makeDoughnut } from '../ui/charts.js';

const CAT_COLOR_VAR = {
  purple: '--cat-purple', orange: '--cat-orange', teal: '--cat-teal',
  green: '--cat-green', blue: '--cat-blue', magenta: '--cat-magenta',
};

function last12Months(today) {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

export async function render(container) {
  const today = todayBangkok();
  const state = { year: today.getFullYear(), month: today.getMonth() };

  const extraSlot = document.getElementById('page-header-extra');
  const months = last12Months(today);
  if (extraSlot) {
    extraSlot.innerHTML = `
      <select class="select" id="month-select" style="width:auto;">
        ${months.map(m => `<option value="${m.year}-${m.month}">${formatMonthYear(m.year, m.month)}</option>`).join('')}
      </select>
    `;
    extraSlot.querySelector('#month-select').addEventListener('change', (e) => {
      const [y, m] = e.target.value.split('-').map(Number);
      state.year = y;
      state.month = m;
      renderBody();
    });
  }

  container.innerHTML = `
    <div class="stat-grid" id="stat-grid"></div>
    <div class="two-col-grid">
      <div class="card donut-card">
        <h2 class="card__heading">ประเภทการใช้จ่าย</h2>
        <div id="donut-wrap"></div>
      </div>
      <div class="card">
        <div class="list-row" style="border:none; padding-bottom: var(--space-3);">
          <h2 class="card__heading" id="upcoming-heading"></h2>
          <a href="#/expenses" class="btn-text">ดูทั้งหมด</a>
        </div>
        <div id="upcoming-list"></div>
      </div>
    </div>
    <div class="card">
      <h2 class="card__heading" style="margin-bottom: var(--space-4);">รายจ่ายรายหมวดหมู่</h2>
      <div id="category-bars"></div>
    </div>
  `;

  const statGrid = document.getElementById('stat-grid');
  statGrid.innerHTML = Array(4).fill('<div class="skeleton" style="height:108px;"></div>').join('');

  let expenses = [];
  let transactions = [];
  try {
    [expenses, transactions] = await Promise.all([
      getExpenses(store.session.user.id),
      getTransactions(store.session.user.id),
    ]);
  } catch (err) {
    console.error(err);
  }

  const settings = store.settings;

  function renderBody() {
    const isCurrentMonth = state.year === today.getFullYear() && state.month === today.getMonth();
    const todayISO = toISODate(today);
    const activeExpenses = expenses.filter(e => e.status === 'active');

    // ---- ยอดรวมเดือนนี้ ----
    let thisMonthTotal;
    if (isCurrentMonth) {
      thisMonthTotal = activeExpenses.reduce((s, e) => s + monthlyEq(e, settings, todayISO), 0);
    } else {
      thisMonthTotal = sumTransactionsForMonth(transactions, state.year, state.month).total;
    }
    const prevDate = new Date(state.year, state.month - 1, 1);
    const prevMonthData = sumTransactionsForMonth(transactions, prevDate.getFullYear(), prevDate.getMonth());
    let deltaHtml = '';
    if (prevMonthData.hasData) {
      const pct = Math.round(((thisMonthTotal - prevMonthData.total) / prevMonthData.total) * 100);
      const up = pct >= 0;
      deltaHtml = `<div class="stat-card__delta stat-card__delta--${up ? 'up' : 'down'}">${up ? '↑' : '↓'} ${Math.abs(pct)}% เทียบกับเดือนก่อน</div>`;
    }

    // ---- เฉลี่ยต่อเดือน ----
    const priorMonths = [];
    for (let i = 1; i <= 6; i++) {
      const d = new Date(state.year, state.month - i, 1);
      priorMonths.push(sumTransactionsForMonth(transactions, d.getFullYear(), d.getMonth()));
    }
    const monthsWithData = priorMonths.filter(m => m.hasData);
    const avgTotal = monthsWithData.length
      ? monthsWithData.reduce((s, m) => s + m.total, 0) / monthsWithData.length
      : thisMonthTotal;
    const avgPrevMonths = [];
    for (let i = 2; i <= 7; i++) {
      const d = new Date(state.year, state.month - i, 1);
      avgPrevMonths.push(sumTransactionsForMonth(transactions, d.getFullYear(), d.getMonth()));
    }
    const avgPrevWithData = avgPrevMonths.filter(m => m.hasData);
    let avgDeltaHtml = '';
    if (avgPrevWithData.length) {
      const avgPrev = avgPrevWithData.reduce((s, m) => s + m.total, 0) / avgPrevWithData.length;
      const pct = Math.round(((avgTotal - avgPrev) / avgPrev) * 100);
      const up = pct >= 0;
      avgDeltaHtml = `<div class="stat-card__delta stat-card__delta--${up ? 'up' : 'down'}">${up ? '↑' : '↓'} ${Math.abs(pct)}% เทียบกับเดือนก่อน</div>`;
    }

    // ---- ยอดรวมทั้งปี ----
    const committedTotal = activeExpenses.reduce((s, e) => s + monthlyEq(e, settings, todayISO), 0);
    const yearTotal = committedTotal * 12;

    // ---- SUBSCRIPTIONS ที่ใช้งานอยู่ ----
    const subCount = activeExpenses.filter(e => e.type === 'subscription').length;

    statGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card__caption">ยอดรวมเดือนนี้</div>
        <div class="stat-card__value">${formatMoney(thisMonthTotal)}</div>
        ${deltaHtml}
      </div>
      <div class="stat-card">
        <div class="stat-card__caption">เฉลี่ยต่อเดือน</div>
        <div class="stat-card__value">${formatMoney(avgTotal)}</div>
        ${avgDeltaHtml}
      </div>
      <div class="stat-card">
        <div class="stat-card__caption">ยอดรวมทั้งปี</div>
        <div class="stat-card__value">${formatMoney(yearTotal)}</div>
        <div class="stat-card__delta stat-card__delta--neutral">-- คาดการณ์</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__caption">SUBSCRIPTIONS ที่ใช้งานอยู่</div>
        <div class="stat-card__value">${subCount}</div>
        <div class="stat-card__delta stat-card__delta--neutral">&nbsp;</div>
      </div>
    `;

    // ---- Donut: ประเภทการใช้จ่าย ----
    const fixedTotal = activeExpenses.filter(e => e.type === 'fixed').reduce((s, e) => s + monthlyEq(e, settings, todayISO), 0);
    const subTotal = activeExpenses.filter(e => e.type === 'subscription').reduce((s, e) => s + monthlyEq(e, settings, todayISO), 0);
    const grandTotal = fixedTotal + subTotal;
    const fixedPct = grandTotal > 0 ? Math.round((fixedTotal / grandTotal) * 100) : 0;
    const subPct = 100 - fixedPct;

    const donutWrap = document.getElementById('donut-wrap');
    donutWrap.innerHTML = `
      <div class="donut-row">
        <div class="donut-chart-wrap">
          <canvas id="type-donut"></canvas>
          <div class="donut-center-label">${grandTotal > 0 ? fixedPct + '%' : '--'}</div>
        </div>
        <div class="donut-legend">
          <div class="donut-legend__item"><span class="donut-legend__dot" style="background: var(--pink-700);"></span>Fixed (${fixedPct}%)</div>
          <div class="donut-legend__item"><span class="donut-legend__dot" style="background: var(--cat-purple);"></span>Subscriptions (${subPct}%)</div>
        </div>
      </div>
    `;
    if (grandTotal > 0) {
      makeDoughnut(document.getElementById('type-donut'), {
        labels: ['Fixed', 'Subscriptions'],
        data: [fixedTotal, subTotal],
        colors: [getComputedStyle(document.documentElement).getPropertyValue('--pink-700').trim(),
                 getComputedStyle(document.documentElement).getPropertyValue('--cat-purple').trim()],
      });
    }

    // ---- ใกล้ครบกำหนด ----
    const windowDays = settings.remind_before_days;
    document.getElementById('upcoming-heading').textContent = `ใกล้ครบกำหนด (${windowDays} วันข้างหน้า)`;
    const upcoming = activeExpenses
      .map(e => {
        const trial = isTrialActive(e, todayISO);
        const dueISO = trial ? e.trial_end_date : e.next_renewal_date;
        return { e, trial, dueISO, days: daysUntil(dueISO) };
      })
      .filter(x => x.days >= 0 && x.days <= windowDays)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);

    const upcomingList = document.getElementById('upcoming-list');
    if (!upcoming.length) {
      upcomingList.innerHTML = `<p style="text-align:center; color: var(--color-text-secondary); padding: var(--space-6) 0;">ไม่มีรายการครบกำหนดใน ${windowDays} วันนี้ 🎉</p>`;
    } else {
      upcomingList.innerHTML = upcoming.map(x => `
        <div class="upcoming-row">
          <div>
            <div class="upcoming-row__name">${x.e.name}${x.trial ? ' <span class="badge-trial">Trial</span>' : ''}</div>
            <div class="upcoming-row__date">${formatShortDate(x.dueISO)}</div>
          </div>
          <div class="upcoming-row__right">
            <span class="upcoming-row__amount">${formatMoney(x.e.amount, x.e.currency)}</span>
            <span class="badge-pill" style="background: ${countdownColorVar(x.days)};">${countdownPillLabel(x.days)}</span>
          </div>
        </div>
      `).join('');
    }

    // ---- รายจ่ายรายหมวดหมู่ ----
    const catTotals = store.categories.map(cat => {
      const total = activeExpenses.filter(e => e.category_id === cat.id).reduce((s, e) => s + monthlyEq(e, settings, todayISO), 0);
      return { cat, total };
    }).filter(x => x.total > 0).sort((a, b) => b.total - a.total);

    const maxCat = Math.max(...catTotals.map(x => x.total), 1);
    const catBars = document.getElementById('category-bars');
    if (!catTotals.length) {
      catBars.innerHTML = `<p style="text-align:center; color: var(--color-text-secondary);">ยังไม่มีข้อมูล</p>`;
    } else {
      catBars.innerHTML = catTotals.map(x => {
        const colorVar = `var(${CAT_COLOR_VAR[x.cat.color] || '--cat-magenta'})`;
        const widthPct = Math.round((x.total / maxCat) * 100);
        const shareOfGrand = grandTotal > 0 ? Math.round((x.total / grandTotal) * 100) : 0;
        return `
          <div class="cat-bar-row">
            <div class="cat-bar-row__label" style="color: ${colorVar};">${x.cat.name}</div>
            <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${widthPct}%; background:${colorVar};"></div></div>
            <div class="cat-bar-row__pct">${shareOfGrand}%</div>
          </div>
        `;
      }).join('');
    }
  }

  renderBody();
}

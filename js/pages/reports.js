// รายงาน / Reports (§8.4) + CSV export (§11)
import { store } from '../store.js';
import { getExpenses, getTransactions } from '../api.js';
import { monthlyEq, sumTransactionsForMonth, sumTransactionsForYear } from '../logic.js';
import { formatMoney, formatMonthYear, thaiMonthAbbr, toISODate, todayBangkok } from '../format.js';
import { makeDoughnut, makeBar } from '../ui/charts.js';
import { toast } from '../ui/toast.js';

const CAT_COLOR_VAR = {
  purple: '--cat-purple', orange: '--cat-orange', teal: '--cat-teal',
  green: '--cat-green', blue: '--cat-blue', magenta: '--cat-magenta',
};

function last12MonthsAsc(today) {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

export async function render(container) {
  const today = todayBangkok();
  const todayISO = toISODate(today);
  const settings = store.settings;

  const state = { tab: 'monthly', year: today.getFullYear(), month: today.getMonth() };

  container.innerHTML = `<div class="skeleton" style="height: 400px;"></div>`;

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

  const activeExpenses = expenses.filter(e => e.status === 'active');
  const hasAnyData = transactions.length > 0 || activeExpenses.length > 0;

  function categoryTotalsForMonth(year, month, isCurrent) {
    if (isCurrent) {
      return store.categories.map(cat => ({
        cat,
        total: activeExpenses.filter(e => e.category_id === cat.id).reduce((s, e) => s + monthlyEq(e, settings, todayISO), 0),
      })).filter(x => x.total > 0);
    }
    const rows = transactions.filter(t => {
      const d = new Date(t.paid_date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return store.categories.map(cat => ({
      cat,
      total: rows.filter(t => t.category_id === cat.id).reduce((s, t) => s + Number(t.amount_thb), 0),
    })).filter(x => x.total > 0);
  }

  function typeTotalsForMonth(year, month, isCurrent) {
    if (isCurrent) {
      const fixed = activeExpenses.filter(e => e.type === 'fixed').reduce((s, e) => s + monthlyEq(e, settings, todayISO), 0);
      const sub = activeExpenses.filter(e => e.type === 'subscription').reduce((s, e) => s + monthlyEq(e, settings, todayISO), 0);
      return { fixed, sub };
    }
    const rows = transactions.filter(t => {
      const d = new Date(t.paid_date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    let fixed = 0, sub = 0;
    for (const t of rows) {
      const exp = expenses.find(e => e.id === t.expense_id);
      if (exp?.type === 'fixed') fixed += Number(t.amount_thb);
      else sub += Number(t.amount_thb);
    }
    return { fixed, sub };
  }

  function updateMonthSelector() {
    const extraSlot = document.getElementById('page-header-extra');
    if (!extraSlot) return;
    if (state.tab === 'monthly') {
      const monthsSet = new Map();
      transactions.forEach(t => {
        const d = new Date(t.paid_date);
        monthsSet.set(`${d.getFullYear()}-${d.getMonth()}`, { year: d.getFullYear(), month: d.getMonth() });
      });
      monthsSet.set(`${today.getFullYear()}-${today.getMonth()}`, { year: today.getFullYear(), month: today.getMonth() });
      const monthsList = Array.from(monthsSet.values()).sort((a, b) => (b.year - a.year) || (b.month - a.month));
      extraSlot.innerHTML = `
        <select class="select" id="period-select" style="width:auto;">
          ${monthsList.map(m => `<option value="${m.year}-${m.month}" ${m.year === state.year && m.month === state.month ? 'selected' : ''}>${formatMonthYear(m.year, m.month)}</option>`).join('')}
        </select>
      `;
      extraSlot.querySelector('#period-select').addEventListener('change', (e) => {
        const [y, m] = e.target.value.split('-').map(Number);
        state.year = y; state.month = m;
        renderBody();
      });
    } else {
      const yearsSet = new Set(transactions.map(t => new Date(t.paid_date).getFullYear()));
      yearsSet.add(today.getFullYear());
      const yearsList = Array.from(yearsSet).sort((a, b) => b - a);
      extraSlot.innerHTML = `
        <select class="select" id="period-select" style="width:auto;">
          ${yearsList.map(y => `<option value="${y}" ${y === state.year ? 'selected' : ''}>${y + 543}</option>`).join('')}
        </select>
      `;
      extraSlot.querySelector('#period-select').addEventListener('change', (e) => {
        state.year = Number(e.target.value);
        renderBody();
      });
    }
  }

  function exportCsv() {
    let rows, filename;
    if (state.tab === 'monthly') {
      rows = transactions.filter(t => {
        const d = new Date(t.paid_date);
        return d.getFullYear() === state.year && d.getMonth() === state.month;
      });
      filename = `subman-report-${state.year}-${String(state.month + 1).padStart(2, '0')}.csv`;
    } else {
      rows = transactions.filter(t => new Date(t.paid_date).getFullYear() === state.year);
      filename = `subman-report-${state.year}.csv`;
    }

    if (!rows.length) {
      toast('ไม่มีข้อมูลในช่วงเวลานี้', 'error');
      return;
    }

    const header = 'date,name,type,category,amount,currency,amount_thb,billing_cycle';
    const lines = rows.map(t => {
      const exp = expenses.find(e => e.id === t.expense_id);
      const cat = store.categories.find(c => c.id === t.category_id);
      const cells = [
        t.paid_date,
        t.name,
        exp?.type || '',
        cat?.name || '',
        t.amount,
        t.currency,
        t.amount_thb,
        exp?.billing_cycle || '',
      ];
      return cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '﻿' + [header, ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast(`ส่งออก ${rows.length} รายการแล้ว`);
  }

  function renderBody() {
    updateMonthSelector();

    if (!hasAnyData) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__heading">ยังไม่มีข้อมูลเพียงพอสำหรับรายงาน</div>
          <div class="empty-state__body">เพิ่มรายการและกลับมาดูอีกครั้ง</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="toolbar" style="justify-content: space-between;">
        <div class="tabs">
          <button type="button" class="chip${state.tab === 'monthly' ? ' is-active' : ''}" data-tab="monthly">รายเดือน</button>
          <button type="button" class="chip${state.tab === 'yearly' ? ' is-active' : ''}" data-tab="yearly">รายปี</button>
        </div>
        <button type="button" class="btn-outline" id="export-csv-btn">ส่งออก CSV</button>
      </div>
      <div id="report-body"></div>
    `;

    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.tab = btn.dataset.tab;
        renderBody();
      });
    });
    container.querySelector('#export-csv-btn').addEventListener('click', exportCsv);

    const body = document.getElementById('report-body');

    if (state.tab === 'monthly') {
      const isCurrent = state.year === today.getFullYear() && state.month === today.getMonth();
      const thisMonth = isCurrent
        ? activeExpenses.reduce((s, e) => s + monthlyEq(e, settings, todayISO), 0)
        : sumTransactionsForMonth(transactions, state.year, state.month).total;

      const prevDate = new Date(state.year, state.month - 1, 1);
      const prevMonth = sumTransactionsForMonth(transactions, prevDate.getFullYear(), prevDate.getMonth());
      let deltaHtml = '';
      if (prevMonth.hasData) {
        const pct = Math.round(((thisMonth - prevMonth.total) / prevMonth.total) * 100);
        const up = pct >= 0;
        deltaHtml = `<span style="color: var(--color-${up ? 'danger' : 'success'}); font-weight:600;">${up ? '↑' : '↓'} ${Math.abs(pct)}% จากเดือนก่อน</span>`;
      }

      const months = last12MonthsAsc(today);
      const barData = months.map(m => {
        const cur = m.year === today.getFullYear() && m.month === today.getMonth();
        return cur ? thisMonth : sumTransactionsForMonth(transactions, m.year, m.month).total;
      });
      const barColors = months.map(m => {
        const isSelected = m.year === state.year && m.month === state.month;
        return isSelected
          ? getComputedStyle(document.documentElement).getPropertyValue('--pink-600').trim()
          : getComputedStyle(document.documentElement).getPropertyValue('--pink-100').trim();
      });

      const catTotals = categoryTotalsForMonth(state.year, state.month, isCurrent).sort((a, b) => b.total - a.total);
      const maxCat = Math.max(...catTotals.map(x => x.total), 1);
      const { fixed, sub } = typeTotalsForMonth(state.year, state.month, isCurrent);
      const grand = fixed + sub;
      const fixedPct = grand > 0 ? Math.round((fixed / grand) * 100) : 0;

      body.innerHTML = `
        <div class="card report-summary" style="margin-bottom: 20px;">
          <span>สรุปเดือนนี้: <span class="report-summary__value">${formatMoney(thisMonth)}</span></span>
          <div class="report-summary__divider"></div>
          ${deltaHtml}
        </div>
        <div class="card" style="margin-bottom: 20px;">
          <h2 class="card__heading" style="margin-bottom: var(--space-4);">แนวโน้มค่าใช้จ่ายรายเดือน</h2>
          <div class="chart-container"><canvas id="trend-chart"></canvas></div>
        </div>
        <div class="bottom-grid">
          <div class="card">
            <h2 class="card__heading" style="margin-bottom: var(--space-4);">สัดส่วนตามหมวดหมู่</h2>
            ${catTotals.length ? catTotals.map(x => {
              const colorVar = `var(${CAT_COLOR_VAR[x.cat.color] || '--cat-magenta'})`;
              const widthPct = Math.round((x.total / maxCat) * 100);
              return `
                <div class="cat-bar-row">
                  <div class="cat-bar-row__label" style="color:${colorVar};">${x.cat.name}</div>
                  <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${widthPct}%; background:${colorVar};"></div></div>
                  <div class="cat-bar-row__pct">${formatMoney(x.total)}</div>
                </div>
              `;
            }).join('') : `<p style="text-align:center; color: var(--color-text-secondary);">ยังไม่มีข้อมูล</p>`}
          </div>
          <div class="card donut-card">
            <h2 class="card__heading">คงที่ vs Subscriptions</h2>
            <div class="donut-row">
              <div class="donut-chart-wrap">
                <canvas id="type-donut"></canvas>
                <div class="donut-center-label">${grand > 0 ? fixedPct + '%' : '--'}</div>
              </div>
              <div class="donut-legend">
                <div class="donut-legend__item"><span class="donut-legend__dot" style="background: var(--pink-700);"></span>Fixed (${fixedPct}%)</div>
                <div class="donut-legend__item"><span class="donut-legend__dot" style="background: var(--cat-purple);"></span>Subs (${100 - fixedPct}%)</div>
              </div>
            </div>
          </div>
        </div>
      `;

      makeBar(document.getElementById('trend-chart'), {
        labels: months.map(m => thaiMonthAbbr(m.month)),
        data: barData,
        colors: barColors,
        stepSize: 10000,
        onBarClick: (idx) => {
          state.year = months[idx].year;
          state.month = months[idx].month;
          renderBody();
        },
      });

      if (grand > 0) {
        makeDoughnut(document.getElementById('type-donut'), {
          labels: ['Fixed', 'Subscriptions'],
          data: [fixed, sub],
          colors: [getComputedStyle(document.documentElement).getPropertyValue('--pink-700').trim(),
                   getComputedStyle(document.documentElement).getPropertyValue('--cat-purple').trim()],
        });
      }
    } else {
      // รายปี view
      const yearsSet = new Set(transactions.map(t => new Date(t.paid_date).getFullYear()));
      yearsSet.add(today.getFullYear());
      const years = Array.from(yearsSet).sort((a, b) => a - b);
      const yearData = years.map(y => sumTransactionsForYear(transactions, y).total);

      const ytdActual = sumTransactionsForYear(transactions, state.year).total;
      const committedMonthly = activeExpenses.reduce((s, e) => s + monthlyEq(e, settings, todayISO), 0);
      const forecast = committedMonthly * 12;

      body.innerHTML = `
        <div class="card" style="margin-bottom: 20px;">
          <div class="report-summary">
            <span>สรุปปีนี้: <span class="report-summary__value">${formatMoney(ytdActual)}</span></span>
          </div>
          <div style="font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: var(--space-2);">คาดการณ์ทั้งปี ${formatMoney(forecast)}</div>
        </div>
        <div class="card">
          <h2 class="card__heading" style="margin-bottom: var(--space-4);">ค่าใช้จ่ายรายปี</h2>
          <div class="chart-container"><canvas id="year-chart"></canvas></div>
        </div>
      `;

      makeBar(document.getElementById('year-chart'), {
        labels: years.map(y => String(y + 543)),
        data: yearData,
        colors: years.map(y => y === state.year
          ? getComputedStyle(document.documentElement).getPropertyValue('--pink-600').trim()
          : getComputedStyle(document.documentElement).getPropertyValue('--pink-100').trim()),
        stepSize: 10000,
        onBarClick: (idx) => {
          state.year = years[idx];
          renderBody();
        },
      });
    }
  }

  renderBody();
}

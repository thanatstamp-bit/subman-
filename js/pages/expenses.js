// รายการทั้งหมด / All Expenses (§8.2)
import { store } from '../store.js';
import { getExpenses } from '../api.js';
import { monthlyEq, isTrialActive, daysUntil, countdownColor } from '../logic.js';
import { formatMoney, formatMonthlyEq, formatShortDate, toISODate, todayBangkok } from '../format.js';
import { openExpenseModal } from '../ui/modal.js';

const RANGE_OPTIONS = [
  { value: 'all', label: 'ทุกช่วงเวลา' },
  { value: '7d', label: 'ครบกำหนดใน 7 วัน' },
  { value: '30d', label: 'ครบกำหนดใน 30 วัน' },
  { value: 'month', label: 'เดือนนี้' },
];

const SORT_OPTIONS = [
  { value: 'due', label: 'ครบกำหนด (ใกล้สุด)' },
  { value: 'amount_desc', label: 'จำนวนเงิน มาก→น้อย' },
  { value: 'amount_asc', label: 'จำนวนเงิน น้อย→มาก' },
  { value: 'name', label: 'ชื่อ A–Z' },
  { value: 'recent', label: 'เพิ่มล่าสุด' },
];

const TYPE_LABEL = { fixed: 'Fixed', subscription: 'Subscription' };
const BILLING_LABEL = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };

export async function render(container) {
  const state = {
    search: '',
    type: 'all',
    categoryId: 'all',
    sort: 'due',
    range: 'all',
  };

  container.innerHTML = `
    <div class="card" style="padding: 16px 20px;">
      <div class="toolbar">
        <div class="toolbar__search input-with-icon">
          <i data-lucide="search"></i>
          <input class="input" id="search-input" placeholder="ค้นหารายการ..." />
        </div>
        <div class="chip-group" id="type-chips">
          <button type="button" class="chip is-active" data-value="all">ทั้งหมด</button>
          <button type="button" class="chip" data-value="fixed">Fixed</button>
          <button type="button" class="chip" data-value="subscription">Sub</button>
        </div>
        <select class="select" id="category-select" style="width:auto;">
          <option value="all">หมวดหมู่: ทั้งหมด</option>
          ${store.categories.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('')}
        </select>
        <select class="select" id="sort-select" style="width:auto;">
          ${SORT_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="card table-card" id="table-card"></div>
  `;
  if (window.lucide) window.lucide.createIcons();

  // Header range selector
  const extraSlot = document.getElementById('page-header-extra');
  if (extraSlot) {
    extraSlot.innerHTML = `
      <select class="select" id="range-select" style="width:auto;">
        ${RANGE_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
      </select>
    `;
    extraSlot.querySelector('#range-select').addEventListener('change', (e) => {
      state.range = e.target.value;
      renderTable();
    });
  }

  const tableCard = document.getElementById('table-card');
  tableCard.innerHTML = `<div class="skeleton" style="height: 240px;"></div>`;

  let allExpenses = [];
  try {
    allExpenses = await getExpenses(store.session.user.id);
  } catch (err) {
    console.error(err);
  }

  const settings = store.settings;
  const todayISO = toISODate(todayBangkok());

  function categoryFor(id) {
    return store.categories.find(c => c.id === id) || null;
  }

  function effectiveDueDate(expense) {
    return isTrialActive(expense, todayISO) ? expense.trial_end_date : expense.next_renewal_date;
  }

  function inRange(expense) {
    if (state.range === 'all') return true;
    const dueDateISO = effectiveDueDate(expense);
    const d = daysUntil(dueDateISO);
    if (state.range === '7d') return d >= 0 && d <= 7;
    if (state.range === '30d') return d >= 0 && d <= 30;
    if (state.range === 'month') {
      const today = todayBangkok();
      const due = new Date(dueDateISO);
      return due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth();
    }
    return true;
  }

  function applyFilters() {
    let list = allExpenses.filter(e => {
      if (state.type !== 'all' && e.type !== state.type) return false;
      if (state.categoryId !== 'all' && e.category_id !== state.categoryId) return false;
      if (state.search && !e.name.toLowerCase().includes(state.search.toLowerCase())) return false;
      if (!inRange(e)) return false;
      return true;
    });

    list.sort((a, b) => {
      if (state.sort === 'due') return new Date(effectiveDueDate(a)) - new Date(effectiveDueDate(b));
      if (state.sort === 'amount_desc') return monthlyEq(b, settings, todayISO) - monthlyEq(a, settings, todayISO);
      if (state.sort === 'amount_asc') return monthlyEq(a, settings, todayISO) - monthlyEq(b, settings, todayISO);
      if (state.sort === 'name') return a.name.localeCompare(b.name);
      if (state.sort === 'recent') return new Date(b.created_at) - new Date(a.created_at);
      return 0;
    });

    return list;
  }

  function rowHtml(e) {
    const cat = categoryFor(e.category_id);
    const trial = isTrialActive(e, todayISO);
    const mEq = monthlyEq(e, settings, todayISO);
    const dueISO = trial ? e.trial_end_date : e.next_renewal_date;
    const d = daysUntil(dueISO);
    const dueColorClass = d <= 7 ? `countdown-text--${countdownColor(d)}` : '';

    return `
      <tr data-id="${e.id}">
        <td>
          <span style="color: var(--color-text-brand); font-weight:600;">${e.name}</span>
          ${trial ? '<span class="badge-trial" style="margin-left:6px;">Trial</span>' : ''}
        </td>
        <td><span class="badge-type">${TYPE_LABEL[e.type]}</span></td>
        <td>${cat ? `${cat.emoji} ${cat.name}` : '—'}</td>
        <td class="col-amount">
          <div style="color: var(--color-text-brand); font-weight:600;">${formatMoney(e.amount, e.currency)}</div>
          <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">${trial ? `Trial · ฿0/mo` : formatMonthlyEq(mEq)}</div>
        </td>
        <td style="color: var(--color-text-brand);">${BILLING_LABEL[e.billing_cycle]}</td>
        <td class="${dueColorClass}" style="${!dueColorClass ? 'color: var(--color-text-brand);' : ''}">${formatShortDate(dueISO)}</td>
        <td><span class="status-text status-text--${e.status}">${e.status.charAt(0).toUpperCase() + e.status.slice(1)}</span></td>
      </tr>
    `;
  }

  function renderTable() {
    const filtered = applyFilters();
    const hasAnyExpenses = allExpenses.length > 0;
    const filtersActive = state.search || state.type !== 'all' || state.categoryId !== 'all' || state.range !== 'all';

    if (!hasAnyExpenses) {
      tableCard.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__circle"><i data-lucide="inbox" style="width:48px;height:48px;"></i></div>
          <div class="empty-state__heading">ยังไม่มีรายการ</div>
          <div class="empty-state__body">เริ่มติดตามรายจ่ายและ Subscription ของคุณวันนี้</div>
          <button type="button" class="btn-primary" id="add-first-btn">เพิ่มรายการแรก</button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      tableCard.querySelector('#add-first-btn').addEventListener('click', () => {
        openExpenseModal({ onSaved: () => render(container) });
      });
      return;
    }

    if (filtered.length === 0) {
      tableCard.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__heading">ไม่พบรายการที่ตรงกับเงื่อนไข</div>
          <button type="button" class="btn-text" id="clear-filters-btn">ล้างตัวกรอง</button>
        </div>
      `;
      tableCard.querySelector('#clear-filters-btn').addEventListener('click', () => {
        state.search = '';
        state.type = 'all';
        state.categoryId = 'all';
        state.range = 'all';
        document.getElementById('search-input').value = '';
        document.querySelectorAll('#type-chips .chip').forEach(c => c.classList.toggle('is-active', c.dataset.value === 'all'));
        document.getElementById('category-select').value = 'all';
        if (extraSlot?.querySelector('#range-select')) extraSlot.querySelector('#range-select').value = 'all';
        renderTable();
      });
      return;
    }

    tableCard.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>ชื่อรายการ</th><th>ประเภท</th><th>หมวดหมู่</th><th>จำนวนเงิน</th><th>รอบบิล</th><th>ครบกำหนด</th><th>สถานะ</th>
            </tr>
          </thead>
          <tbody>${filtered.map(rowHtml).join('')}</tbody>
        </table>
      </div>
    `;

    tableCard.querySelectorAll('tbody tr').forEach(tr => {
      tr.addEventListener('click', () => {
        const expense = allExpenses.find(e => e.id === tr.dataset.id);
        openExpenseModal({ expense, onSaved: () => render(container) });
      });
    });
    if (filtersActive) { /* no-op, filters already reflected */ }
  }

  let searchTimer;
  document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const value = e.target.value;
    searchTimer = setTimeout(() => {
      state.search = value;
      renderTable();
    }, 250);
  });

  document.querySelectorAll('#type-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#type-chips .chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      state.type = chip.dataset.value;
      renderTable();
    });
  });

  document.getElementById('category-select').addEventListener('change', (e) => {
    state.categoryId = e.target.value;
    renderTable();
  });

  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.sort = e.target.value;
    renderTable();
  });

  renderTable();
}

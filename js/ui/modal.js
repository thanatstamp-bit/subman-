// Add/Edit expense modal (§8.6).
import { store } from '../store.js';
import { createExpense, updateExpense, deleteExpense } from '../api.js';
import { toast } from './toast.js';
import { confirmDialog } from './confirm.js';
import { toISODate, todayBangkok } from '../format.js';

const BILLING_OPTIONS = [
  { value: 'monthly', label: 'รายเดือน' },
  { value: 'quarterly', label: 'ราย 3 เดือน' },
  { value: 'yearly', label: 'รายปี' },
];

const TYPE_OPTIONS = [
  { value: 'fixed', label: 'Fixed Cost' },
  { value: 'subscription', label: 'Subscription' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
];

const CURRENCY_OPTIONS = [
  { value: 'THB', label: 'THB' },
  { value: 'USD', label: 'USD' },
];

function segmented(name, options, selected) {
  return `
    <div class="segmented" data-field="${name}">
      ${options.map(o => `
        <button type="button" class="segmented__option${o.value === selected ? ' is-selected' : ''}" data-value="${o.value}">${o.label}</button>
      `).join('')}
    </div>
  `;
}

function categoryOptions(selectedId) {
  const options = store.categories.map(c =>
    `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.emoji} ${c.name}</option>`
  ).join('');
  return `<option value="" ${!selectedId ? 'selected' : ''}>เลือกหมวดหมู่</option>${options}`;
}

export function openExpenseModal({ expense = null, onSaved } = {}) {
  const isEdit = !!expense;
  const today = toISODate(todayBangkok());

  const state = {
    name: expense?.name || '',
    amount: expense?.amount != null ? String(expense.amount) : '',
    currency: expense?.currency || 'THB',
    type: expense?.type || 'subscription',
    category_id: expense?.category_id || '',
    billing_cycle: expense?.billing_cycle || 'monthly',
    next_renewal_date: expense?.next_renewal_date || '',
    is_trial: expense?.is_trial || false,
    trial_end_date: expense?.trial_end_date || '',
    status: expense?.status || 'active',
  };
  const initialSnapshot = JSON.stringify(state);
  const errors = {};

  const trigger = document.activeElement;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h2 class="modal-header__title" id="modal-title">${isEdit ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}</h2>
        <button type="button" class="modal-close" id="modal-close" aria-label="Close"><i data-lucide="x"></i></button>
      </div>
      <form id="expense-form" novalidate>
        <div class="modal-body">
          <div class="field" data-field-wrap="name">
            <label class="field__label" for="f-name">ชื่อรายการ <span class="req">*</span></label>
            <input class="input" id="f-name" placeholder="เช่น Netflix, Adobe, ค่าเช่าบ้าน" value="${state.name}" />
            <p class="field__error" data-error="name" style="display:none;"></p>
          </div>

          <div class="field-row" data-field-wrap="amount">
            <div class="field">
              <label class="field__label" for="f-amount">จำนวนเงิน <span class="req">*</span></label>
              <input class="input" id="f-amount" type="number" step="0.01" min="0" placeholder="0.00" value="${state.amount}" />
              <p class="field__error" data-error="amount" style="display:none;"></p>
            </div>
            <div class="field">
              <label class="field__label">สกุลเงิน</label>
              ${segmented('currency', CURRENCY_OPTIONS, state.currency)}
            </div>
          </div>

          <div class="field">
            <label class="field__label">ประเภท</label>
            ${segmented('type', TYPE_OPTIONS, state.type)}
          </div>

          <div class="field">
            <label class="field__label" for="f-category">หมวดหมู่</label>
            <select class="select" id="f-category">${categoryOptions(state.category_id)}</select>
          </div>

          <div class="field">
            <label class="field__label">รอบบิล</label>
            ${segmented('billing_cycle', BILLING_OPTIONS, state.billing_cycle)}
          </div>

          <div class="field" data-field-wrap="next_renewal_date">
            <label class="field__label" for="f-renewal">วันต่ออายุ <span class="req">*</span></label>
            <input class="input" id="f-renewal" type="date" value="${state.next_renewal_date}" />
            <p class="field__error" data-error="next_renewal_date" style="display:none;"></p>
          </div>

          <div id="trial-section" style="display:${state.type === 'subscription' ? 'flex' : 'none'}; flex-direction: column; gap: var(--space-3);">
            <div class="settings-row" style="padding: 0;">
              <label class="field__label" for="f-trial" style="margin:0;">ทดลองใช้ฟรี (Trial)</label>
              <label class="toggle">
                <input type="checkbox" id="f-trial" ${state.is_trial ? 'checked' : ''} />
                <span class="toggle__track"></span>
              </label>
            </div>
            <div id="trial-end-wrap" class="field" style="display:${state.is_trial ? 'flex' : 'none'};">
              <label class="field__label" for="f-trial-end">วันสิ้นสุดช่วงทดลอง</label>
              <input class="input" id="f-trial-end" type="date" value="${state.trial_end_date}" />
              <p class="field__error" data-error="trial_end_date" style="display:none;"></p>
              <p style="font-size: var(--text-xs); color: var(--color-text-secondary);">ระบบจะเริ่มนับรอบบิลถัดไปอัตโนมัติหลังจากสิ้นสุดช่วงทดลอง</p>
            </div>
          </div>

          <div class="field">
            <label class="field__label">สถานะ</label>
            ${segmented('status', STATUS_OPTIONS, state.status)}
          </div>
        </div>

        <div class="modal-footer">
          ${isEdit ? '<button type="button" class="btn-danger-text" id="delete-btn">ลบรายการ</button>' : '<span></span>'}
          <div class="modal-footer__right">
            <button type="button" class="btn-outline" id="cancel-btn">ยกเลิก</button>
            <button type="submit" class="btn-primary" id="save-btn">บันทึกรายการ</button>
          </div>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  if (window.lucide) window.lucide.createIcons();

  const panel = overlay.querySelector('.modal-panel');
  const form = overlay.querySelector('#expense-form');

  function isDirty() {
    return JSON.stringify(state) !== initialSnapshot;
  }

  function setError(field, message) {
    errors[field] = message;
    const errEl = form.querySelector(`[data-error="${field}"]`);
    const wrap = form.querySelector(`[data-field-wrap="${field}"]`);
    if (message) {
      errEl.textContent = message;
      errEl.style.display = 'block';
      wrap?.querySelector('.input')?.classList.add('input--error');
    } else {
      errEl.style.display = 'none';
      wrap?.querySelector('.input')?.classList.remove('input--error');
    }
  }

  function clearError(field) {
    if (errors[field]) setError(field, null);
  }

  // Segmented controls
  form.querySelectorAll('.segmented').forEach(group => {
    const fieldName = group.dataset.field;
    group.querySelectorAll('.segmented__option').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.segmented__option').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        state[fieldName] = btn.dataset.value;

        if (fieldName === 'type') {
          const trialSection = form.querySelector('#trial-section');
          if (state.type === 'subscription') {
            trialSection.style.display = 'flex';
          } else {
            trialSection.style.display = 'none';
            state.is_trial = false;
            state.trial_end_date = '';
            form.querySelector('#f-trial').checked = false;
            form.querySelector('#trial-end-wrap').style.display = 'none';
          }
        }
      });
    });
  });

  form.querySelector('#f-name').addEventListener('input', (e) => {
    state.name = e.target.value;
    clearError('name');
  });
  form.querySelector('#f-amount').addEventListener('input', (e) => {
    state.amount = e.target.value;
    clearError('amount');
  });
  form.querySelector('#f-category').addEventListener('change', (e) => {
    state.category_id = e.target.value || null;
  });
  form.querySelector('#f-renewal').addEventListener('input', (e) => {
    state.next_renewal_date = e.target.value;
    clearError('next_renewal_date');
  });
  form.querySelector('#f-trial').addEventListener('change', (e) => {
    state.is_trial = e.target.checked;
    form.querySelector('#trial-end-wrap').style.display = state.is_trial ? 'flex' : 'none';
    clearError('trial_end_date');
  });
  form.querySelector('#f-trial-end').addEventListener('input', (e) => {
    state.trial_end_date = e.target.value;
    clearError('trial_end_date');
  });

  function validate() {
    let valid = true;
    if (!state.name.trim()) { setError('name', 'กรุณาระบุชื่อรายการ'); valid = false; }
    const amountNum = parseFloat(state.amount);
    if (!state.amount || isNaN(amountNum) || amountNum <= 0) { setError('amount', 'กรุณาระบุจำนวนเงิน'); valid = false; }
    if (!state.next_renewal_date) { setError('next_renewal_date', 'กรุณาเลือกวันต่ออายุ'); valid = false; }
    if (state.is_trial) {
      if (!state.trial_end_date) {
        setError('trial_end_date', 'กรุณาเลือกวันสิ้นสุดช่วงทดลอง');
        valid = false;
      } else if (state.trial_end_date < today) {
        setError('trial_end_date', 'วันสิ้นสุดช่วงทดลองต้องเป็นวันในอนาคต');
        valid = false;
      }
    }
    return valid;
  }

  async function close(force = false) {
    if (!force && isDirty()) {
      const ok = await confirmDialog('ยังไม่ได้บันทึก ต้องการปิดใช่ไหม?');
      if (!ok) return;
    }
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
    if (trigger && trigger.focus) trigger.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const focusables = panel.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const list = Array.from(focusables).filter(el => !el.disabled && el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('#modal-close').addEventListener('click', () => close());
  overlay.querySelector('#cancel-btn').addEventListener('click', () => close());
  document.addEventListener('keydown', onKeydown);

  if (isEdit) {
    overlay.querySelector('#delete-btn').addEventListener('click', async () => {
      const ok = await confirmDialog(`ลบ "${state.name}" ใช่ไหม?`, { danger: true });
      if (!ok) return;
      try {
        await deleteExpense(expense.id);
        await close(true);
        toast('ลบรายการแล้ว');
        onSaved?.();
      } catch (err) {
        console.error(err);
        toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const saveBtn = form.querySelector('#save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="btn-spinner"></span> บันทึกรายการ`;

    const payload = {
      name: state.name.trim(),
      amount: parseFloat(state.amount),
      currency: state.currency,
      type: state.type,
      category_id: state.category_id || null,
      billing_cycle: state.billing_cycle,
      next_renewal_date: state.next_renewal_date,
      is_trial: state.is_trial,
      trial_end_date: state.is_trial ? state.trial_end_date : null,
      status: state.status,
    };

    try {
      if (isEdit) {
        await updateExpense(expense.id, payload);
      } else {
        await createExpense(store.session.user.id, payload);
      }
      await close(true);
      toast('บันทึกรายการแล้ว');
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'บันทึกรายการ';
    }
  });

  // Focus first field on open
  form.querySelector('#f-name').focus();
}

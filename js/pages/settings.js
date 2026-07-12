// ตั้งค่า / Settings (§8.5)
import { store } from '../store.js';
import { updateSettings, getCategories, createCategory, updateCategory, deleteCategory } from '../api.js';
import { updateProfile, updatePassword } from '../auth.js';
import { toast } from '../ui/toast.js';
import { confirmDialog } from '../ui/confirm.js';

const SWATCHES = ['purple', 'orange', 'teal', 'green', 'blue', 'magenta'];
const CAT_COLOR_VAR = {
  purple: '--cat-purple', orange: '--cat-orange', teal: '--cat-teal',
  green: '--cat-green', blue: '--cat-blue', magenta: '--cat-magenta',
};

const REMIND_DAY_OPTIONS = [3, 5, 7, 14];

export async function render(container) {
  const user = store.session.user;
  const userId = user.id;
  const settings = store.settings;
  const isEmailUser = (user.app_metadata?.provider || 'email') === 'email';
  const state = { editingCategoryId: null, addingNew: false };

  function categoryMiniForm(cat) {
    const emoji = cat ? cat.emoji : '';
    const name = cat ? cat.name : '';
    const color = cat ? cat.color : SWATCHES[0];
    return `
      <div class="card" style="padding: var(--space-4); display:flex; flex-direction:column; gap: var(--space-3); margin: var(--space-2) 0;">
        <div class="field-row">
          <div class="field" style="flex: 0 0 80px;">
            <label class="field__label">Emoji</label>
            <input class="input" id="mini-emoji" maxlength="2" value="${emoji}" style="text-align:center;" />
          </div>
          <div class="field">
            <label class="field__label">ชื่อ</label>
            <input class="input" id="mini-name" value="${name}" />
          </div>
        </div>
        <div class="field">
          <label class="field__label">สี</label>
          <div class="swatch-picker" id="mini-swatches">
            ${SWATCHES.map(s => `<span class="swatch${s === color ? ' is-selected' : ''}" data-color="${s}" style="background: var(${CAT_COLOR_VAR[s]});"></span>`).join('')}
          </div>
        </div>
        <div style="display:flex; gap: var(--space-3); justify-content:flex-end;">
          <button type="button" class="btn-outline" id="mini-cancel">ยกเลิก</button>
          <button type="button" class="btn-primary" id="mini-save">บันทึก</button>
        </div>
      </div>
    `;
  }

  function renderBody() {
    container.innerHTML = `
      <div class="card settings-section">
        <h2 class="settings-section__title">บัญชีผู้ใช้</h2>
        <div class="field">
          <label class="field__label" for="account-name">ชื่อ-นามสกุล</label>
          <div class="field-row" style="align-items:flex-start;">
            <input class="input" id="account-name" value="${(user.user_metadata?.full_name || '').replace(/"/g, '&quot;')}" placeholder="เช่น สมชาย ใจดี" style="flex:1;" />
            <button type="button" class="btn-primary" id="account-name-save">บันทึก</button>
          </div>
          <p class="field__error" id="account-name-error" style="display:none;"></p>
        </div>
        <div class="field">
          <label class="field__label" for="account-email">อีเมล</label>
          <input class="input" id="account-email" value="${user.email || ''}" disabled />
        </div>
        <hr class="settings-divider" />
        ${isEmailUser ? `
        <div class="field">
          <label class="field__label" for="account-password">เปลี่ยนรหัสผ่าน</label>
          <input class="input" id="account-password" type="password" placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)" autocomplete="new-password" />
        </div>
        <div class="field">
          <label class="field__label" for="account-password-confirm">ยืนยันรหัสผ่านใหม่</label>
          <div class="field-row" style="align-items:flex-start;">
            <input class="input" id="account-password-confirm" type="password" placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง" autocomplete="new-password" style="flex:1;" />
            <button type="button" class="btn-outline" id="account-password-save">เปลี่ยนรหัสผ่าน</button>
          </div>
          <p class="field__error" id="account-password-error" style="display:none;"></p>
        </div>
        ` : `
        <p style="color: var(--color-text-secondary); font-size: var(--text-sm);">
          บัญชีนี้เข้าสู่ระบบด้วยผู้ให้บริการภายนอก จึงไม่มีรหัสผ่านให้เปลี่ยนที่นี่
        </p>
        `}
      </div>

      <div class="card settings-section">
        <h2 class="settings-section__title">สกุลเงินหลัก</h2>
        <div class="settings-row">
          <label class="radio">
            <input type="radio" name="primary-currency" value="THB" ${settings.primary_currency === 'THB' ? 'checked' : ''} />
            <span class="radio__dot"></span> THB (฿)
          </label>
          <label class="radio">
            <input type="radio" name="primary-currency" value="USD" ${settings.primary_currency === 'USD' ? 'checked' : ''} />
            <span class="radio__dot"></span> USD ($)
          </label>
        </div>
        <hr class="settings-divider" />
        <div class="settings-row">
          <span style="font-weight:600;">อัตราแลกเปลี่ยน:</span>
          <input class="input" id="rate-input" type="number" step="0.01" min="0" value="${settings.usd_to_thb_rate}" style="width:120px;" />
          <span style="color: var(--color-text-secondary); font-size: var(--text-sm);">THB ต่อ 1 USD</span>
          <button type="button" class="btn-text" id="rate-save-btn" style="margin-left:auto;">บันทึก</button>
        </div>
        <p class="field__error" id="rate-error" style="display:none;"></p>
      </div>

      <div class="card settings-section">
        <h2 class="settings-section__title">จัดการหมวดหมู่</h2>
        <div id="category-list"></div>
        <button type="button" class="btn-text" id="add-category-btn" style="width:fit-content;">+ เพิ่มหมวดหมู่ใหม่</button>
        <div id="new-category-form"></div>
      </div>

      <div class="card settings-section">
        <h2 class="settings-section__title">การแจ้งเตือน</h2>
        <div class="settings-row">
          <span style="font-weight:600;">เตือนล่วงหน้าก่อนครบกำหนด</span>
          <label class="toggle">
            <input type="checkbox" id="remind-renewal-toggle" ${settings.remind_renewal_enabled ? 'checked' : ''} />
            <span class="toggle__track"></span>
          </label>
        </div>
        <div class="settings-row" id="remind-days-row" style="display:${settings.remind_renewal_enabled ? 'flex' : 'none'};">
          <span style="color: var(--color-text-secondary);">ส่งการแจ้งเตือน:</span>
          <select class="select" id="remind-days-select" style="width:auto; margin-left:auto;">
            ${REMIND_DAY_OPTIONS.map(d => `<option value="${d}" ${settings.remind_before_days === d ? 'selected' : ''}>${d} วันก่อน</option>`).join('')}
          </select>
        </div>
        <hr class="settings-divider" />
        <div class="settings-row">
          <div>
            <div style="font-weight:600;">เตือนเมื่อทดลองใช้ใกล้หมด</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">แจ้งเตือน 3 วันล่วงหน้าสำหรับรายการ Trial</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="remind-trial-toggle" ${settings.remind_trial_enabled ? 'checked' : ''} />
            <span class="toggle__track"></span>
          </label>
        </div>
      </div>

      <div class="card settings-section">
        <h2 class="settings-section__title">การแจ้งเตือนผ่าน LINE</h2>
        <div class="settings-row">
          <div class="line-status">
            <span class="line-status__icon"><i data-lucide="message-circle"></i></span>
            <div>
              <div style="font-weight:600;">ยังไม่ได้เชื่อมต่อ</div>
              <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">เชื่อมบัญชี LINE เพื่อรับการแจ้งเตือนก่อนครบกำหนด</div>
            </div>
          </div>
          <button type="button" class="btn-outline" id="line-connect-btn">เชื่อมบัญชี LINE</button>
        </div>
        <hr class="settings-divider" />
        <div class="settings-row">
          <div>
            <div style="font-weight:600;">แจ้งเตือนผ่าน LINE</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-secondary);">จะเริ่มทำงานเมื่อเชื่อมบัญชีและระบบส่งพร้อมใช้งาน</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="line-notify-toggle" ${settings.line_notify_enabled ? 'checked' : ''} />
            <span class="toggle__track"></span>
          </label>
        </div>
      </div>
    `;

    // Account — name
    container.querySelector('#account-name-save').addEventListener('click', async () => {
      const errEl = document.getElementById('account-name-error');
      const name = document.getElementById('account-name').value.trim();
      if (!name) {
        errEl.textContent = 'กรุณาระบุชื่อ-นามสกุล';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';
      try {
        await updateProfile({ fullName: name });
        // Reflect immediately in the sidebar — the shell isn't re-rendered on route change.
        const nameEl = document.querySelector('.sidebar__user-name');
        const avatarEl = document.querySelector('.sidebar__avatar');
        if (nameEl) nameEl.textContent = name;
        if (avatarEl) avatarEl.textContent = Array.from(name)[0]?.toUpperCase() || '?';
        toast('บันทึกชื่อแล้ว');
      } catch (err) {
        console.error(err);
        toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
      }
    });

    // Account — password (email accounts only)
    const passwordSaveBtn = container.querySelector('#account-password-save');
    if (passwordSaveBtn) {
      passwordSaveBtn.addEventListener('click', async () => {
        const errEl = document.getElementById('account-password-error');
        const pw = document.getElementById('account-password').value;
        const confirm = document.getElementById('account-password-confirm').value;
        if (pw.length < 6) {
          errEl.textContent = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
          errEl.style.display = 'block';
          return;
        }
        if (pw !== confirm) {
          errEl.textContent = 'รหัสผ่านและการยืนยันไม่ตรงกัน';
          errEl.style.display = 'block';
          return;
        }
        errEl.style.display = 'none';
        try {
          await updatePassword(pw);
          document.getElementById('account-password').value = '';
          document.getElementById('account-password-confirm').value = '';
          toast('เปลี่ยนรหัสผ่านแล้ว');
        } catch (err) {
          console.error(err);
          toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
        }
      });
    }

    // LINE
    container.querySelector('#line-connect-btn').addEventListener('click', () => {
      toast('การเชื่อมบัญชี LINE จะเปิดให้ใช้งานเร็วๆนี้');
    });
    container.querySelector('#line-notify-toggle').addEventListener('change', async (e) => {
      try {
        Object.assign(settings, await updateSettings(userId, { line_notify_enabled: e.target.checked }));
        toast('บันทึกแล้ว');
      } catch (err) {
        console.error(err);
        toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
      }
    });

    // Currency radios
    container.querySelectorAll('input[name="primary-currency"]').forEach(radio => {
      radio.addEventListener('change', async () => {
        try {
          Object.assign(settings, await updateSettings(userId, { primary_currency: radio.value }));
          toast('บันทึกแล้ว');
        } catch (err) {
          console.error(err);
          toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
        }
      });
    });

    // Exchange rate
    container.querySelector('#rate-save-btn').addEventListener('click', async () => {
      const errEl = document.getElementById('rate-error');
      const value = parseFloat(document.getElementById('rate-input').value);
      if (!value || value <= 0) {
        errEl.textContent = 'กรุณาระบุอัตราแลกเปลี่ยนที่ถูกต้อง';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';
      try {
        Object.assign(settings, await updateSettings(userId, { usd_to_thb_rate: value }));
        toast('บันทึกอัตราแลกเปลี่ยนแล้ว');
      } catch (err) {
        console.error(err);
        toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
      }
    });

    // Notifications
    container.querySelector('#remind-renewal-toggle').addEventListener('change', async (e) => {
      document.getElementById('remind-days-row').style.display = e.target.checked ? 'flex' : 'none';
      try {
        Object.assign(settings, await updateSettings(userId, { remind_renewal_enabled: e.target.checked }));
        toast('บันทึกแล้ว');
      } catch (err) {
        console.error(err);
        toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
      }
    });
    container.querySelector('#remind-days-select').addEventListener('change', async (e) => {
      try {
        Object.assign(settings, await updateSettings(userId, { remind_before_days: Number(e.target.value) }));
        toast('บันทึกแล้ว');
      } catch (err) {
        console.error(err);
        toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
      }
    });
    container.querySelector('#remind-trial-toggle').addEventListener('change', async (e) => {
      try {
        Object.assign(settings, await updateSettings(userId, { remind_trial_enabled: e.target.checked }));
        toast('บันทึกแล้ว');
      } catch (err) {
        console.error(err);
        toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
      }
    });

    renderCategoryList();

    container.querySelector('#add-category-btn').addEventListener('click', () => {
      state.addingNew = true;
      state.editingCategoryId = null;
      renderNewCategoryForm();
    });
  }

  function renderCategoryList() {
    const listEl = document.getElementById('category-list');
    listEl.innerHTML = store.categories.map(cat => {
      const colorVar = `var(${CAT_COLOR_VAR[cat.color] || '--cat-magenta'})`;
      const isDefault = cat.name === 'อื่นๆ';
      return `
        <div>
          <div class="category-row">
            <span class="category-row__emoji">${cat.emoji}</span>
            <span class="category-row__name" style="color:${colorVar};">${cat.name}</span>
            <div class="category-row__actions">
              <button type="button" class="icon-btn" data-action="edit" data-id="${cat.id}" aria-label="แก้ไข"><i data-lucide="pencil"></i></button>
              ${!isDefault ? `<button type="button" class="icon-btn" data-action="delete" data-id="${cat.id}" aria-label="ลบ"><i data-lucide="trash-2"></i></button>` : ''}
            </div>
          </div>
          <div id="edit-form-${cat.id}"></div>
        </div>
      `;
    }).join('');
    if (window.lucide) window.lucide.createIcons();

    listEl.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.editingCategoryId = state.editingCategoryId === btn.dataset.id ? null : btn.dataset.id;
        state.addingNew = false;
        document.getElementById('new-category-form').innerHTML = '';
        renderEditForms();
      });
    });
    listEl.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => handleDeleteCategory(btn.dataset.id));
    });

    renderEditForms();
  }

  function renderEditForms() {
    store.categories.forEach(cat => {
      const wrap = document.getElementById(`edit-form-${cat.id}`);
      if (!wrap) return;
      if (state.editingCategoryId === cat.id) {
        wrap.innerHTML = categoryMiniForm(cat);
        wireMiniForm(wrap, cat);
      } else {
        wrap.innerHTML = '';
      }
    });
  }

  function renderNewCategoryForm() {
    const wrap = document.getElementById('new-category-form');
    if (!state.addingNew) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = categoryMiniForm(null);
    wireMiniForm(wrap, null);
  }

  function wireMiniForm(wrap, cat) {
    let selectedColor = cat ? cat.color : SWATCHES[0];
    wrap.querySelectorAll('.swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        wrap.querySelectorAll('.swatch').forEach(s => s.classList.remove('is-selected'));
        sw.classList.add('is-selected');
        selectedColor = sw.dataset.color;
      });
    });
    wrap.querySelector('#mini-cancel').addEventListener('click', () => {
      state.editingCategoryId = null;
      state.addingNew = false;
      renderEditForms();
      renderNewCategoryForm();
    });
    wrap.querySelector('#mini-save').addEventListener('click', async () => {
      const emoji = wrap.querySelector('#mini-emoji').value.trim() || '📦';
      const name = wrap.querySelector('#mini-name').value.trim();
      if (!name) return;
      try {
        if (cat) {
          await updateCategory(cat.id, { emoji, name, color: selectedColor });
        } else {
          await createCategory(userId, { emoji, name, color: selectedColor });
        }
        await getCategories(userId);
        state.editingCategoryId = null;
        state.addingNew = false;
        toast('บันทึกแล้ว');
        renderCategoryList();
        renderNewCategoryForm();
      } catch (err) {
        console.error(err);
        toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
      }
    });
  }

  async function handleDeleteCategory(id) {
    const cat = store.categories.find(c => c.id === id);
    const ok = await confirmDialog(`ลบหมวดหมู่ "${cat.name}"? รายการที่ใช้หมวดหมู่นี้จะถูกย้ายไป "อื่นๆ"`, { danger: true });
    if (!ok) return;
    try {
      await deleteCategory(userId, id);
      await getCategories(userId);
      toast('ลบหมวดหมู่แล้ว');
      renderCategoryList();
    } catch (err) {
      console.error(err);
      toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
    }
  }

  renderBody();
}

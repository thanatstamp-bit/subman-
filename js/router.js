import { supabase } from './supabase.js';
import { store } from './store.js';
import { getSession, signIn, signUp, signInWithGoogle, signOut } from './auth.js';
import { bootstrapUser, getSettings, getCategories, processRenewalsAndTrials } from './api.js';
import { toast } from './ui/toast.js';
import { openExpenseModal } from './ui/modal.js';

import { render as renderDashboard } from './pages/dashboard.js';
import { render as renderExpenses } from './pages/expenses.js';
import { render as renderSubscriptions } from './pages/subscriptions.js';
import { render as renderReports } from './pages/reports.js';
import { render as renderSettings } from './pages/settings.js';
import { render as renderLandingPage } from './pages/landing.js';

const NAV_ITEMS = [
  { hash: '#/dashboard', label: 'Dashboard', icon: 'layout-grid' },
  { hash: '#/expenses', label: 'รายการทั้งหมด', icon: 'list' },
  { hash: '#/subscriptions', label: 'Subscriptions', icon: 'refresh-cw' },
  { hash: '#/reports', label: 'รายงาน', icon: 'bar-chart-3' },
  { hash: '#/settings', label: 'ตั้งค่า', icon: 'settings' },
];

const PAGE_TITLES = {
  '#/dashboard': 'Dashboard',
  '#/expenses': 'รายการทั้งหมด',
  '#/subscriptions': 'Subscriptions',
  '#/reports': 'รายงาน',
  '#/settings': 'ตั้งค่า',
};

const PAGES = {
  '#/dashboard': renderDashboard,
  '#/expenses': renderExpenses,
  '#/subscriptions': renderSubscriptions,
  '#/reports': renderReports,
  '#/settings': renderSettings,
};

const app = document.getElementById('app');

function currentHash() {
  const h = location.hash || '#/dashboard';
  return PAGES[h] ? h : '#/dashboard';
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

// ---------- Landing page ----------
let loggedOutView = null;

function renderLanding() {
  loggedOutView = 'landing';
  renderLandingPage(app);
  refreshIcons();
}

function loggedOutViewFor(hash) {
  if (hash === '#/login') return 'login';
  if (hash === '#/register') return 'register';
  return 'landing';
}

function renderLoggedOutView(view) {
  if (view === 'login') renderLogin();
  else if (view === 'register') renderRegister();
  else renderLanding();
}

function renderLoggedOutRoute() {
  renderLoggedOutView(loggedOutViewFor(location.hash));
}

// ---------- Login screen ----------
const LOGIN_FEATURES = [
  'ติดตาม Subscription อัตโนมัติ',
  'แจ้งเตือนก่อนครบกำหนด',
  'สรุปรายจ่ายรายเดือน',
];

function renderLogin() {
  loggedOutView = 'login';
  app.innerHTML = `
    <div class="login-split">
      <div class="login-hero">
        <a href="#/" class="login-hero__brand">
          <img src="assets/logo-full.png" alt="Subman!" />
        </a>
        <div class="login-hero__mascot">
          <img src="assets/logo-full.png" alt="Subman!" />
        </div>
        <div class="login-hero__copy">
          <h2 class="login-hero__title">ควบคุมทุก Subscription ในที่เดียว</h2>
          <p class="login-hero__desc">ติดตามรายจ่าย วางแผนงบประมาณ รู้ทุก Subscription ของคุณ</p>
          <ul class="login-hero__features">
            ${LOGIN_FEATURES.map(f => `
              <li><span class="login-hero__check"><i data-lucide="check"></i></span><span>${f}</span></li>
            `).join('')}
          </ul>
          <div class="login-hero__trust">
            <div class="login-hero__avatars">
              <span class="login-hero__avatar"><i data-lucide="user"></i></span>
              <span class="login-hero__avatar"><i data-lucide="user"></i></span>
              <span class="login-hero__avatar"><i data-lucide="user"></i></span>
              <span class="login-hero__avatar"><i data-lucide="user"></i></span>
            </div>
            <span>ผู้ใช้งานกว่า 10,000+ คนไว้วางใจ</span>
          </div>
        </div>
      </div>
      <div class="login-panel">
        <div class="login-card">
          <div class="login-card__header">
            <div class="login-card__logo">
              <img src="assets/logo-full.png" alt="Subman!" />
            </div>
            <h1>ยินดีต้อนรับกลับ</h1>
            <p>เข้าสู่ระบบเพื่อจัดการ Subscription ของคุณ</p>
          </div>
          <button type="button" class="login-google-btn" id="google-btn">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v2.98h3.87c2.27-2.09 3.58-5.17 3.58-8.8z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.87-2.98c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.07A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.27 14.31A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.58.38-2.31V6.62H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.07z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.07C6.22 6.86 8.87 4.75 12 4.75z"/></svg>
            <span>เข้าสู่ระบบด้วย Google</span>
          </button>
          <div class="login-divider"><span>หรือ</span></div>
          <form id="login-form" novalidate>
            <div class="field">
              <label class="field__label" for="email">อีเมล</label>
              <input class="input login-input" type="email" id="email" name="email" placeholder="your@email.com" required autocomplete="username" />
            </div>
            <div class="field">
              <label class="field__label" for="password">รหัสผ่าน</label>
              <div class="login-password-field">
                <input class="input login-input" type="password" id="password" name="password" placeholder="••••••••" required autocomplete="current-password" />
                <button type="button" class="login-password-toggle" id="password-toggle" aria-label="แสดงรหัสผ่าน">
                  <i data-lucide="eye-off"></i>
                </button>
              </div>
            </div>
            <p class="field__error" id="login-error" style="display:none;"></p>
            <div class="login-options">
              <label class="login-checkbox">
                <input type="checkbox" />
                <span>จดจำฉัน</span>
              </label>
              <button type="button" class="btn-text" id="forgot-btn">ลืมรหัสผ่าน?</button>
            </div>
            <button type="submit" class="btn-primary login-submit" id="login-submit">เข้าสู่ระบบ</button>
          </form>
          <p class="login-signup">
            ยังไม่มีบัญชี?
            <a href="#/register" class="login-signup__link">สมัครสมาชิก</a>
          </p>
          <a href="#/" class="btn-text login-back">← กลับหน้าหลัก</a>
        </div>
      </div>
    </div>
  `;
  refreshIcons();

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');
  const passwordInput = document.getElementById('password');
  const passwordToggle = document.getElementById('password-toggle');

  passwordToggle.addEventListener('click', () => {
    const showing = passwordInput.type === 'text';
    passwordInput.type = showing ? 'password' : 'text';
    passwordToggle.innerHTML = `<i data-lucide="${showing ? 'eye-off' : 'eye'}"></i>`;
    refreshIcons();
  });

  document.getElementById('google-btn').addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch {
      toast('เข้าสู่ระบบด้วย Google ไม่สำเร็จ ลองอีกครั้ง', 'error');
    }
  });
  document.getElementById('forgot-btn').addEventListener('click', () => {
    toast('ฟีเจอร์นี้จะเปิดให้ใช้งานเร็วๆนี้');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="btn-spinner"></span> เข้าสู่ระบบ`;
    try {
      await signIn(form.email.value.trim(), form.password.value);
      await boot();
    } catch {
      errorEl.textContent = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'เข้าสู่ระบบ';
    }
  });
}

// ---------- Register screen ----------
function renderRegister() {
  loggedOutView = 'register';
  app.innerHTML = `
    <div class="login-split">
      <div class="login-hero">
        <a href="#/" class="login-hero__brand">
          <img src="assets/logo-full.png" alt="Subman!" />
        </a>
        <div class="login-hero__mascot">
          <img src="assets/logo-full.png" alt="Subman!" />
        </div>
        <div class="login-hero__copy">
          <h2 class="login-hero__title">สมัครสมาชิกวันนี้ เริ่มต้นชีวิตที่จัดการง่ายขึ้น</h2>
          <p class="login-hero__desc">ใช้ชีวิตให้สนุกไปกับ Subscription ของคุณ โดยไม่ต้องกังวลเรื่องค่าใช้จ่ายแฝง</p>
          <ul class="login-hero__features">
            ${LOGIN_FEATURES.map(f => `
              <li><span class="login-hero__check"><i data-lucide="check"></i></span><span>${f}</span></li>
            `).join('')}
          </ul>
          <div class="login-hero__trust">
            <div class="login-hero__avatars">
              <span class="login-hero__avatar"><i data-lucide="user"></i></span>
              <span class="login-hero__avatar"><i data-lucide="user"></i></span>
              <span class="login-hero__avatar"><i data-lucide="user"></i></span>
              <span class="login-hero__avatar"><i data-lucide="user"></i></span>
            </div>
            <span>ผู้ใช้งานกว่า 10,000+ คนไว้วางใจ</span>
          </div>
        </div>
      </div>
      <div class="login-panel">
        <div class="login-card">
          <div class="login-card__header">
            <div class="login-card__logo">
              <img src="assets/logo-full.png" alt="Subman!" />
            </div>
            <h1>สร้างบัญชีใหม่</h1>
            <p>เข้าร่วมกับเราเพื่อจัดการ Subscription ของคุณ</p>
          </div>
          <button type="button" class="login-google-btn" id="google-btn">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v2.98h3.87c2.27-2.09 3.58-5.17 3.58-8.8z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.87-2.98c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.07A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.27 14.31A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.58.38-2.31V6.62H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.07z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.07C6.22 6.86 8.87 4.75 12 4.75z"/></svg>
            <span>ลงทะเบียนด้วย Google</span>
          </button>
          <div class="login-divider"><span>หรือ</span></div>
          <form id="register-form" novalidate>
            <div class="field">
              <label class="field__label" for="fullname">ชื่อ-นามสกุล</label>
              <input class="input login-input" type="text" id="fullname" name="fullname" placeholder="เช่น สมชาย ใจดี" required />
            </div>
            <div class="field">
              <label class="field__label" for="reg-email">อีเมล</label>
              <input class="input login-input" type="email" id="reg-email" name="email" placeholder="your@email.com" required />
            </div>
            <div class="field">
              <label class="field__label" for="reg-password">รหัสผ่าน</label>
              <div class="login-password-field">
                <input class="input login-input" type="password" id="reg-password" name="password" placeholder="••••••••" required />
                <button type="button" class="login-password-toggle" data-target="reg-password" aria-label="แสดงรหัสผ่าน">
                  <i data-lucide="eye-off"></i>
                </button>
              </div>
            </div>
            <div class="field">
              <label class="field__label" for="reg-password-confirm">ยืนยันรหัสผ่าน</label>
              <div class="login-password-field">
                <input class="input login-input" type="password" id="reg-password-confirm" name="passwordConfirm" placeholder="••••••••" required />
                <button type="button" class="login-password-toggle" data-target="reg-password-confirm" aria-label="แสดงรหัสผ่าน">
                  <i data-lucide="eye-off"></i>
                </button>
              </div>
            </div>
            <p class="field__error" id="register-error" style="display:none;"></p>
            <label class="login-checkbox login-checkbox--terms">
              <input type="checkbox" id="terms" required />
              <span>ฉันยอมรับ <span class="login-terms-link">ข้อกำหนดการใช้งาน</span> และ <span class="login-terms-link">นโยบายความเป็นส่วนตัว</span></span>
            </label>
            <button type="submit" class="btn-primary login-submit" id="register-submit">สมัครสมาชิก</button>
          </form>
          <p class="login-signup">
            มีบัญชีอยู่แล้ว?
            <a href="#/login" class="login-signup__link">เข้าสู่ระบบ</a>
          </p>
          <a href="#/" class="btn-text login-back">← กลับหน้าหลัก</a>
        </div>
      </div>
    </div>
  `;
  refreshIcons();

  document.getElementById('google-btn').addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch {
      toast('ลงทะเบียนด้วย Google ไม่สำเร็จ ลองอีกครั้ง', 'error');
    }
  });

  document.querySelectorAll('.login-password-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.innerHTML = `<i data-lucide="${showing ? 'eye-off' : 'eye'}"></i>`;
      refreshIcons();
    });
  });

  const errorEl = document.getElementById('register-error');
  const registerSubmitBtn = document.getElementById('register-submit');

  function showRegisterError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';

    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;
    const termsAccepted = document.getElementById('terms').checked;

    if (!fullname || !email || !password) {
      showRegisterError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (password.length < 6) {
      showRegisterError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (password !== passwordConfirm) {
      showRegisterError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (!termsAccepted) {
      showRegisterError('กรุณายอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว');
      return;
    }

    registerSubmitBtn.disabled = true;
    registerSubmitBtn.innerHTML = `<span class="btn-spinner"></span> สมัครสมาชิก`;
    try {
      const { session } = await signUp(email, password, fullname);
      if (session) {
        await boot();
      } else {
        toast('สมัครสมาชิกสำเร็จ กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ');
        location.hash = '#/login';
      }
    } catch (err) {
      showRegisterError(err.message === 'User already registered' ? 'อีเมลนี้ถูกใช้งานแล้ว' : 'สมัครสมาชิกไม่สำเร็จ ลองอีกครั้ง');
      registerSubmitBtn.disabled = false;
      registerSubmitBtn.textContent = 'สมัครสมาชิก';
    }
  });
}

// ---------- App shell ----------
function userDisplayName() {
  const user = store.session?.user;
  if (!user) return '';
  return user.user_metadata?.full_name?.trim() || user.email?.split('@')[0] || 'ผู้ใช้';
}

function userInitial(name) {
  return Array.from(name.trim())[0]?.toUpperCase() || '?';
}

function renderShell() {
  const name = userDisplayName();
  const initial = userInitial(name);
  const email = store.session?.user?.email || '';

  app.innerHTML = `
    <div class="scrim" id="scrim"></div>
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar__logo-row">
          <img src="assets/logo.png" alt="" />
          <span class="sidebar__wordmark">Subman!</span>
        </div>
        <nav class="sidebar__nav" id="sidebar-nav">
          ${NAV_ITEMS.map(item => `
            <a class="sidebar__nav-item" href="${item.hash}" data-hash="${item.hash}">
              <i data-lucide="${item.icon}"></i>
              <span>${item.label}</span>
            </a>
          `).join('')}
        </nav>
        <div class="sidebar__footer">
          <button type="button" class="sidebar__user-row" id="user-menu-btn">
            <span class="sidebar__avatar">${initial}</span>
            <span>
              <div class="sidebar__user-name">${name}</div>
              <div class="sidebar__user-caption">${email}</div>
            </span>
          </button>
          <div class="sidebar__user-menu" id="user-menu" style="display:none;">
            <button type="button" id="logout-btn">ออกจากระบบ</button>
          </div>
        </div>
      </aside>

      <main class="app-main">
        <header class="page-header">
          <div class="page-header__left">
            <button class="hamburger-btn" id="hamburger-btn" aria-label="Menu"><i data-lucide="menu"></i></button>
            <h1 class="page-header__title" id="page-title"></h1>
            <div id="page-header-extra"></div>
          </div>
          <div id="page-header-action"></div>
        </header>
        <div class="page-content" id="view"></div>
      </main>
    </div>
  `;

  refreshIcons();

  // Sidebar user menu
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userMenu = document.getElementById('user-menu');
  userMenuBtn.addEventListener('click', () => {
    userMenu.style.display = userMenu.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', (e) => {
    if (!userMenuBtn.contains(e.target) && !userMenu.contains(e.target)) {
      userMenu.style.display = 'none';
    }
  });
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await signOut();
    location.hash = '#/';
    renderLanding();
  });

  // Responsive sidebar overlay
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');
  const hamburger = document.getElementById('hamburger-btn');
  function openSidebar() {
    sidebar.classList.add('is-open');
    scrim.classList.add('is-open');
  }
  function closeSidebar() {
    sidebar.classList.remove('is-open');
    scrim.classList.remove('is-open');
  }
  hamburger.addEventListener('click', openSidebar);
  scrim.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
  sidebar.querySelectorAll('.sidebar__nav-item').forEach(a => a.addEventListener('click', closeSidebar));
}

function updateActiveNav(hash) {
  document.querySelectorAll('.sidebar__nav-item').forEach(a => {
    a.classList.toggle('is-active', a.dataset.hash === hash);
  });
}

function updateHeader(hash) {
  document.getElementById('page-title').textContent = PAGE_TITLES[hash];
  const actionSlot = document.getElementById('page-header-action');
  const extraSlot = document.getElementById('page-header-extra');
  extraSlot.innerHTML = '';
  if (hash === '#/settings') {
    actionSlot.innerHTML = '';
  } else {
    actionSlot.innerHTML = `<button type="button" class="btn-primary" id="add-expense-btn"><i data-lucide="plus"></i> เพิ่มรายการ</button>`;
    refreshIcons();
    document.getElementById('add-expense-btn').addEventListener('click', () => {
      openExpenseModal({ onSaved: () => renderRoute(currentHash()) });
    });
  }
}

async function renderRoute(hash) {
  updateActiveNav(hash);
  updateHeader(hash);
  const container = document.getElementById('view');
  container.innerHTML = '';
  try {
    await PAGES[hash](container);
  } catch (err) {
    console.error(err);
    toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
  }
  refreshIcons();
}

window.addEventListener('hashchange', () => {
  if (!store.session) {
    const view = loggedOutViewFor(location.hash);
    if (view !== loggedOutView) renderLoggedOutView(view);
    return;
  }
  renderRoute(currentHash());
});

async function boot() {
  const session = await getSession();
  if (!session) {
    renderLoggedOutRoute();
    return;
  }

  renderShell();
  const container = document.getElementById('view');
  container.innerHTML = `<div class="skeleton" style="height: 200px;"></div>`;

  try {
    const userId = session.user.id;
    await bootstrapUser(userId);
    const settings = await getSettings(userId);
    await getCategories(userId);
    await processRenewalsAndTrials(userId, settings);
  } catch (err) {
    console.error(err);
    toast('เกิดข้อผิดพลาด ลองอีกครั้ง', 'error');
  }

  await renderRoute(currentHash());
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    location.hash = '#/';
    renderLanding();
  }
});

boot();

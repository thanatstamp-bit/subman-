import { supabase } from './supabase.js';
import { store } from './store.js';
import { getSession, signIn, signOut } from './auth.js';
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

function renderLoggedOutRoute() {
  if (location.hash === '#/login') {
    renderLogin();
  } else {
    renderLanding();
  }
}

// ---------- Login screen ----------
function renderLogin() {
  loggedOutView = 'login';
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <a href="#/" class="btn-text" style="align-self:flex-start;">← กลับหน้าหลัก</a>
        <img src="assets/logo.png" alt="Subman!" />
        <h1>เข้าสู่ระบบ</h1>
        <form id="login-form" novalidate>
          <div class="field">
            <label class="field__label" for="email">อีเมล</label>
            <input class="input" type="email" id="email" name="email" required autocomplete="username" />
          </div>
          <div class="field">
            <label class="field__label" for="password">รหัสผ่าน</label>
            <input class="input" type="password" id="password" name="password" required autocomplete="current-password" />
          </div>
          <p class="field__error" id="login-error" style="display:none;"></p>
          <button type="submit" class="btn-primary" id="login-submit" style="width:100%;">เข้าสู่ระบบ</button>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');

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

// ---------- App shell ----------
function renderShell() {
  const initial = 'ธ';

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
              <div class="sidebar__user-name">ธนกฤต</div>
              <div class="sidebar__user-caption">Premium Plan</div>
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
    const wantsLogin = location.hash === '#/login';
    if (wantsLogin && loggedOutView !== 'login') {
      renderLogin();
    } else if (!wantsLogin && loggedOutView !== 'landing') {
      renderLanding();
    }
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

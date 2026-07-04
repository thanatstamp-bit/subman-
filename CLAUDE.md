# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Subman! — a Thai-language subscription/fixed-cost expense tracker. Static, no-build frontend (vanilla JS ES modules + hand-written CSS) backed by Supabase (Postgres + Auth). There is no bundler, no framework, and no test suite — the only tooling is a static dev server and ESLint.

## Running it locally

There's no build step, but the app **must** be served over HTTP — `js/router.js` is loaded as `<script type="module">`, and module scripts are blocked under the `file://` origin. From the project root:

```
npm install   # once
npm run dev
```

Then open `http://localhost:8765/index.html`. `npm run lint` runs ESLint over `js/`; there is no test command configured in this repo.

Supabase credentials (URL + anon key) live in `js/config.js`, hardcoded and pointed at a single live project. The anon key is safe to expose — Row Level Security (`supabase-schema.sql`) is what actually restricts data per user. To change the schema, edit `supabase-schema.sql` and run it manually in the Supabase SQL editor (no migration tooling); a Supabase MCP server is also configured in `.mcp.json` against the same project ref.

## Architecture

### Routing & app states

`js/router.js` is a hand-rolled hash router and the composition root for four distinct states, chosen based on `store.session`:

- **Logged out, landing** (`js/pages/landing.js`) — marketing page at any hash other than `#/login`/`#/register`.
- **Logged out, login** (`renderLogin`, inline in `router.js`) — shown at `#/login`.
- **Logged out, register** (`renderRegister`, inline in `router.js`) — shown at `#/register`.
- **Logged in, app shell** (`renderShell`, inline in `router.js`) — sidebar + header chrome, with `PAGES[hash]` swapped into `#view`.

`loggedOutViewFor(hash)` maps a hash to `'landing' | 'login' | 'register'`, and a `loggedOutView` variable tracks which is currently mounted so the `hashchange` listener (and `renderLoggedOutView`) only re-render on an actual state transition — in-page anchors on the landing page (`#features`, `#pricing`, etc.) change the hash but must **not** trigger a re-render, or the browser's native anchor-scroll breaks. Keep this distinction in mind when touching landing-page nav links or adding another logged-out route.

Authenticated pages (`js/pages/dashboard.js`, `expenses.js`, `subscriptions.js`, `reports.js`, `settings.js`) all export a single `async function render(container)` that the router calls into `#view` on every route change; `landing.js` instead exports `render(root)` and replaces the whole `#app` root. Icons are Lucide, injected as `data-lucide="name"` attributes and rasterized by calling `window.lucide.createIcons()` after every DOM swap (`refreshIcons()` in the router) — an icon added via `innerHTML` without a following `refreshIcons()` call renders as an empty element.

`renderLogin` and `renderRegister` share one visual structure (`.login-split` → `.login-hero` + `.login-panel > .login-card`, styled in `pages.css`'s Login section) — treat them as one system when changing either. Several controls on both screens are intentionally non-functional pending real backend support (Google OAuth sign-in/up, "ลืมรหัสผ่าน?", the register submit itself, and the terms/privacy text, which are styled spans, not links): they call `toast('...เร็วๆนี้')` instead of doing anything. This is the same "coming soon" pattern used for the Pro/Business pricing buttons (`comingSoon` flag in `landing.js`'s `PLANS`, rendered `disabled`). When asked to make one of these real, grep for `เร็วๆนี้` / `comingSoon` to find all the placeholder spots.

### State & data layer

- `js/store.js` — the only mutable global state (`session`, `settings`, `categories`). A plain object, no reactivity; pages just read from it after their own `await`.
- `js/api.js` — the only module that talks to Supabase tables directly (expenses, categories, transactions, settings). All queries are scoped by `user_id`, matching the RLS policies in `supabase-schema.sql`.
- `js/auth.js` — thin wrapper over `supabase.auth` (session/signIn/signOut).
- `js/logic.js` — pure business-rule functions with no I/O: currency conversion, monthly-equivalent cost, renewal-date advancing, trial-expiry conversion, countdown color/label buckets. Comments reference spec section numbers (e.g. `§6.5`) from an external spec doc that isn't part of this repo — treat them as historical breadcrumbs, not links to a file that exists here.
- `js/format.js` — Thai/Buddhist-Era date formatting and money formatting. All "today" logic goes through `todayBangkok()` (Asia/Bangkok wall-clock date), not the browser's local timezone.

`processRenewalsAndTrials` (`js/api.js`, called once from `boot()` in `router.js` after auth) is the important side-effecting flow: it converts expired trials to active billing, then walks each active expense's `next_renewal_date` forward through elapsed cycles, inserting one `transactions` row per cycle. `transactions` is an append-only log the app writes to itself — it powers all "actuals" numbers (Reports 12-month trend, dashboard month-over-month deltas) and should never be hand-edited or treated as user-editable data.

### CSS structure

Split by concern and loaded in this cascade order (see `index.html`): `tokens.css` → `base.css` → `layout.css` → `components.css` → `pages.css`.

- `tokens.css` is **the only file allowed to contain hex colors** — everything else references `var(--...)`. The app shell's brand pink (`--pink-*` ramp, `--color-brand-*`) is distinct from the landing page's brand pink (`--landing-*` tokens) — the marketing design in Figma uses a different, more saturated pink than the in-app dashboard, so they're kept as separate token sets rather than overloading one.
- `layout.css` — app shell structural layout (sidebar, header, responsive grid rules).
- `components.css` — reusable widgets shared across authenticated pages (buttons, cards, modal, toast, table, inputs, donut/bar chart chrome).
- `pages.css` — page-specific rules, one commented section per page (Login, Reports, Settings, Subscriptions, Landing, etc.). The landing page has its own button/card classes (`landing-btn`, `landing-feature-card`, ...) instead of reusing the in-app `.btn-primary`/`.card` classes, since it's visually a distinct marketing surface with pill-shaped buttons at a different scale.

### Design-to-code (Figma)

This project has previously been built out from Figma designs via the Figma MCP server (`mcp__figma__*`). When implementing a new Figma frame: pull design context, then adapt colors/text to the existing token and page-section conventions above rather than introducing raw hex values or a parallel styling system. Icon-shaped raster exports (checkmarks, bell, etc.) should be replaced with the project's existing Lucide icons rather than downloaded as images; only genuinely photographic/illustrative content (mockup screenshots, avatars, the mascot logo) should be downloaded into `assets/`.

The mascot artwork exists in two crops in `assets/` — pick based on the render size, not by copying whatever a given Figma frame happens to use (Figma itself reuses one source image at wildly different scales):
- `logo.png` — mascot only, no wordmark, transparent background. For small icon contexts (~28–48px: app-shell sidebar, browser favicon) where the full lockup would be illegible.
- `logo-full.png` — full lockup (mascot + "Subman!" wordmark + tagline) baked into one image. For anywhere the mark renders large enough to read the wordmark (landing nav, login/register hero and card header) — pair it alone, not next to a redundant `<span>Subman!</span>`.

### Auth model vs. this Figma file

`supabase-schema.sql`/the original spec describe a **single-user, no-signup** app (one account, provisioned manually in the Supabase dashboard). The current Figma file nonetheless includes login *and* register screens, which have been implemented as real pages/UI per later product direction — but only email/password sign-in actually calls Supabase (`js/auth.js`'s `signIn`). Don't assume the presence of a `#/register` page means multi-tenant signup is live; check for an actual `supabase.auth.signUp()` call (there isn't one yet) before treating account creation as real.

### Data model (`supabase-schema.sql`)

Four tables — `categories`, `expenses`, `transactions`, `settings` — each with `user_id` and an RLS policy of `auth.uid() = user_id`. `settings` is one row per user (currency, USD→THB rate, reminder windows). Expenses have `billing_cycle` (monthly/quarterly/yearly), optional trial fields (`is_trial`, `trial_end_date`), and `status` (active/paused/cancelled) — only `active` expenses count toward totals and renewals.

### Language conventions

UI copy is Thai throughout (labels, buttons, toasts, error messages); code comments and identifiers are English. Keep new user-facing strings in Thai to match the existing app.

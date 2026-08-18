---
name: redesign-saas-ui
description: Produces a written plan (no code changes) for redesigning this app's Vue 3 UI into a modern SaaS-style interface with a left vertical sidebar nav instead of the top nav bar, a fresh SaaS color palette, and consistent spacing/typography. Use when the user asks to redesign, restyle, or modernize the UI, or specifically to replace the top nav with a sidebar.
---

# Redesign: SaaS Sidebar UI

This skill produces a **written redesign plan only** — it never edits `.vue`, `.js`, or `.css`
files itself. Its output is a design/migration document the user reviews and approves before
any implementation work starts. When the user later asks to *implement* the plan, that work
must follow this repo's mandatory rule: any creation or edit of a `.vue` file is delegated to
the `vue-expert` subagent.

## When to use this skill

Invoke this when the user asks to redesign, restyle, "modernize," or "SaaS-ify" the app's UI,
or specifically to swap the current top nav bar (`client/src/App.vue`) for a left sidebar.

## Step 1 — Inventory the current UI

Before designing anything, read the current structure so the plan is grounded in what actually
exists, not assumptions:

- `client/src/App.vue` — shell layout, current top-nav markup, and every global CSS rule
  (these globals are the de facto design system: colors, radii, shadows, spacing values).
- `client/src/views/*.vue` — every page (Dashboard, Inventory, Orders, Spending, Demand,
  Restocking, Reports) and how each uses shared classes (`.card`, `.stat-card`, `.badge`,
  `.table-container`, etc.) vs. page-specific styles.
- `client/src/components/*.vue` — shared components, especially `FilterBar.vue`,
  `ProfileMenu.vue`, `LanguageSwitcher.vue`, and the modal components — these currently live in
  the top nav or directly under it and need a new home in a sidebar layout.
- `client/src/composables/useAuth.js` and `useI18n.js` — anything the sidebar/header will need
  to keep working (current user, language switcher).

Note every place spacing, color, or type values are hardcoded inline vs. defined once — the
plan should call out whether to introduce CSS custom properties (`:root { --space-2: ... }`,
`--color-*`) as part of the migration, since none exist today.

## Step 2 — Design the new layout

Produce a plan covering these sections. Do not skip any — an incomplete plan is not "done."

### 1. Sidebar navigation
- Fixed-width left sidebar (recommend a specific width, e.g. `240px`, and a collapsed-state
  width if collapse is proposed).
- What moves into the sidebar: logo/company name, the 7 nav links currently in `.nav-tabs`
  (Overview, Inventory, Orders, Finance, Demand Forecast, Restocking, Reports), active-state
  styling (replace the current bottom-border active indicator with a sidebar-appropriate
  treatment — e.g. left accent bar + filled background).
- What stays in a slim top bar vs. moves into/under the sidebar: `LanguageSwitcher`,
  `ProfileMenu`, and where `FilterBar` (global filters) should now live given the new layout
  (top bar under the header, or docked under the sidebar's page header).
- Responsive behavior: what happens below a defined breakpoint (collapse to icons-only,
  or collapse to an overlay/hamburger drawer) — pick one and specify the breakpoint.

### 2. Color palette (fresh SaaS palette, replacing current tokens)
- Full palette proposal (neutral scale, primary/brand, and semantic success/warning/
  danger/info) as concrete hex values, explicitly called out as CSS custom properties to
  add, e.g. `--color-bg`, `--color-surface`, `--color-border`, `--color-text-primary`,
  `--color-text-secondary`, `--color-primary`, `--color-primary-hover`, plus the four status
  colors used today by `.badge.*` and `.stat-card.*`.
- Map every existing hardcoded color in `App.vue`'s `<style>` block (e.g. `#0f172a`,
  `#64748b`, `#2563eb`, `#059669`, `#dc2626`, `#ea580c`) to its new token so nothing is missed.

### 3. Spacing & typography scale
- A single spacing scale (e.g. 4px base: 4/8/12/16/24/32/48) expressed as CSS custom
  properties, and which current ad-hoc values (`1.25rem`, `0.625rem`, `0.938rem`, etc.) map to
  which scale step.
- A type scale (page title, card title, body, label/caption, stat value) with concrete
  size/weight/letter-spacing, mapped against current values in `.page-header h2`,
  `.card-title`, `.stat-value`, `.stat-label`.

### 4. Elevation & surfaces
- Card/surface treatment for the new layout (border vs. shadow vs. both), and whether the
  sidebar itself is flush, bordered, or elevated against the content area.

### 5. Per-view impact
For each file in `client/src/views/` and each shared component in `client/src/components/`,
state explicitly: **unchanged**, **restyled only** (new tokens, same structure), or
**restructured** (layout/markup changes needed) — with a one-line reason. Call out
`FilterBar.vue`, `ProfileMenu.vue`, and the modal components by name since they're most likely
to need structural changes when the shell layout changes.

### 6. Migration plan / sequencing
Ordered list of implementation steps (e.g. 1. introduce CSS custom properties in `App.vue`
without changing layout, 2. build sidebar shell + routing wiring, 3. move
FilterBar/ProfileMenu/LanguageSwitcher, 4. restyle shared classes, 5. per-view cleanup,
6. responsive/collapse behavior, 7. Playwright visual check against `http://localhost:3000`).
Flag any step that's risky to do in one pass vs. safe to bundle.

### 7. Open questions / risks
Anything that needs a decision before implementation can start cleanly (e.g. does the
sidebar need a collapsed/icon-only state? does `FilterBar` move per-page or stay global?
should mobile just be out of scope for this demo app?).

## Step 3 — Deliver the plan

Present the plan directly in the chat response as structured Markdown (headers matching
Step 2's sections). Do not create or write any files, and do not edit any `.vue`, `.js`, or
`.css` file — this skill's job ends at the plan. If the user then asks to implement it,
implementation is a separate step and must follow the repo's mandatory `vue-expert` delegation
rule for every `.vue` file touched.

---
name: vue-component-audit
description: Analyzes Vue 3 component structure under client/src and produces a written report (no code changes) of performance issues and code-reuse opportunities, with concrete file:line references and suggested fixes. Use when the user asks to analyze, audit, or find optimization/refactor opportunities in Vue components, or asks "how can we improve performance/reuse" in the frontend.
---

# Vue Component Audit

This skill produces a **written analysis report only** — it never edits `.vue`, `.js`, or `.css`
files itself. Its output is a findings document the user reviews before any implementation
work starts. If the user later asks to *apply* a suggestion, that work must follow this repo's
mandatory rule: any creation or edit of a `.vue` file is delegated to the `vue-expert` subagent.

## Scope

- Default scope is the whole frontend: `client/src/views/`, `client/src/components/`,
  `client/src/composables/`, and `client/src/api.js`.
- If the user names a specific component, view, or directory, narrow the audit to that target
  only — do not silently expand scope back to the whole app.

## Step 1 — Inventory

Read before judging anything:

- `client/src/App.vue` — shell, global styles, shared classes reused by views.
- `client/src/views/*.vue` — each page, its data-loading pattern, and computed properties.
- `client/src/components/*.vue` — shared/reusable components (`FilterBar.vue`, chart
  components, modals, etc.) and how many views/components consume each one.
- `client/src/composables/*.js` — existing shared logic, and what's still duplicated in
  components instead of living here.
- `client/src/api.js` — API call shape, to spot duplicated fetch/filter logic that belongs in
  a composable instead of being copy-pasted per view.

This repo's own conventions (in `client/CLAUDE.md`) define what "correct" looks like here —
use them as the baseline, not generic Vue advice:
- Composition API only (flag any Options API or mixed-API component as a correctness issue,
  not just style).
- `ref()` for mutable state, `computed()` for derived state — flag heavy calculations done in
  a method instead of a computed, and computed properties that appear to have side effects.
- Unique `:key` in every `v-for` — flag any `:key="index"`.
- No direct prop mutation — flag any `props.x = ...` instead of `emit`.
- `v-show` for frequently toggled elements, `v-if` for rarely-shown/heavy content — flag the
  wrong choice when render cost is high (e.g. a chart or grid behind `v-if` that toggles often).
- `watchDebounced` for search/filter-driven watchers that trigger API calls — flag an
  undebounced `watch` doing that.
- `defineAsyncComponent` for heavy/rarely-visible components (large charts, modals, report
  views) not already lazy-loaded.
- Loading/error state pattern (`loading` + `error` + try/catch/finally) — flag any data load
  missing it.

## Step 2 — Performance pass

For each file in scope, check for and record (with `file:line`):

1. **Reactivity misuse** — computed-worthy logic living in a method (recomputed every render
   instead of cached); values wrapped in `ref()` that are actually derived and should be
   `computed()`; deeply nested reactive objects being reassigned wholesale where a targeted
   mutation would avoid a bigger re-render.
2. **List rendering** — `v-for` using array index as `:key`; large lists with no
   virtualization/pagination where the dataset can grow unbounded; unnecessary nested `v-for`
   that could be flattened or precomputed once in a `computed`.
3. **Unnecessary re-fetching** — `watch`/`watchEffect` that re-triggers an API call on every
   keystroke without `watchDebounced`; a `loadData()` called from multiple lifecycle hooks or
   watchers redundantly; missing memoization of a filtered/sorted derived list that gets
   recomputed identically across sibling components.
4. **Conditional rendering choice** — `v-if` on expensive-to-render content that toggles
   frequently (should be `v-show`); `v-show` on content that's rarely shown and expensive to
   keep mounted (should be `v-if` or `defineAsyncComponent`).
5. **Bundle/code-splitting** — large view/component with no dynamic `import()` /
   `defineAsyncComponent`, especially ones not needed on initial load (e.g. a Reports view,
   modal-only components).
6. **Prop/emit discipline** — direct prop mutation, or a child re-deriving data its parent
   already computed (duplicated computation instead of a passed-down prop).

## Step 3 — Code-reuse pass

For each file in scope, check for and record (with `file:line` for every duplicate site, not
just one):

1. **Duplicated data-loading pattern** — the same `loading`/`error`/try-catch-finally shape
   hand-written in 2+ views instead of extracted into a shared composable
   (e.g. `useAsyncData(fetcher)`).
2. **Duplicated filter/derivation logic** — the same filtering, sorting, or grouping logic
   (e.g. matching `client/CLAUDE.md`'s `useFilters` pattern) written inline in more than one
   component instead of living in one composable.
3. **Duplicated formatting** — currency/percentage/number formatting (`toLocaleString`,
   `toFixed`) repeated inline across components instead of one shared `formatters.js` helper.
4. **Duplicated markup** — near-identical template blocks (stat cards, badges, table headers,
   empty/loading states) repeated across views that could become one shared component with
   props/slots.
5. **Duplicated API call shape** — the same `axios`/`fetch` construction (base URL, param
   building) repeated in `api.js` call sites or components instead of a single shared helper.

Only flag genuine duplication (same logic/shape appearing 2+ times) — do not recommend
extracting something that only ever appears once. Match the "three similar lines is better
than a premature abstraction" bar: recommend extraction only when it actually reduces net
complexity, not just line count.

## Step 4 — Report format

Present the findings directly in the chat response as structured Markdown, grouped like this:

```markdown
## Vue Component Audit — <scope>

### Performance
1. **<short title>** — `client/src/views/Foo.vue:42`
   - Issue: <what's wrong, in this repo's own terms>
   - Suggestion: <concrete fix>
   - Impact: <low/medium/high, and why>

### Code reuse
1. **<short title>** — appears in `client/src/views/Foo.vue:10`, `client/src/views/Bar.vue:22`
   - Issue: <what's duplicated>
   - Suggestion: <what to extract it into, e.g. a named composable or component, with its
     proposed shape/signature>
   - Impact: <low/medium/high>

### Not flagged (for awareness)
- <anything that looks like an issue at a glance but is actually fine given this repo's
  scale/conventions, and why — keeps the report honest about what's out of scope>
```

Order findings within each section by impact (high to low). If a finding spans both
performance and reuse, list it once under whichever is the primary motivation and cross-
reference it from the other section.

## Step 5 — Deliver

Do not create or write any files, and do not edit any `.vue`, `.js`, or `.css` file — this
skill's job ends at the report. If the user asks to implement one or more findings afterward,
that is a separate step and must follow the repo's mandatory `vue-expert` delegation rule for
every `.vue` file touched.

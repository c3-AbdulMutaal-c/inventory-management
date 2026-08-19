<template>
  <!-- Semi-transparent backdrop for mobile off-canvas drawer -->
  <div
    v-if="isMobileOpen"
    class="sidebar-backdrop"
    @click="closeMobile"
  ></div>

  <aside
    class="sidebar"
    :class="{ 'sidebar-collapsed': effectiveCollapsed, 'sidebar-mobile-open': isMobileOpen }"
  >
    <div class="sidebar-header">
      <div class="logo" :title="effectiveCollapsed ? t('nav.companyName') : ''">
        <div class="logo-mark">{{ companyInitial }}</div>
        <div v-if="!effectiveCollapsed" class="logo-text">
          <h1>{{ t('nav.companyName') }}</h1>
          <span class="subtitle">{{ t('nav.subtitle') }}</span>
        </div>
      </div>
      <button
        v-if="isMobileOpen"
        class="mobile-close-btn"
        title="Close menu"
        @click="closeMobile"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <nav class="sidebar-nav">
      <router-link
        v-for="link in navLinks"
        :key="link.path"
        :to="link.path"
        class="nav-link"
        :class="{ active: $route.path === link.path }"
        :title="effectiveCollapsed ? link.label : ''"
        @click="closeMobile"
      >
        <span class="nav-icon" v-html="link.icon"></span>
        <span v-if="!effectiveCollapsed" class="nav-label">{{ link.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <button
        class="collapse-toggle"
        :title="effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleCollapsed"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          class="chevron-icon"
          :class="{ 'chevron-flipped': effectiveCollapsed }"
        >
          <path d="M11 4L6 9L11 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span v-if="!effectiveCollapsed" class="collapse-label">Collapse</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useSidebar } from '../composables/useSidebar'

const { t } = useI18n()
const { isCollapsed, isMobile, isMobileOpen, toggleCollapsed, closeMobile } = useSidebar()

// The mobile off-canvas drawer always renders fully expanded (icon + label),
// regardless of the persisted/auto collapsed preference. `isMobile` is now
// live viewport-width state shared from useSidebar() (single resize listener).
const effectiveCollapsed = computed(() => (isMobile.value ? false : isCollapsed.value))

const companyInitial = computed(() => {
  const name = t('nav.companyName')
  return name ? name.charAt(0).toUpperCase() : 'C'
})

// Inline stroke-based SVG icons (20px), matching the style already used in
// ProfileMenu.vue / LanguageSwitcher.vue
const icons = {
  grid: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>',
  box: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L17 5.5V14.5L10 18L3 14.5V5.5L10 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M3 5.5L10 9L17 5.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 9V18" stroke="currentColor" stroke-width="1.5"/></svg>',
  receipt: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 2H15V18L13 16.5L11 18L9 16.5L7 18L5 16.5V2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7.5 6H12.5M7.5 9.5H12.5M7.5 13H10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  coin: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 6.5V13.5M12 8C12 6.89543 11.1046 6.5 10 6.5C8.89543 6.5 8 6.89543 8 8C8 9.10457 8.89543 9.5 10 9.5C11.1046 9.5 12 9.89543 12 11C12 12.1046 11.1046 12.5 10 12.5C8.89543 12.5 8 12.1046 8 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  trending: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 13L8 8L12 11L17 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 5H17V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  refresh: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10C4 6.68629 6.68629 4 10 4C12.2249 4 14.1637 5.20955 15.1955 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M16 10C16 13.3137 13.3137 16 10 16C7.77512 16 5.83628 14.7905 4.80448 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12.5 7H15.5V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.5 13H4.5V16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  document: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 2H12L16 6V18H4V2H6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 2V6H16" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 10H13M7 13H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
}

const navLinks = computed(() => [
  { path: '/', label: t('nav.overview'), icon: icons.grid },
  { path: '/inventory', label: t('nav.inventory'), icon: icons.box },
  { path: '/orders', label: t('nav.orders'), icon: icons.receipt },
  { path: '/spending', label: t('nav.finance'), icon: icons.coin },
  { path: '/demand', label: t('nav.demandForecast'), icon: icons.trending },
  { path: '/restocking', label: t('nav.restocking'), icon: icons.refresh },
  { path: '/reports', label: 'Reports', icon: icons.document }
])
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 240px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  z-index: 200;
  transition: width 0.2s ease, transform 0.2s ease;
}

.sidebar-collapsed {
  width: 64px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-3);
  min-height: 56px;
  border-bottom: 1px solid var(--color-border);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.logo-mark {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-primary);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
}

.logo-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.logo-text h1 {
  /* Shrunk from 1.0625rem so "Catalyst Components" fits on one line at the
     240px expanded sidebar width without truncating; letter-spacing tightened
     slightly to reclaim a bit more horizontal room. */
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.015em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logo-text .subtitle {
  /* Scaled down slightly to stay proportional to the smaller h1 above. */
  font-size: 0.6875rem;
  color: var(--color-text-tertiary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-close-btn {
  display: none;
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--space-1);
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: 8px;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.875rem;
  border-left: 3px solid transparent;
  transition: all 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
}

.nav-link:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-alt);
}

.nav-link.active {
  color: var(--color-primary);
  background: var(--color-primary-subtle);
  border-left-color: var(--color-primary);
}

.nav-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  padding: var(--space-3) var(--space-2);
  border-top: 1px solid var(--color-border);
}

.collapse-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: none;
  border-radius: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.15s ease;
}

.collapse-toggle:hover {
  background: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.chevron-icon {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.chevron-flipped {
  transform: rotate(180deg);
}

.collapse-label {
  white-space: nowrap;
}

.sidebar-backdrop {
  display: none;
}

/* Tablet: default icon-rail width already handled by useSidebar default state */

/* Mobile: off-canvas drawer. `effectiveCollapsed` is forced false below this
   breakpoint (see script), so the sidebar always renders full-width/expanded
   here — it just needs to slide in/out via transform. */
@media (max-width: 767px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar.sidebar-mobile-open {
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  }

  .mobile-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 15, 30, 0.4);
    z-index: 190;
  }
}
</style>

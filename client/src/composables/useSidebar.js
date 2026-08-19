import { ref, computed, onMounted, onUnmounted } from 'vue'

const STORAGE_KEY = 'sidebar-collapsed'
const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

// Shared sidebar state (singleton pattern, mirrors useFilters.js)
// Whether the user has ever manually toggled the sidebar. Once true, the
// manual preference (persisted below) always wins over the width-based auto
// default, exactly like before this change.
const hasManualPreference = ref(localStorage.getItem(STORAGE_KEY) !== null)
const manualCollapsed = ref(localStorage.getItem(STORAGE_KEY) === 'true')

// Live viewport width, kept up to date by a single shared resize listener
// (see subscriber refcount below) so the auto-collapse default reacts to
// resizing instead of only being computed once at module load.
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : TABLET_BREAKPOINT)

// Auto default based on live width: icon-rail on tablet range, expanded on
// desktop. Only used when the user hasn't manually toggled yet.
const autoCollapsed = computed(
  () => windowWidth.value >= MOBILE_BREAKPOINT && windowWidth.value < TABLET_BREAKPOINT
)

// Below this width the mobile off-canvas drawer takes over, always rendering
// full-width/expanded regardless of the collapsed preference.
const isMobile = computed(() => windowWidth.value < MOBILE_BREAKPOINT)

// Effective collapsed state: manual choice wins once set, otherwise follow
// the live auto default.
const isCollapsed = computed(() => (hasManualPreference.value ? manualCollapsed.value : autoCollapsed.value))

// Mobile off-canvas drawer open/closed state (not persisted)
const isMobileOpen = ref(false)

// Refcount so the shared resize listener is attached exactly once no matter
// how many components call useSidebar() (App.vue + Sidebar.vue today).
let listenerCount = 0
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

export function useSidebar() {
  onMounted(() => {
    if (listenerCount === 0) {
      window.addEventListener('resize', handleResize)
    }
    listenerCount++
  })

  onUnmounted(() => {
    listenerCount--
    if (listenerCount === 0) {
      window.removeEventListener('resize', handleResize)
    }
  })

  const toggleCollapsed = () => {
    // Capture the current effective value (which may still be following the
    // live auto default) before flipping hasManualPreference, otherwise
    // isCollapsed.value would already be reading the stale manual ref.
    const currentEffective = isCollapsed.value
    hasManualPreference.value = true
    manualCollapsed.value = !currentEffective
    localStorage.setItem(STORAGE_KEY, String(manualCollapsed.value))
  }

  const openMobile = () => {
    isMobileOpen.value = true
  }

  const closeMobile = () => {
    isMobileOpen.value = false
  }

  return {
    isCollapsed,
    isMobile,
    isMobileOpen,
    toggleCollapsed,
    openMobile,
    closeMobile
  }
}

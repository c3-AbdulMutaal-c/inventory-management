<template>
  <div class="app">
    <Sidebar />

    <div class="app-body" :class="{ 'app-body-collapsed': isCollapsed }">
      <header class="top-bar">
        <button class="hamburger-btn" title="Open menu" @click="openMobile">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
        <div class="top-bar-spacer"></div>
        <DarkModeToggle />
        <LanguageSwitcher />
        <ProfileMenu
          @show-profile-details="showProfileDetails = true"
          @show-tasks="showTasks = true"
        />
      </header>
      <FilterBar />
      <main class="main-content">
        <router-view />
      </main>
    </div>

    <ProfileDetailsModal
      :is-open="showProfileDetails"
      @close="showProfileDetails = false"
    />

    <TasksModal
      :is-open="showTasks"
      :tasks="tasks"
      @close="showTasks = false"
      @add-task="addTask"
      @delete-task="deleteTask"
      @toggle-task="toggleTask"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { api } from './api'
import { useAuth } from './composables/useAuth'
import { useI18n } from './composables/useI18n'
import { useSidebar } from './composables/useSidebar'
import FilterBar from './components/FilterBar.vue'
import ProfileMenu from './components/ProfileMenu.vue'
import ProfileDetailsModal from './components/ProfileDetailsModal.vue'
import TasksModal from './components/TasksModal.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import Sidebar from './components/Sidebar.vue'
import DarkModeToggle from './components/DarkModeToggle.vue'

export default {
  name: 'App',
  components: {
    FilterBar,
    ProfileMenu,
    ProfileDetailsModal,
    TasksModal,
    LanguageSwitcher,
    Sidebar,
    DarkModeToggle
  },
  setup() {
    const { currentUser } = useAuth()
    const { t } = useI18n()
    const { isCollapsed, openMobile } = useSidebar()
    const showProfileDetails = ref(false)
    const showTasks = ref(false)
    const apiTasks = ref([])

    // Merge mock tasks from currentUser with API tasks
    const tasks = computed(() => {
      return [...currentUser.value.tasks, ...apiTasks.value]
    })

    const loadTasks = async () => {
      try {
        apiTasks.value = await api.getTasks()
      } catch (err) {
        console.error('Failed to load tasks:', err)
      }
    }

    const addTask = async (taskData) => {
      try {
        const newTask = await api.createTask(taskData)
        // Add new task to the beginning of the array
        apiTasks.value.unshift(newTask)
      } catch (err) {
        console.error('Failed to add task:', err)
      }
    }

    const deleteTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const isMockTask = currentUser.value.tasks.some(t => t.id === taskId)

        if (isMockTask) {
          // Remove from mock tasks
          const index = currentUser.value.tasks.findIndex(t => t.id === taskId)
          if (index !== -1) {
            currentUser.value.tasks.splice(index, 1)
          }
        } else {
          // Remove from API tasks
          await api.deleteTask(taskId)
          apiTasks.value = apiTasks.value.filter(t => t.id !== taskId)
        }
      } catch (err) {
        console.error('Failed to delete task:', err)
      }
    }

    const toggleTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const mockTask = currentUser.value.tasks.find(t => t.id === taskId)

        if (mockTask) {
          // Toggle mock task status
          mockTask.status = mockTask.status === 'pending' ? 'completed' : 'pending'
        } else {
          // Toggle API task
          const updatedTask = await api.toggleTask(taskId)
          const index = apiTasks.value.findIndex(t => t.id === taskId)
          if (index !== -1) {
            apiTasks.value[index] = updatedTask
          }
        }
      } catch (err) {
        console.error('Failed to toggle task:', err)
      }
    }

    onMounted(loadTasks)

    return {
      t,
      isCollapsed,
      openMobile,
      showProfileDetails,
      showTasks,
      tasks,
      addTask,
      deleteTask,
      toggleTask
    }
  }
}
</script>

<style>
:root {
  /* neutrals */
  --color-bg: #f8f9fc;
  --color-surface: #ffffff;
  --color-surface-alt: #f4f5f9;
  --color-border: #e4e5ee;
  --color-border-strong: #d3d5e3;
  --color-text-primary: #16162a;
  --color-text-secondary: #5c5e78;
  --color-text-tertiary: #8b8da8;

  /* primary (indigo/violet) */
  --color-primary: #5b5bf6;
  --color-primary-hover: #4747e0;
  --color-primary-subtle: #edecff;
  --color-primary-strong: #3a3ad1;

  /* semantic status */
  --color-success: #16a34a;
  --color-success-subtle: #dcfce7;
  --color-warning: #d97706;
  --color-warning-subtle: #fef3c7;
  --color-danger: #dc2626;
  --color-danger-subtle: #fee2e2;
  --color-info: #5b5bf6;
  --color-info-subtle: #edecff;

  /* spacing (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
}

/* Dark mode: overrides the same variable set above. Applied via a `dark`
   class on <html> (toggled by useDarkMode.js) so every component that
   already reads var(--color-*) automatically re-themes with no per-view
   changes needed. Semantic accent colors (primary/success/warning/danger/
   info) are lightened for contrast against the dark surfaces, and their
   "subtle" badge backgrounds switch to low-alpha tints instead of solid
   pastels so they read correctly on dark cards. */
html.dark {
  /* neutrals */
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-surface-alt: #263449;
  --color-border: #334155;
  --color-border-strong: #475569;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #cbd5e1;
  --color-text-tertiary: #94a3b8;

  /* primary (indigo/violet), lightened for dark backgrounds */
  --color-primary: #818cf8;
  --color-primary-hover: #a5b4fc;
  --color-primary-subtle: rgba(129, 140, 248, 0.16);
  --color-primary-strong: #c7d2fe;

  /* semantic status, lightened + tinted subtle backgrounds */
  --color-success: #4ade80;
  --color-success-subtle: rgba(74, 222, 128, 0.16);
  --color-warning: #fbbf24;
  --color-warning-subtle: rgba(251, 191, 36, 0.16);
  --color-danger: #f87171;
  --color-danger-subtle: rgba(248, 113, 113, 0.16);
  --color-info: #818cf8;
  --color-info-subtle: rgba(129, 140, 248, 0.16);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: var(--color-bg);
  color: var(--color-text-secondary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app {
  display: flex;
  min-height: 100vh;
}

/* Right-hand column offset to make room for the fixed sidebar (240px
   expanded / 64px collapsed). Reactive to useSidebar() collapsed state. */
.app-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  margin-left: 240px;
  transition: margin-left 0.2s ease;
}

.app-body-collapsed {
  margin-left: 64px;
}

.top-bar {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-5);
  gap: var(--space-3);
}

.hamburger-btn {
  display: none;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: 6px;
}

.hamburger-btn:hover {
  background: var(--color-surface-alt);
}

.top-bar-spacer {
  flex: 1;
}

.main-content {
  flex: 1;
  width: 100%;
  padding: var(--space-6) var(--space-5);
}

.page-header {
  margin-bottom: var(--space-6);
}

.page-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  letter-spacing: -0.02em;
}

.page-header p {
  color: var(--color-text-secondary);
  font-size: 0.938rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

.stat-card {
  background: var(--color-surface);
  padding: var(--space-5);
  border-radius: 10px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.stat-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.stat-label {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-3);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.stat-card.warning .stat-value {
  color: var(--color-warning);
}

.stat-card.success .stat-value {
  color: var(--color-success);
}

.stat-card.danger .stat-value {
  color: var(--color-danger);
}

.stat-card.info .stat-value {
  color: var(--color-info);
}

.card {
  background: var(--color-surface);
  border-radius: 10px;
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  margin-bottom: var(--space-5);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.card-title {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: var(--color-surface-alt);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  font-weight: 600;
  color: var(--color-text-tertiary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

td {
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

tbody tr {
  transition: background-color 0.15s ease;
}

tbody tr:hover {
  background: var(--color-surface-alt);
}

.badge {
  display: inline-block;
  padding: 0.313rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.badge.success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.badge.warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.badge.danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.badge.info {
  background: var(--color-info-subtle);
  color: var(--color-info);
}

.badge.increasing {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.badge.decreasing {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.badge.stable {
  background: var(--color-primary-subtle);
  color: var(--color-primary-strong);
}

.badge.high {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.badge.medium {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.badge.low {
  background: var(--color-info-subtle);
  color: var(--color-info);
}

.loading {
  text-align: center;
  padding: var(--space-7);
  color: var(--color-text-secondary);
  font-size: 0.938rem;
}

.error {
  background: var(--color-danger-subtle);
  border: 1px solid var(--color-danger-subtle);
  color: var(--color-danger);
  padding: var(--space-4);
  border-radius: 8px;
  margin: var(--space-4) 0;
  font-size: 0.938rem;
}

/* Tablet: icon-rail default handled by useSidebar; keep top bar visible */
@media (max-width: 1023px) {
  .main-content {
    padding: var(--space-5) var(--space-4);
  }
}

/* Mobile: sidebar becomes an off-canvas drawer, so the body no longer needs
   a left margin, and the hamburger button (which opens the drawer) appears. */
@media (max-width: 767px) {
  .app-body,
  .app-body-collapsed {
    margin-left: 0;
  }

  .hamburger-btn {
    display: flex;
  }
}
</style>

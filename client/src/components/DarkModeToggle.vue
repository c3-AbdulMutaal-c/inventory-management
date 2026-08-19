<template>
  <button
    class="dark-mode-toggle"
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleDarkMode"
  >
    <!-- Sun icon shown in dark mode (click to go light) -->
    <svg v-if="isDark" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle
        cx="10"
        cy="10"
        r="3.5"
        stroke="currentColor"
        stroke-width="1.5"
      />
      <path
        d="M10 2.5V4.5M10 15.5V17.5M2.5 10H4.5M15.5 10H17.5M4.7 4.7L6.1 6.1M13.9 13.9L15.3 15.3M15.3 4.7L13.9 6.1M6.1 13.9L4.7 15.3"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
    <!-- Moon icon shown in light mode (click to go dark) -->
    <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M17 11.5A7.5 7.5 0 1 1 8.5 3a6 6 0 0 0 8.5 8.5Z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<script setup>
import { useDarkMode } from "../composables/useDarkMode";

const { isDark, toggleDarkMode } = useDarkMode();
</script>

<style scoped>
.dark-mode-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.dark-mode-toggle:hover {
  background: var(--color-surface-alt);
  border-color: var(--color-border-strong);
}
</style>

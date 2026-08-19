import { ref, watchEffect } from "vue";

const STORAGE_KEY = "dark-mode";

// Shared dark-mode state (singleton pattern, mirrors useSidebar.js). Initial
// value is read from localStorage so the preference survives reloads; falls
// back to the OS-level preference on first-ever visit.
const prefersDark =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
const stored =
  typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
const isDark = ref(stored !== null ? stored === "true" : prefersDark);

// Keep the `dark` class on <html> in sync with isDark whenever it changes,
// and persist the choice so it survives a page reload.
watchEffect(() => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", isDark.value);
  localStorage.setItem(STORAGE_KEY, String(isDark.value));
});

export function useDarkMode() {
  const toggleDarkMode = () => {
    isDark.value = !isDark.value;
  };

  return {
    isDark,
    toggleDarkMode,
  };
}

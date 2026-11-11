/**
 * Light / dark mode. The choice is saved in localStorage and applied by adding
 * the class "dark" to <html>, which switches the CSS variables in globals.css.
 */
import { useSyncExternalStore } from "react";

import { THEME_STORAGE_KEY as STORAGE_KEY } from "./theme-script";

export type Theme = "light" | "dark";

const CHANGE_EVENT = "themechange";

export function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage can be blocked (private mode) - the theme still works for this visit
  }
  window.dispatchEvent(new Event(CHANGE_EVENT)); // tell useTheme() to re-read
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/**
 * The current theme, kept in sync with setTheme().
 * useSyncExternalStore reads a value that lives outside React (the <html> class).
 * On the server there is no document, so it renders "light" first and updates
 * right after loading - without a hydration mismatch.
 */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "light");
}

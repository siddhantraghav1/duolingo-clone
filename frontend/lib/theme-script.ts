/**
 * Kept separate from theme.ts on purpose: the root layout is a Server Component,
 * and theme.ts uses a client-only React hook. This file has no React imports,
 * so the server can import it safely.
 */
export const THEME_STORAGE_KEY = "theme";

/** Inline script for the root layout: applies the saved theme before the page paints. */
export const THEME_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

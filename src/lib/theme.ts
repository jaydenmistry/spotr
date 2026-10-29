export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "spotr-theme";

/**
 * Runs before first paint (inlined in app/layout.tsx) so a light-mode user
 * never sees a dark flash. Dark is the default, so only "light" is applied.
 * Lives outside the "use client" provider so the server layout can import it.
 */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

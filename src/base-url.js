/** Base URL for static assets (seed data, mana SVGs). Works in Vite dev/build and raw GitHub Pages. */
export function appBaseUrl() {
  if (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) {
    return import.meta.env.BASE_URL;
  }

  const { pathname } = window.location;
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] || "";

  // Project pages: /EDHLOG/ or /EDHLOG/index.html
  if (segments.length && !last.includes(".")) {
    return `/${segments[0]}/`;
  }

  return "./";
}

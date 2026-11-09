/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** The commit and time of this build (catalog/vite.config.ts). */
declare const __SITE_BUILD__: string;
/** The manifest id this build ships. */
declare const __APP_ID__: string;

declare module 'virtual:courses' {
  const courses: import('../registry').CatalogEntry[];
  export default courses;
  export const map: import('../registry').CatalogMap;
}

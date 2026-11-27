/** package.json's version, injected by Vite (see `define` in vite.config.ts). */
declare const __APP_VERSION__: string;

/** The site's encyclopedia: every course's entries and every course's lessons, read by Didactics' build. */
declare module 'virtual:didactics/encyclopedia' {
  const data: import('didactics/encyclopedia').EncyclopediaData;
  export default data;
}

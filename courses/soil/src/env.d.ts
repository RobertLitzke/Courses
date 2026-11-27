/** package.json's version, injected by Vite (see `define` in vite.config.ts). */
declare const __APP_VERSION__: string;

/** The words written in Dirt's code, scanned by Didactics' build (didactics/vite). */
declare module 'virtual:didactics/code-text' {
  const code: import('didactics/code-text').CodeText;
  export default code;
}

/** The site's encyclopedia: every course's entries and every course's lessons, read by Didactics' build. */
declare module 'virtual:didactics/encyclopedia' {
  const data: import('didactics/encyclopedia').EncyclopediaData;
  export default data;
}

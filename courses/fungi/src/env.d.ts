/** package.json's version, injected by the build (didactics/vite). */
declare const __APP_VERSION__: string;

/** The words written in the code, scanned by the build, for the course file. */
declare module 'virtual:didactics/code-text' {
  const code: import('didactics/code-text').CodeText;
  export default code;
}

/** The site's encyclopedia: every course's entries and every course's lessons, read by Didactics' build. */
declare module 'virtual:didactics/encyclopedia' {
  const data: import('didactics/encyclopedia').EncyclopediaData;
  export default data;
}

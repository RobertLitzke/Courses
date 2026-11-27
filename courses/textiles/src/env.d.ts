/** package.json's version, injected by the build (didactics/vite). */
declare const __APP_VERSION__: string;

/** The words written in the code, scanned by the build, for the course file. */
declare module 'virtual:didactics/code-text' {
  const code: import('didactics/code-text').CodeText;
  export default code;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Workaround for @base-ui/utils/detectBrowser.js: it guards on
    // `typeof navigator !== 'undefined'` but then reads `navigator.userAgent`
    // unconditionally. Recent Node versions expose a global navigator object
    // WITHOUT a userAgent property, which crashed SSR/prerender of every page
    // touching base-ui components ("Cannot read properties of undefined
    // (reading 'includes')"). Define it before any component module loads.
    const nav = (globalThis as { navigator?: { userAgent?: string } }).navigator;
    if (nav && !nav.userAgent) {
      Object.defineProperty(nav, "userAgent", {
        value: `Mozilla/5.0 (compatible; Node.js/${process.version})`,
        configurable: true,
      });
    }
  }
}

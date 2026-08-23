// Patches @base-ui/utils/detectBrowser.js which reads
// `navigator.userAgent.includes(...)` whenever a global `navigator` exists.
// Node >= 21 exposes a global navigator WITHOUT `userAgent`, crashing SSR and
// `next build` prerendering with:
//   TypeError: Cannot read properties of undefined (reading 'includes')
//
// Wired via "postinstall" so it re-applies after every npm install.
const fs = require("node:fs");
const path = require("node:path");

const targets = [
  path.join(__dirname, "..", "node_modules", "@base-ui", "utils", "detectBrowser.js"),
  path.join(__dirname, "..", "node_modules", "@base-ui", "utils", "esm", "detectBrowser.js"),
];

let patchedAny = false;
for (const file of targets) {
  if (!fs.existsSync(file)) continue;
  let src = fs.readFileSync(file, "utf8");

  const broken = "exports.isJSDOM = userAgent.includes('jsdom/');";
  const fixed = "exports.isJSDOM = (userAgent || '').includes('jsdom/');";
  const esmBroken = "const isJSDOM = userAgent.includes('jsdom/');";
  const esmFixed = "const isJSDOM = (userAgent || '').includes('jsdom/');";

  if (src.includes(fixed) || src.includes(esmFixed)) {
    console.log("patch-base-ui: already patched:", path.relative(process.cwd(), file));
    patchedAny = true;
    continue;
  }
  if (src.includes(broken)) {
    fs.writeFileSync(file, src.replace(broken, fixed));
    console.log("patch-base-ui: patched (cjs):", path.relative(process.cwd(), file));
    patchedAny = true;
    continue;
  }
  if (src.includes(esmBroken)) {
    fs.writeFileSync(file, src.replace(esmBroken, esmFixed));
    console.log("patch-base-ui: patched (esm):", path.relative(process.cwd(), file));
    patchedAny = true;
    continue;
  }
  // Upstream may have changed — defensive fallback on the read itself.
  const before = "const userAgent = getUserAgent();";
  const after = "const userAgent = getUserAgent() || '';";
  if (src.includes(before)) {
    fs.writeFileSync(file, src.replace(before, after));
    console.log("patch-base-ui: patched via getUserAgent fallback:", path.relative(process.cwd(), file));
    patchedAny = true;
  } else {
    console.warn("patch-base-ui: pattern not found in", path.relative(process.cwd(), file), "— inspect manually");
  }
}
if (!patchedAny) {
  console.warn("patch-base-ui: no @base-ui/utils copies found");
}

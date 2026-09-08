"use client";

import { useEffect } from "react";

// Registers the service worker once on the client. updateViaCache: "none"
// ensures the browser always re-fetches the SW script itself, so a deploy
// is picked up promptly even if HTTP caching would otherwise hold the old
// version.
export function SWRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .catch(() => {
        // non-fatal
      });
  }, []);
  return null;
}

"use client";

import { useEffect } from "react";

// Registers the service worker once on the client.
export function SWRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // non-fatal
    });
  }, []);
  return null;
}

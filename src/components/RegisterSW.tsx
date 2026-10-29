"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/cards/sw.js", { scope: "/cards/" }).catch(() => {
      /* the app still works online without it */
    });
  }, []);
  return null;
}

"use client";

import { useEffect, useState } from "react";

/** Google Translate / Edge Translate mutate the DOM and break React exit animations */
export function isBrowserTranslated(): boolean {
  if (typeof document === "undefined") return false;
  const html = document.documentElement;
  return (
    html.classList.contains("translated-ltr") ||
    html.classList.contains("translated-rtl") ||
    html.getAttribute("lang")?.endsWith("-auto") === true
  );
}

export function useBrowserTranslated(): boolean {
  const [translated, setTranslated] = useState(
    () => typeof document !== "undefined" && isBrowserTranslated()
  );

  useEffect(() => {
    const update = () => setTranslated(isBrowserTranslated());
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "lang"],
    });

    return () => observer.disconnect();
  }, []);

  return translated;
}

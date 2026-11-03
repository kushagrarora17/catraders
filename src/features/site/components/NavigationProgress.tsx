"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import "./navigation-progress.css";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const indicator = useRef<HTMLDivElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const stop = () => {
      if (indicator.current) indicator.current.hidden = true;
      clearTimeout(timeout.current);
    };

    stop();

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;

      const destination = new URL(link.href);
      if (destination.origin !== location.origin ||
        (destination.pathname === location.pathname && destination.search === location.search)) return;

      if (indicator.current) indicator.current.hidden = false;
      clearTimeout(timeout.current);
      timeout.current = setTimeout(stop, 30_000);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", stop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", stop);
      stop();
    };
  }, [pathname, searchParams]);

  return (
    <div ref={indicator} hidden className="navigation-progress" role="status" aria-label="Loading page">
      <span className="navigation-progress-bar" />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}

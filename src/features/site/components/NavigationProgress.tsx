"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import "./navigation-progress.css";

function modifiedClick(event: MouseEvent) {
  return [event.defaultPrevented, event.button !== 0, event.metaKey, event.ctrlKey, event.shiftKey, event.altKey].some(Boolean);
}

const opensCurrentTab = (link: HTMLAnchorElement) => !link.target || link.target === "_self";

const closestAnchor = (target: EventTarget | null) => target instanceof Element ? target.closest("a[href]") : null;

function clickedLink(event: MouseEvent) {
  const link = closestAnchor(event.target);
  if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download")) return null;
  return opensCurrentTab(link) ? link : null;
}

function changesPage(destination: URL) {
  if (destination.origin !== location.origin) return false;
  return destination.pathname !== location.pathname || destination.search !== location.search;
}

function navigates(event: MouseEvent) {
  const link = clickedLink(event);
  return link && changesPage(new URL(link.href));
}

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
      if (modifiedClick(event)) return;
      if (!navigates(event)) return;

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

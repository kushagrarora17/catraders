"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function Turnstile({ siteKey, action }: { siteKey?: string; action: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready || !siteKey || !container.current || !window.turnstile) return;
    const api = window.turnstile;
    const id = api.render(container.current, {
      sitekey: siteKey,
      action,
      "error-callback": () => setError(true),
      callback: () => setError(false),
    });
    return () => api.remove(id);
  }, [ready, siteKey, action]);

  if (!siteKey) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
        onError={() => setError(true)}
      />
      <div ref={container} />
      {error && <p role="alert" className="text-sm text-destructive">Verification could not load. Please refresh the page and try again.</p>}
    </>
  );
}

"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { trackLead } from "@/lib/analytics";

const analyticsEnabled = () => process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && !posthog.has_opted_out_capturing();

export function useFormAnalytics(formType: "inquiry" | "quote") {
  const formRef = useRef<HTMLFormElement>(null);
  const viewed = useRef(false);
  const started = useRef(false);

  function capture(event: string, properties: Record<string, unknown> = {}) {
    try {
      posthog.capture(event, { form_type: formType, ...properties });
    } catch {
      // Analytics must never interrupt a submission.
    }
  }

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !viewed.current) {
        viewed.current = true;
        try {
          posthog.capture("form_viewed", { form_type: formType });
        } catch {
          // Analytics must never interrupt the form.
        }
        observer.disconnect();
      }
    });
    observer.observe(form);
    return () => observer.disconnect();
  });

  function start() {
    if (!viewed.current) {
      viewed.current = true;
      capture("form_viewed");
    }
    if (started.current) return;
    started.current = true;
    capture("form_started");
  }

  function headers(): Record<string, string> {
    try {
      if (!analyticsEnabled()) return {};
      const distinctId = posthog.get_distinct_id();
      if (!distinctId) return {};
      return {
        "X-POSTHOG-DISTINCT-ID": distinctId,
        "X-POSTHOG-SESSION-ID": posthog.get_session_id(),
      };
    } catch {
      return {};
    }
  }

  function reset() {
    viewed.current = false;
    started.current = false;
  }

  return { formRef, capture, start, headers, reset, lead: () => trackLead(formType) };
}

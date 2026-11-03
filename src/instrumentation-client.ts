import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (projectToken && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)) {
  posthog.init(projectToken, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://m.caelitelube.com",
    defaults: "2026-08-30",
  });
}

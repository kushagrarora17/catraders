# Post-launch checklist (new domain)

Things to do once the site is live on its own domain (e.g. `caelitelube.com`)
instead of `*.azurewebsites.net`.

## Domain cutover (do first)

- [ ] Bind the custom domain + managed TLS certificate to the App Service (Terraform in `iac/app`).
- [ ] Set `site_url` in `iac/app/terraform.tfvars` and the `SITE_URL` GitHub repo variable, then apply and redeploy.
      Canonical links, Open Graph, `robots.txt` and `sitemap.xml` all read `SITE_URL`.
- [ ] Redirect the `azurewebsites.net` host to the new domain so it isn't indexed twice.
- [ ] Optional: send email from a verified custom domain in Azure Communication Services
      instead of `DoNotReply@<id>.azurecomm.net` (`EMAIL_SENDER_ADDRESS`).

## PostHog

- [ ] Create a project (US or EU cloud) and add the key + host as env vars (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`).
- [ ] Add `posthog-js` with a client provider in `src/app/layout.tsx`. Check the Next 16 docs in `node_modules/next/dist/docs/` for `instrumentation-client`.
- [ ] Proxy ingestion through a Next rewrite (e.g. `/ingest`) so ad blockers don't drop events.
- [ ] Track the key events: inquiry submitted, quote list submitted, product viewed, "Get a Quote" clicked.
- [ ] Respect consent and privacy: decide on a cookie banner or cookieless mode, and update the privacy notice.

## Google Search Console

- [ ] Add a **Domain** property and verify it with a DNS TXT record (covers http/https and www).
- [ ] Submit `https://<domain>/sitemap.xml`.
- [ ] Run the Rich Results test on `/` to validate the LocalBusiness JSON-LD.
- [ ] Use URL Inspection to request indexing of `/` and `/products`.
- [ ] Optional: link Search Console to a Google Business Profile.

## Bing Webmaster Tools

- [ ] Import the site from Google Search Console, which is the quickest way to verify it. Otherwise verify with a DNS CNAME.
- [ ] Submit the sitemap.
- [ ] Optional: enable IndexNow for faster recrawls after catalog changes.

## reCAPTCHA

- [ ] Register the domain in reCAPTCHA (v3, invisible) and store the site and secret keys as app settings.
      Keep the secret out of Terraform state (ephemeral / `*_wo`).
- [ ] Add the token to `InquiryForm` and `QuoteForm`.
- [ ] Verify it server-side in `src/app/api/inquiries/route.ts` and `src/app/api/quotes/route.ts` before insert, rejecting low scores.
      Keep the existing honeypot as a second layer.
- [ ] Mention reCAPTCHA in the form footer or privacy notice, as Google's terms require if the badge is hidden.
- [ ] Consider Cloudflare Turnstile as a privacy-friendlier alternative.

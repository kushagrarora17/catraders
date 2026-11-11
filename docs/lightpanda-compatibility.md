# Lightpanda migration blocker (#86)

Status: **blocked; migration incomplete**. Tested 2026-11-11 on Linux x86_64,
Bun 1.4.2, Node 24.22.1, Playwright **1.64.1**, and Lightpanda **1.0.3**.
The existing Chromium suite and 85% full-source coverage gate remain in place.

## Reproduce

Use the exact [1.0.3 Linux x86_64 release artifact](https://github.com/lightpanda-io/browser/releases/tag/1.0.3),
not the moving nightly build. Its published SHA-256 is
`53eb34da09159dcf8f04865dbfe3e63e9a652062684495aa7ced5ddd7c82e8b0`.
The probe verifies both the artifact digest and installed Playwright version before execution.

```sh
bun install --frozen-lockfile
probe_dir=$(mktemp -d)
gh release download 1.0.3 --repo lightpanda-io/browser \
  --pattern lightpanda-x86_64-linux --dir "$probe_dir"
chmod +x "$probe_dir/lightpanda-x86_64-linux"
bun --no-env-file run probe:lightpanda "$probe_dir/lightpanda-x86_64-linux"
```

Requires OpenSSL to generate a disposable self-signed certificate. The probe uses
ephemeral loopback ports, no application server or database, and no project env files.
It launches Lightpanda with `serve` and connects with `chromium.connectOverCDP` to
its WebSocket endpoint, as described in the [upstream CDP guide](https://github.com/lightpanda-io/browser#start-a-cdp-server).
It prints JSON and intentionally exits **1** for unsupported capabilities.
It closes its browser, reaps its owned Lightpanda process, checks that CDP stopped,
stops both fixture servers, and removes its temporary certificate directory.
The downloaded binary remains in `probe_dir` for inspection or another run.

## Observed results

| Capability | Result |
| --- | --- |
| CDP health check and Playwright connection | Pass |
| External Turnstile script interception, fulfillment, callback and hidden input | Pass |
| Client JavaScript execution, label/role selectors, fill and click | Pass |
| Link navigation | Pass |
| Cookie and localStorage persistence across reload | Pass |
| Fresh sequential context has no prior cookies/localStorage | Pass |
| Self-signed HTTPS fixture with `ignoreHTTPSErrors` | Pass |
| Process cleanup after failed checks | Pass |
| Concurrent browser contexts | Fails: `Target.createBrowserContext`: `Cannot have more than one browser context at a time` |
| `page.coverage.startJSCoverage({ resetOnNavigation: false })` | Fails: `Profiler.enable` wasn't found |
| Direct `Profiler.enable`, `Profiler.startPreciseCoverage`, `Profiler.takePreciseCoverage` | Each fails: method wasn't found |
| Mobile flex drawer geometry | Fails: footer box `{ x: 0, y: 50, width: 5, height: 48 }`; expected `{ x: 0, y: 592, width: 390, height: 48 }` |

The mobile fixture has a 390×640 viewport, a 640px column flex container,
a scrollable `flex: 1; min-height: 0` body with 2000px content, and a 48px footer.
The footer must fill the container width and remain at its bottom. This exercises
the geometry behind the catalog's mobile Apply-button visibility assertion.
The probe also includes positive and offscreen negative `toBeInViewport` controls
after the box assertion; those controls are **not reached** with this release
because the box assertion fails first.

## Consequences and remaining validation

The production E2E fixture starts precise browser coverage before every test.
The missing Profiler methods block that fixture before app navigation, so replacing
Chromium would prevent the current coverage collection from running. Client coverage,
source-map accuracy, and unexecuted client files cannot be established with this release.
Server/build coverage alone does not satisfy the existing full-source gate.

The incorrect mobile geometry also prevents a faithful replacement for layout-sensitive
assertions. Concurrent contexts are an additional compatibility limitation; sequential
context isolation passed this synthetic check. These results do not prove React hydration,
real app/database isolation, trace usefulness, or full application compatibility.

Catalog, quote, inquiry/landing, analytics, SEO, OAuth, MCP, and API suites were not
rerun against Lightpanda because the required coverage fixture is already blocked.
No full-suite runtime, peak-memory, or reliability comparison is claimed: three-run
before/after measurements are deferred until an implementation can pass equivalent
assertions and collect equivalent coverage. Revisit the pin only when precise client
coverage and accurate geometry are available; rerun this probe before migrating the
fixture, local setup, or CI. Refs #86.

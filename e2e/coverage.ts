import type { CoverageReportOptions } from "monocart-coverage-reports";

// V8 coverage from three places is merged into one report over src/:
//   - the `next build` processes (prerendered pages run their server code at build time),
//   - the `next start` server process,
//   - the browser (Chromium's JS coverage, collected per test by the fixture in ./test.ts).
export const COVERAGE_DIR = "coverage/e2e";
export const RAW_BUILD_DIR = "coverage/e2e-raw/build";
export const RAW_SERVER_DIR = "coverage/e2e-raw/server";

/** Minimum line coverage of src/ for the run to pass. */
export const LINE_THRESHOLD = 85;

// Not app code: generated types, unit tests and the unit tests' fake Sanity client.
const EXCLUDED = new Set(["src/sanity/types.ts", "src/server/mcp/tools/fake-sanity.ts"]);

/** App source files that count towards coverage. */
export const isAppSource = (path: string) =>
  path.startsWith("src/") && /\.tsx?$/.test(path) && !path.endsWith(".test.ts") && !EXCLUDED.has(path);

export const coverageOptions: CoverageReportOptions = {
  name: "Catraders e2e coverage",
  outputDir: COVERAGE_DIR,
  reports: ["v8", "console-summary", "lcovonly", "json-summary"],
  // Compiled chunks (server and browser). Route entry stubs, externals and dependency-only chunks
  // have no source maps into src/, so skip them; dependencies inside app chunks are dropped by
  // sourceFilter.
  entryFilter: (entry) =>
    /\/(\.next\/server|_next\/static)\/chunks\//.test(entry.url) &&
    !/\[externals\]|_next-internal_|_actions_|\/node_modules_/.test(entry.url),
  // Source map paths look like `[project]/src/...`, `turbopack:///[project]/src/...` or `webpack://_N_E/./src/...`.
  sourcePath: (filePath) => {
    const index = filePath.indexOf("src/");
    return index >= 0 && !filePath.includes("node_modules") ? filePath.slice(index) : filePath;
  },
  sourceFilter: isAppSource,
};

// Merges the browser, build and server V8 coverage of a Playwright run into one report over src/
// and fails when line coverage is under LINE_THRESHOLD. Run after `playwright test` (the server
// writes its coverage when it shuts down at the end of the run).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import MCR from "monocart-coverage-reports";
import { COVERAGE_DIR, coverageOptions, isAppSource, LINE_THRESHOLD, RAW_BUILD_DIR, RAW_SERVER_DIR } from "./coverage";

const report = MCR({ ...coverageOptions, clean: false });
for (const dir of [RAW_BUILD_DIR, RAW_SERVER_DIR]) {
  if (!existsSync(dir) || !readdirSync(dir).length) {
    console.error(`No V8 coverage in ${dir}; did the app build and shut down cleanly?`);
    process.exit(1);
  }
  await report.addFromDir(dir);
}
const results = await report.generate();
if (!results) {
  console.error("No coverage data was collected.");
  process.exit(1);
}

// Source files no test touched never reach V8, so count them as fully uncovered.
const files = results.files.filter((file) => isAppSource(file.sourcePath));
const reported = new Set(files.map((file) => file.sourcePath));
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const untouched = walk("src").filter((path) => isAppSource(path) && !reported.has(path));

const covered = files.reduce((sum, file) => sum + file.summary.lines.covered, 0);
let total = files.reduce((sum, file) => sum + file.summary.lines.total, 0);
for (const path of untouched) total += readFileSync(path, "utf8").split("\n").filter((line) => line.trim()).length;
const pct = total ? (covered / total) * 100 : 0;

if (untouched.length) console.log(`\nFiles with no coverage at all (counted as uncovered):\n  ${untouched.join("\n  ")}`);
console.log(`\nLine coverage of src/: ${pct.toFixed(2)}% (${covered}/${total}); threshold ${LINE_THRESHOLD}%`);
console.log(`Report: ${COVERAGE_DIR}/index.html`);
if (pct < LINE_THRESHOLD) {
  console.error(`Line coverage ${pct.toFixed(2)}% is below the ${LINE_THRESHOLD}% threshold.`);
  process.exit(1);
}

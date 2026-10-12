import { rmSync } from "node:fs";
import { COVERAGE_DIR } from "./coverage";

// Runs after the web servers have started, so only the browser coverage cache and the previous
// report are cleared here; the raw V8 directories are cleared by `bun run test:e2e` beforehand.
export default function globalSetup() {
  rmSync(COVERAGE_DIR, { recursive: true, force: true });
}

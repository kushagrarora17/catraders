// Preloaded (NODE_OPTIONS=--import) into the app's Node processes during the e2e run. Next stops
// its build workers with SIGINT, which skips the V8 coverage Node writes on a normal exit, so
// flush it first. Exits as the default handler would unless the process handles the signal itself.
import { ChildProcess } from "node:child_process";
import v8 from "node:v8";

// Writing a worker's coverage takes up to a second. Next sends SIGINT again when the build exits,
// so the handler stays installed: without it a repeated signal would kill the worker mid-write.
let flushed = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (flushed) return;
    flushed = true;
    v8.takeCoverage();
    v8.stopCoverage(); // Already written; skip a second full write at exit.
    if (process.listenerCount(signal) === 1) process.exit(128 + (signal === "SIGINT" ? 2 : 15));
  });
}

// In the build process: jest-worker force-kills workers (SIGTERM after 500 ms, then SIGKILL) while
// they are still writing. They exit by themselves after the SIGINT above, so hold those kills back.
const kill = ChildProcess.prototype.kill;
ChildProcess.prototype.kill = function (signal) {
  if ((signal === "SIGTERM" || signal === "SIGKILL") && this.spawnargs?.some((arg) => arg.endsWith("processChild.js"))) {
    setTimeout(() => kill.call(this, signal), 30_000).unref();
    return true;
  }
  return kill.call(this, signal);
};

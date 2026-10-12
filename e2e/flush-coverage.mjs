// Preloaded (NODE_OPTIONS=--import) into the app's Node processes during the e2e run. Next stops
// its build workers with SIGINT, which skips the V8 coverage Node writes on a normal exit, so
// flush it first. Exits as the default handler would unless the process handles the signal itself.
import v8 from "node:v8";

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    v8.takeCoverage();
    if (process.listenerCount(signal) === 0) process.exit(128 + (signal === "SIGINT" ? 2 : 15));
  });
}

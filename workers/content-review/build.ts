import { mkdir, copyFile } from "node:fs/promises";
const outdir = "workers/content-review/dist";
await mkdir(outdir, {recursive: true});
await copyFile("workers/content-review/host.json", `${outdir}/host.json`);
await Bun.write(`${outdir}/package.json`, JSON.stringify({ private: true, type: "module", main: "index.js",
  engines: {node: ">=24"}, dependencies: {"@azure/functions": "^4.17.0"} }, null, 2));

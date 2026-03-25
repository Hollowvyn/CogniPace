const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const outdir = path.join(__dirname, ".tmp");
const outfile = path.join(outdir, "logic.test.cjs");

fs.rmSync(outdir, { recursive: true, force: true });
fs.mkdirSync(outdir, { recursive: true });

esbuild.buildSync({
  entryPoints: [path.join(__dirname, "logic.test.ts")],
  outfile,
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  logLevel: "silent"
});

const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
process.exit(result.status ?? 1);

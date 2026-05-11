const fs = require("fs");
const path = require("path");

const esbuild = require("esbuild");

const outdir = path.join(__dirname, "dist");
const publicDir = path.join(__dirname, "public");

async function build() {
  fs.rmSync(outdir, { recursive: true, force: true });

  await esbuild.build({
    entryPoints: {
      background: "src/extension/background/index.ts",
      content: "src/entrypoints/overlay.tsx",
      popup: "src/entrypoints/popup.tsx",
      dashboard: "src/entrypoints/dashboard.tsx",
      database: "src/entrypoints/libraryRedirect.ts",
      // PHASE-3-SMOKE: temporary entry for runtime verification of the
      // Drizzle-on-wasm wiring. Remove (along with dbSmoke.ts, dbSmoke.html)
      // before Phase 3 merges.
      dbSmoke: "src/entrypoints/dbSmoke.ts",
    },
    outdir,
    bundle: true,
    format: "iife",
    target: "chrome114",
    sourcemap: false,
    minify: true,
    loader: {
      ".sql": "text",
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    logLevel: "info",
  });

  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, outdir, { recursive: true });
  }

  // PHASE-3-SMOKE: copy the sqlite3.wasm binary next to the bundled JS
  // so @sqlite.org/sqlite-wasm's default locateFile() finds it via
  // the page-relative URL. Remove with the rest of the smoke wiring.
  const wasmSrc = path.join(
    __dirname,
    "node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm",
  );
  const wasmDest = path.join(outdir, "sqlite3.wasm");
  if (fs.existsSync(wasmSrc)) {
    fs.cpSync(wasmSrc, wasmDest);
  }

  console.log("Build complete. Load ./dist as unpacked extension.");
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});

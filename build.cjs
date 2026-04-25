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
    },
    outdir,
    bundle: true,
    format: "iife",
    target: "chrome114",
    sourcemap: false,
    minify: true,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    logLevel: "info",
  });

  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, outdir, { recursive: true });
  }
  console.log("Build complete. Load ./dist as unpacked extension.");
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});

const fs = require("fs");
const path = require("path");

const esbuild = require("esbuild");

const outdir = path.join(__dirname, "dist");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

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
    minify: false,
    logLevel: "info",
  });

  copyRecursive(path.join(__dirname, "public"), outdir);
  console.log("Build complete. Load ./dist as unpacked extension.");
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});

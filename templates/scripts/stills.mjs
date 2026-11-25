// usage: node scripts/stills.mjs <outPrefix> <frame,frame,...> [scale]  (bundles once, GPU via ANGLE, jpeg)
// Environment (all optional):
//   SHORT_COMP=<CompositionId>              composition to render; defaults to the only one registered in the entry
//   SHORT_ENTRY=src/sandboxes/<n>/index.tsx  render a sandbox copy instead of the main entry (src/index.ts)
//   CHROME_PATH=<path to chrome>             use an installed Chrome; defaults to Remotion's own headless browser
//   REMOTION_TMP=<folder on a big drive>     each bundle copies public/ (~1.3 GB) into the temp folder and never
//                                            deletes it, so point the temp folder somewhere with room
import fs from "node:fs";
import os from "node:os";
if (process.env.REMOTION_TMP) {
  fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true });
  process.env.TEMP = process.env.TMP = process.env.TMPDIR = process.env.REMOTION_TMP;
}
const { bundle } = await import("@remotion/bundler");
const { renderStill, selectComposition, getCompositions } = await import("@remotion/renderer");
const path = await import("node:path");

const [prefix, frames, scale = "0.5"] = process.argv.slice(2);
if (!prefix || !frames) {
  console.error("usage: node scripts/stills.mjs <outPrefix> <frame,frame,...> [scale]");
  process.exit(1);
}
const entry = process.env.SHORT_ENTRY || process.env.BRIDGE_ENTRY || "src/index.ts";
const browserExecutable = process.env.CHROME_PATH || null;
const chromiumOptions = { gl: "angle" };
fs.mkdirSync(path.dirname(path.resolve(prefix + "x")), { recursive: true });
console.log("temp folder:", os.tmpdir());

const serveUrl = await bundle({ entryPoint: path.resolve(entry), publicDir: path.resolve("public") });
let id = process.env.SHORT_COMP;
if (!id) {
  const comps = await getCompositions(serveUrl, { browserExecutable, chromiumOptions });
  if (comps.length !== 1) {
    console.error(`${entry} registers ${comps.length} compositions (${comps.map((c) => c.id).join(", ")}): set SHORT_COMP=<id>`);
    process.exit(1);
  }
  id = comps[0].id;
}
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale),
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000, onBrowserLog });
  console.log(id, "still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}

import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const source = "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs";
const target = "public/maplibre-gl-worker.mjs";

if (existsSync(source)) {
  mkdirSync("public", { recursive: true });
  copyFileSync(source, target);
}

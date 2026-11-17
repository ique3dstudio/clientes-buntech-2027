// Copia o worker do MapLibre para /public. O empacotador do Next não resolve a URL
// do worker sozinho ("Worker failed to load"), então apontamos para esta cópia.
import { cpSync, mkdirSync, existsSync } from "node:fs";

const origem = "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs";
if (existsSync(origem)) {
  mkdirSync("public/maplibre", { recursive: true });
  cpSync(origem, "public/maplibre/maplibre-gl-worker.mjs");
}

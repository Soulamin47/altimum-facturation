import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputFile = resolve(projectDir, "dist", "server", "index.js");

const files = [
  ["/index.html", "index.html", "text/html; charset=utf-8"],
  ["/styles.css", "styles.css", "text/css; charset=utf-8"],
  ["/app.js", "app.js", "text/javascript; charset=utf-8"],
  ["/assets/logo-altimum.png", "assets/logo-altimum.png", "image/png"],
  ["/assets/blueprint-bg-light.png", "assets/blueprint-bg-light.png", "image/png"],
  ["/assets/letterhead-bg.png", "assets/letterhead-bg.png", "image/png"],
  ["/assets/Museo300-Regular.woff", "assets/Museo300-Regular.woff", "font/woff"],
  ["/assets/Museo700-Regular.woff", "assets/Museo700-Regular.woff", "font/woff"]
];

const entries = await Promise.all(
  files.map(async ([route, relativePath, contentType]) => {
    const data = await readFile(resolve(projectDir, relativePath));
    return [route, [data.toString("base64"), contentType]];
  })
);

const workerSource = `const FILES = new Map(${JSON.stringify(entries)});

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const entry = FILES.get(pathname);

    if (!entry) {
      return new Response("Page introuvable", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }

    const [encoded, contentType] = entry;
    const cacheControl = pathname === "/index.html"
      ? "no-cache"
      : "public, max-age=86400";

    return new Response(decodeBase64(encoded), {
      headers: {
        "content-type": contentType,
        "cache-control": cacheControl,
        "x-content-type-options": "nosniff"
      }
    });
  }
};
`;

await rm(resolve(projectDir, "dist"), { recursive: true, force: true });
await mkdir(dirname(outputFile), { recursive: true });
await writeFile(outputFile, workerSource);

console.log(`Build créé : ${outputFile}`);

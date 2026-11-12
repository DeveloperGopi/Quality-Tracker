/**
 * Minify the finished Vite output one file at a time.
 *
 * Running esbuild's minifier inside the Vite process (or letting Vite spawn a
 * minifier service while the dev server is also resident) pushed this 2 GB
 * sandbox over its cgroup limit. By this point Rollup has exited and written
 * every chunk, so transforming files sequentially keeps the peak bounded and
 * retains normal production minification.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { transform } from "esbuild";

const assets = path.resolve("dist", "assets");
const entries = await readdir(assets, { withFileTypes: true });
const files = entries
  .filter((entry) => entry.isFile() && /\.(?:js|css)$/.test(entry.name))
  .map((entry) => path.join(assets, entry.name))
  .sort();

let before = 0;
let after = 0;
for (const file of files) {
  const source = await readFile(file, "utf8");
  before += Buffer.byteLength(source);
  const result = await transform(source, {
    loader: file.endsWith(".css") ? "css" : "js",
    minify: true,
    target: "esnext",
    legalComments: "none",
  });
  await writeFile(file, result.code);
  after += Buffer.byteLength(result.code);
}
const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
console.log(`✓ minified ${files.length} assets · ${size(before)} → ${size(after)}`);

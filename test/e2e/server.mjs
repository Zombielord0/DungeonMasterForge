import http from "node:http";
import { readFile } from "node:fs/promises";
import { NetlifyDB } from "@netlify/database-dev";
import pg from "pg";
import { handle } from "../../netlify/lib/api.mjs";

const [, , bundle, port = "8899"] = process.argv;
const ndb = new NetlifyDB();
const pool = new pg.Pool({ connectionString: await ndb.start(), max: 1 });
await ndb.applyMigrations("./netlify/database/migrations");

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname.startsWith("/api/")) {
    const m = /fake_uid=([^;]+)/.exec(req.headers.cookie || "");
    const user = m ? JSON.parse(decodeURIComponent(m[1])) : null;
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = await handle(new Request("http://x" + req.url, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined }), user, pool);
    res.writeHead(r.status, { "content-type": "application/json" }); res.end(await r.text()); return;
  }
  const file = url.pathname === "/portal.js" ? bundle : "public" + (url.pathname === "/" ? "/index.html" : url.pathname);
  try { const b = await readFile(file); const ext = file.slice(file.lastIndexOf(".") + 1), types = { js: "text/javascript", png: "image/png", webp: "image/webp", svg: "image/svg+xml", webmanifest: "application/manifest+json", json: "application/json", css: "text/css", mjs: "text/javascript", pdf: "application/pdf" }; res.writeHead(200, { "content-type": types[ext] || "text/html", ...(url.pathname === "/sw.js" ? { "cache-control": "no-cache" } : {}) }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(+port, () => console.log(`Forge test copy running: open http://localhost:${port} (stop with Ctrl+C)`));

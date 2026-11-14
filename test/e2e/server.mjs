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
  try { const b = await readFile(file); res.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : "text/html" }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(+port, () => console.log("ready on " + port));

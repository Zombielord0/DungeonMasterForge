// Runs every check in one go and prints one pass/fail list at the end:  npm run test:all
// Works on Windows, macOS and Linux (no bash needed).
//   npm run test:all                 every check, three at a time
//   npm run test:all -- --serial     one at a time (slower, steadier on a slow computer)
//   npm run test:all -- map tv       only the checks whose names contain "map" or "tv"
// A check that fails is run once more on its own, because the TV picture checks are sometimes slow
// in a headless browser. A check that only passes the second time is listed as "passed on retry".
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const args = process.argv.slice(2);
const serial = args.includes("--serial");
const only = args.filter(a => !a.startsWith("--"));
let names = ["test", ...Object.keys(pkg.scripts).filter(n => n.startsWith("test:") && n !== "test:all")];
if (only.length) names = names.filter(n => only.some(o => n.includes(o)));

function run(name) {
  return new Promise(resolve => {
    const t0 = Date.now(), child = spawn("npm", ["run", "--silent", name], { shell: true, env: process.env });
    let out = "";
    child.stdout.on("data", d => out += d);
    child.stderr.on("data", d => out += d);
    child.on("close", code => resolve({ name, ok: code === 0, out, secs: Math.round((Date.now() - t0) / 1000) }));
  });
}

async function pool(list, size) {
  const results = [], queue = [...list];
  const worker = async () => {
    while (queue.length) {
      const n = queue.shift(), r = await run(n);
      console.log(`${r.ok ? "pass" : "FAIL"}  ${n}  (${r.secs}s)`);
      results.push(r);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, list.length) }, worker));
  return results;
}

const t0 = Date.now();
console.log(`Running ${names.length} checks${serial ? " one at a time" : ""}...\n`);
const first = await pool(names, serial ? 1 : 3);
const failed = first.filter(r => !r.ok).map(r => r.name);
const retried = {};
if (failed.length) {
  console.log(`\nRunning ${failed.length} failed check(s) again, one at a time...`);
  for (const r of await pool(failed, 1)) retried[r.name] = r;
}

console.log("\n================ Summary ================");
let bad = 0;
for (const n of names) {
  const a = first.find(r => r.name === n), b = retried[n];
  const status = a.ok ? "pass" : b && b.ok ? "pass (passed on retry)" : "FAIL";
  if (status === "FAIL") bad++;
  console.log(`${status.startsWith("pass") ? "  " : "x "}${n.padEnd(18)} ${status}`);
}
for (const n of names) {
  const b = retried[n];
  if (b && !b.ok) {
    console.log(`\n---------------- ${n} output ----------------`);
    console.log(b.out.split("\n").filter(l => !/^PASS /.test(l)).slice(-40).join("\n"));
  }
}
console.log(`\n${names.length - bad} of ${names.length} checks passed in ${Math.round((Date.now() - t0) / 1000)}s.`);
process.exit(bad ? 1 : 0);

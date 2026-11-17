// Netlify runs this before each build (the `ignore` setting in netlify.toml) to save build credits.
// It skips the build only when every file changed since the last build is one that can't change the site:
// notes and documents, tests, and tools that aren't part of the build. Anything else, or anything unclear, builds.
//   exit 0 = skip the build, exit 1 = build
// Try it locally:  node tools/netlify-skip.mjs <older commit> <newer commit>
import { execFileSync } from "node:child_process";

const SAFE = [
  /^docs\//,
  /^test\//,
  /^\.superpowers\//,
  /^\.github\//,
  /\.md$/i,
  /^\.gitignore$/,
  /^tools\/(test-all\.mjs|netlify-skip\.mjs|make-test-sheet\.py|convert-srd-monsters\.py)$/,
];

const [from, to] = process.argv.length > 3 ? process.argv.slice(2, 4) : [process.env.CACHED_COMMIT_REF, process.env.COMMIT_REF];
const build = why => { console.log(`Building: ${why}`); process.exit(1); };

// a branch's first build has nothing to compare with (Netlify then gives the same commit twice)
if (!from || !to || from === to) build("no earlier build to compare with");
let files;
try { files = execFileSync("git", ["diff", "--name-only", from, to], { encoding: "utf8" }).split("\n").filter(Boolean); }
catch { build("couldn't compare with the last build"); }
if (!files.length) build("no file changes found (a settings change or a retry)");
const needed = files.filter(f => !SAFE.some(re => re.test(f)));
if (needed.length) build(`${needed.length} changed file(s) affect the site, e.g. ${needed.slice(0, 3).join(", ")}`);
console.log(`Skipping the build: only notes, tests or tools changed (${files.length} file(s)).`);
process.exit(0);

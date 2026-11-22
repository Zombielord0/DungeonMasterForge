// A successful deployment needs to serve the actual Forge shell and its assets.
const origin = new URL(process.argv[2] || "https://dungeonmasterforge.netlify.app/");
const attempts = Number(process.argv[3] || 1);
const expectedRevision = process.env.FORGE_EXPECTED_REVISION;

async function check() {
  const response = await fetch(origin, { signal: AbortSignal.timeout(10000), cache: "no-store" });
  if (!response.ok) {
    const requestId = response.headers.get("x-nf-request-id");
    throw new Error(`Homepage returned HTTP ${response.status}${requestId ? ` (Netlify request ${requestId})` : ""}`);
  }
  const html = await response.text();
  if (!html.includes('id="view-roster"') || !html.includes('id="view-tracker"')) {
    throw new Error("The homepage did not return the Forge app");
  }
  if (expectedRevision && html.match(/<meta name="forge-revision" content="([0-9a-f]{40})">/)?.[1] !== expectedRevision) {
    throw new Error(`The homepage is not serving revision ${expectedRevision} yet`);
  }
  const assets = [...new Set(html.match(/\/assets\/[\w.-]+\.(?:css|js)\b/g) || [])];
  if (!assets.some(path => path.startsWith("/assets/app.") && path.endsWith(".js"))
    || !assets.some(path => path.startsWith("/assets/app.") && path.endsWith(".css"))) {
    throw new Error("The homepage is missing the app script or stylesheet");
  }
  const essentials = [...assets, "/portal.js", "/sw.js"];
  const failures = await Promise.all(essentials.map(async path => {
    const asset = await fetch(new URL(path, origin), { method: "HEAD", signal: AbortSignal.timeout(10000) });
    const type = asset.headers.get("content-type") || "";
    const correctType = path.endsWith(".css") ? /^text\/css\b/i.test(type) : /\b(?:java|ecma)script\b/i.test(type);
    return asset.ok && correctType ? null : `${path} (HTTP ${asset.status}, ${type || "unknown content type"})`;
  }));
  const broken = failures.filter(Boolean);
  if (broken.length) throw new Error(`Assets unavailable: ${broken.join(", ")}`);
  console.log(`Forge homepage and ${essentials.length} assets are available at ${origin.href}`);
}

for (let attempt = 1; attempt <= attempts; attempt++) {
  try { await check(); break; }
  catch (error) {
    console.error(error.message);
    if (attempt === attempts) process.exitCode = 1;
    else await new Promise(resolve => setTimeout(resolve, 15000));
  }
}

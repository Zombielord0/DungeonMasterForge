/* 03-dungeon-map.js: Dungeon Map tab: the dungeon generator, fog of war, drawing, map UI, imported maps and VTT files, and the TV player screen (HOST). */

/* ======================= Dungeon generator ======================= */
const MAP_SIZES = { small: [34, 26], medium: [46, 34], large: [58, 42] };
const ROOM_TYPES = {
  crypt: ["Ossuary", "Embalming chamber", "Burial vault", "Chapel of rest", "Collapsed tomb", "Mourners' hall", "Sarcophagus room", "Bone pit", "Priest's cell", "Offering hall"],
  cavern: ["Fungus grotto", "Underground pool", "Bat roost", "Crystal cave", "Collapsed tunnel", "Beast lair", "Chasm ledge", "Dripping gallery", "Glowworm hollow", "Old campsite"],
  keep: ["Guard post", "Barracks", "Armory", "Great hall", "Kitchen", "Prison cells", "Chapel", "Lord's chamber", "Storeroom", "Library", "Trophy room", "Well room"],
  sewer: ["Cistern", "Sluice gate", "Smugglers' cache", "Overflow chamber", "Rat warren", "Junction", "Collapsed pipe", "Forgotten cellar", "Fungus bank", "Old shrine"],
  temple: ["Narthex", "Shrine", "Reliquary", "Scriptorium", "Ritual chamber", "Priests' quarters", "Hall of statues", "Sanctum", "Baptistery", "Ossuary"],
  mine: ["Ore seam", "Cart depot", "Foreman's office", "Flooded shaft", "Collapsed gallery", "Powder store", "Crystal vein", "Miners' camp", "Winch room", "Deep shaft"]
};
const FEATURES = {
  crypt: ["rows of niches stuffed with skulls", "a cracked sarcophagus lid", "faded funeral murals", "a cold draft from nowhere", "dried flowers left recently", "a ring of unlit candles"],
  cavern: ["a stalactite forest", "a still black pool", "glowing lichen", "a narrow chimney leading up", "bones of something huge", "echoing drips"],
  keep: ["a toppled banner", "a cold hearth", "arrow slits facing the courtyard", "a long feast table", "a weapon rack, half empty", "a rotting tapestry"],
  sewer: ["knee-deep sludge", "a rusted grate", "smugglers' chalk marks", "a rope ladder to the street", "a floating corpse", "a roaring outflow"],
  temple: ["a defaced altar", "stained glass lit from below", "a pool of holy water", "statues with their faces chiselled off", "a mosaic floor", "a bell rope"],
  mine: ["an abandoned ore cart", "rotting support beams", "a vein of glittering quartz", "a pickaxe stuck in the wall", "a flooded lower level", "a cave-in partly cleared"]
};
const TRAPS = ["Poison needle in a lock", "Hidden pit", "Swinging blade", "Collapsing ceiling", "Glyph of warding", "Poison gas vents", "Rolling stone sphere", "Fire jets", "Spiked net"];

function generateDungeon(p) {
  const r = makeRng("map", p.seed, p.theme, p.size, p.rooms);
  const [W, H] = MAP_SIZES[p.size];
  const grid = new Array(W * H).fill(0), rid = new Array(W * H).fill(-1);
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : grid[y * W + x];
  const rooms = [];
  const maxW = p.size === "small" ? 7 : 9, maxH = p.size === "small" ? 6 : 8;
  for (let t = 0; t < 1500 && rooms.length < p.rooms; t++) {
    const w = r.int(4, maxW), h = r.int(4, maxH), x = r.int(2, W - w - 3), y = r.int(2, H - h - 3);
    if (rooms.some(o => x < o.x + o.w + 2 && x + w + 2 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y)) continue;
    rooms.push({ x, y, w, h });
  }
  rooms.forEach((o, i) => { for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) { grid[yy * W + xx] = 1; rid[yy * W + xx] = i; } o.cx = Math.floor(o.x + o.w / 2); o.cy = Math.floor(o.y + o.h / 2); });
  // Prim's MST + a few loops
  const dist = (a, b) => Math.abs(rooms[a].cx - rooms[b].cx) + Math.abs(rooms[a].cy - rooms[b].cy);
  const edges = [], inT = new Set([0]);
  while (inT.size < rooms.length) {
    let best = null;
    for (const a of inT) for (let b = 0; b < rooms.length; b++) if (!inT.has(b)) { const d = dist(a, b); if (!best || d < best[2]) best = [a, b, d]; }
    edges.push([best[0], best[1]]); inT.add(best[1]);
  }
  const extra = Math.max(1, Math.round(rooms.length * .2));
  for (let k = 0; k < extra * 4 && k < 200; k++) {
    const a = r.int(0, rooms.length - 1); const near = rooms.map((_, b) => b).filter(b => b !== a).sort((x, y) => dist(a, x) - dist(a, y)).slice(0, 3);
    const b = r.pick(near); if (b === undefined) continue;
    if (!edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) { edges.push([a, b]); if (edges.length >= rooms.length - 1 + extra) break; }
  }
  const carve = (x, y) => { const k = y * W + x; if (grid[k] === 0) grid[k] = 2; };
  const hline = (x1, x2, y) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) carve(x, y); };
  const vline = (y1, y2, x) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) carve(x, y); };
  edges.forEach(([a, b]) => { const A = rooms[a], B = rooms[b]; if (r.chance(.5)) { hline(A.cx, B.cx, A.cy); vline(A.cy, B.cy, B.cx); } else { vline(A.cy, B.cy, A.cx); hline(A.cx, B.cx, B.cy); } });
  // cavern erosion
  if (p.theme === "cavern") {
    const nearCorr = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) === 2);
    const snap = grid.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const k = y * W + x;
      if (snap[k] === 1) {
        const o = rooms[rid[k]]; const edge = x === o.x || x === o.x + o.w - 1 || y === o.y || y === o.y + o.h - 1;
        if (edge && !nearCorr(x, y) && !(x === o.cx && y === o.cy) && r.chance(.35)) { grid[k] = 0; rid[k] = -1; }
      } else if (snap[k] === 0 && x > 1 && y > 1 && x < W - 2 && y < H - 2) {
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (y + dy) * W + x + dx).find(j => snap[j] === 1);
        if (nb !== undefined && !nearCorr(x, y) && r.chance(.3)) { grid[k] = 1; rid[k] = rid[nb]; }
      }
    }
  }
  // doors
  const doors = [];
  if (p.theme !== "cavern") {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (grid[y * W + x] !== 2) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (at(x + dx, y + dy) !== 1) continue;
        const perp = dx ? [at(x, y - 1), at(x, y + 1)] : [at(x - 1, y), at(x + 1, y)];
        if (perp.every(v => v === 0)) doors.push({ x, y, dx, dy, secret: r.chance(.07) });
      }
    }
  }
  // order rooms by exploration (BFS from bottom-most room)
  const adj = rooms.map(() => []); edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  const start = rooms.reduce((bi, o, i) => o.y + o.h > rooms[bi].y + rooms[bi].h ? i : bi, 0);
  const order = [], depth = new Array(rooms.length).fill(-1); depth[start] = 0; const q = [start];
  while (q.length) { const a = q.shift(); order.push(a); adj[a].sort((x, y) => rooms[x].cx - rooms[y].cx).forEach(b => { if (depth[b] < 0) { depth[b] = depth[a] + 1; q.push(b); } }); }
  rooms.forEach((_, i) => { if (!order.includes(i)) order.push(i); });
  const boss = order.reduce((bi, i) => depth[i] >= depth[bi] ? i : bi, order[order.length - 1]);
  // contents
  const tags = TAGMAP[p.theme], lv = clamp(p.level, 1, 20), tier = tierOf(lv);
  const dc = [12, 15, 18, 21][tier], dmg = ["2d10", "4d10", "10d10", "18d10"][tier];
  const coin = [[20, 150], [200, 1200], [1500, 8000], [10000, 40000]][tier];
  const types = r.shuffle(ROOM_TYPES[p.theme]);
  order.forEach((i, n) => {
    const o = rooms[i]; o.num = n + 1; o.type = types[n % types.length]; o.feature = r.pick(FEATURES[p.theme]);
    o.content = []; o.marks = [];
    if (i === start) { o.type = "Entrance"; o.content.push("Stairs lead up to the surface."); o.marks.push("up"); return; }
    if (i === boss) {
      o.type = "Inner sanctum · " + o.type;
      const e = buildEncounter(r, lv, p.party, "deadly", tags); o.enc = e;
      o.content.push(`Hoard: ${r.int(coin[0], coin[1]) * 2} gp, plus ${r.pick(REWARDS[tier]).replace(/^A /, "a ")}.`); o.marks.push("boss", "chest");
      if (r.chance(.5)) { o.content.push("A stair descends to a deeper level."); o.marks.push("down"); }
      return;
    }
    const roll = r.f();
    if (roll < .38) { o.enc = buildEncounter(r, lv, p.party, r.pick(["easy", "medium", "medium", "hard"]), tags); }
    else if (roll < .52) { o.content.push(`Trap: ${r.pick(TRAPS)} (DC ${dc} to spot or avoid, ${dmg} damage).`); o.marks.push("trap"); }
    else if (roll < .66) { o.content.push(`Treasure: ${r.int(coin[0], coin[1])} gp${r.chance(.35) ? ", " + r.pick(REWARDS[tier]) : ""}.`); o.marks.push("chest"); }
    else if (roll < .76) { o.enc = buildEncounter(r, lv, p.party, "medium", tags); o.content.push(`Treasure: ${r.int(coin[0], coin[1])} gp.`); o.marks.push("chest"); }
    else o.content.push(r.pick(["Empty, but something has been here recently.", "Quiet. A good place for a short rest.", "A clue to the villain's plan is scratched into the wall.", "A lost NPC is hiding here.", "A puzzle blocks a hidden cache."]));
  });
  // mark cells for icons
  const freeCell = (o, avoid) => { for (let t = 0; t < 40; t++) { const x = r.int(o.x, o.x + o.w - 1), y = r.int(o.y, o.y + o.h - 1); if (grid[y * W + x] === 1 && rid[y * W + x] === rooms.indexOf(o) && !(x === o.cx && y === o.cy) && !avoid.some(a => a[0] === x && a[1] === y)) return [x, y]; } return null; };
  rooms.forEach(o => { const used = []; o.icons = o.marks.filter(m => m !== "boss").map(m => { const c = freeCell(o, used); if (c) used.push(c); return c ? { m, x: c[0], y: c[1] } : null; }).filter(Boolean); });
  return { W, H, grid, rid, rooms: order.map(i => rooms[i]), doors, params: p };
}

/* ======================= Fog of war =======================
   One byte per map square: 1 = players can see it, 0 = hidden. */
function fogKey(p) { return p.kind === "image" ? "img|" + (p.imgId || p.id) + "|" + p.W + "x" + p.H : "gen|" + [p.seed, p.theme, p.size, p.rooms].join("|"); }
function fogEncode(u8) {
  let s = "", v = u8[0], c = 0;
  for (let i = 0; i <= u8.length; i++) { if (i < u8.length && u8[i] === v) { c++; continue; } if (c) s += v + c.toString(36) + ","; v = u8[i]; c = 1; }
  return s;
}
function fogDecode(str, n) {
  const u = new Uint8Array(n); let i = 0;
  for (const run of String(str || "").split(",")) { if (!run) continue; const v = run[0] === "1" ? 1 : 0, c = parseInt(run.slice(1), 36) || 0; u.fill(v, i, Math.min(n, i + c)); i += c; }
  return i === n ? u : new Uint8Array(n);
}
function fogNew(d) { const f = new Uint8Array(d.W * d.H); if (d.kind === "image") return f; /* imported maps start fully hidden */ const e = d.rooms[0]; if (e) fogRevealRoom(d, f, e.cx, e.cy); return f; }
// Reveal the room (or the stretch of corridor) under square x,y, plus a 1-square ring so its walls show.
function fogRevealRoom(d, fog, x, y) {
  if (d.kind === "image") return fogRevealArea(d, fog, x, y);
  const { W, H, grid, rid } = d;
  if (x < 0 || y < 0 || x >= W || y >= H || !grid[y * W + x]) return false;
  const k0 = y * W + x, set = [];
  if (rid[k0] >= 0) { for (let i = 0; i < W * H; i++) if (rid[i] === rid[k0]) set.push(i); }
  else {
    const seen = new Set([k0]), q = [k0];
    while (q.length) {
      const k = q.pop(); set.push(k); const cx = k % W, cy = (k - cx) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, j = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(j)) continue;
        if (grid[j] > 0 && rid[j] < 0) { seen.add(j); q.push(j); }
      }
    }
  }
  const room = rid[k0] >= 0;
  set.forEach(k => {
    fog[k] = 1; const cx = k % W, cy = (k - cx) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (room || !grid[j]) fog[j] = 1; // corridors only uncover the rock beside them, not the rooms they lead to
    }
  });
  return true;
}
// imported maps: with walls (from a VTT file) reveal the area the walls enclose; without, a circle around the click
function fogRevealArea(d, fog, x, y) {
  const { W, H } = d; if (x < 0 || y < 0 || x >= W || y >= H) return false;
  if (!d.walls || !d.walls.length) { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && dx * dx + dy * dy <= 10) fog[ny * W + nx] = 1; } return true; }
  const cross = (ax, ay, bx, by, cx, cy, dx2, dy2) => { const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax), d2 = (bx - ax) * (dy2 - ay) - (by - ay) * (dx2 - ax), d3 = (dx2 - cx) * (ay - cy) - (dy2 - cy) * (ax - cx), d4 = (dx2 - cx) * (by - cy) - (dy2 - cy) * (bx - cx); return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)); };
  // moving between neighbouring squares is blocked when a wall crosses the line between their centres
  const blocked = (ax, ay, bx, by) => d.walls.some(w => cross(ax + .5, ay + .5, bx + .5, by + .5, w[0], w[1], w[2], w[3]));
  const seen = new Set([y * W + x]), q = [[x, y]], LIMIT = 900;
  while (q.length && seen.size < LIMIT) {
    const [cx, cy] = q.shift();
    for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + ddx, ny = cy + ddy, k = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k) || blocked(cx, cy, nx, ny)) continue; seen.add(k); q.push([nx, ny]); }
  }
  seen.forEach(k => { fog[k] = 1; });
  return true;
}
function fogPaint(fog, d, x, y, size, val) { const r = (size - 1) >> 1; fogBox(fog, d, x - r, y - r, x + r, y + r, val); }
function fogBox(fog, d, x1, y1, x2, y2, val) {
  const xa = Math.max(0, Math.min(x1, x2)), xb = Math.min(d.W - 1, Math.max(x1, x2)), ya = Math.max(0, Math.min(y1, y2)), yb = Math.min(d.H - 1, Math.max(y1, y2));
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) fog[y * d.W + x] = val;
}

/* ---- map looks: styles, theme floors, furniture ----
   Everything here draws only. It uses its own seeded random streams, so it can never change a dungeon's layout. */
const MAP_STYLES = {
  parchment: { ink: "#2a2018", hatch: "rgba(70,50,30,.55)", grid: "rgba(90,70,50,.16)", tex: true, hand: true, grain: true, dark: false },
  blue: { ink: "#1d4f91", hatch: "rgba(29,79,145,.38)", grid: "rgba(29,79,145,.26)", tex: false, hand: false, grain: false, dark: false, bg: "#ffffff", floor: "#ffffff" },
  dark: { ink: "#050403", hatch: null, grid: "rgba(255,255,255,.07)", tex: true, hand: false, grain: false, dark: true, bg: "#1d1b19" }
};
const MAP_BG = { crypt: "#e9e2d2", cavern: "#efe6cf", keep: "#efe3c6", sewer: "#e3e2cc", temple: "#f0e4c8", mine: "#ecdcc0" };
const MAP_FLOOR = { crypt: ["#f2ede3", "#6f6b64"], cavern: ["#efe4cc", "#6b6053"], keep: ["#eed9b4", "#6e5739"], sewer: ["#e3e5d3", "#5d625b"], temple: ["#f7eed9", "#7a725f"], mine: ["#e8d2ae", "#6b5944"] };
function mapStyle(d) { return MAP_STYLES[d.params.style] || MAP_STYLES.parchment; }

// which furniture suits a room, by its name first and the dungeon's theme second
const DRESS_BY_NAME = [
  [/ossuary|bone pit/i, ["bones", "bones"]], [/sarcophag|burial|tomb|vault|rest\b/i, ["sarcophagus", "sarcophagus"]], [/embalm/i, ["table", "barrel"]],
  [/library|scriptorium/i, ["bookshelf", "bookshelf", "table"]], [/armory|weapon/i, ["rack", "rack", "crate"]], [/barracks|quarters|cell|camp/i, ["bed", "bed", "crate"]],
  [/kitchen|feast|great hall|mourners|offering/i, ["table", "barrel"]], [/chapel|shrine|sanctum|ritual|narthex|altar/i, ["altar", "brazier"]],
  [/statue|trophy/i, ["statue", "statue"]], [/pool|cistern|baptist|flooded|underground pool/i, ["pool"]], [/store|cache|depot|powder|cellar/i, ["crate", "barrel", "crate"]],
  [/fungus|glowworm|grotto/i, ["fungus", "fungus"]], [/collapsed|cave-in|chasm/i, ["rubble", "rubble"]], [/ore|cart|winch|shaft|seam|vein|miners|foreman/i, ["cart", "barrel", "crate"]],
  [/crystal/i, ["crystal", "crystal"]], [/bat|lair|warren|roost/i, ["bones", "web"]], [/guard|well|junction|sluice/i, ["barrel", "crate"]], [/prison/i, ["bones", "bed"]]
];
const DRESS_BY_THEME = { crypt: ["bones", "web"], cavern: ["rubble", "fungus"], keep: ["crate", "barrel"], sewer: ["rubble", "barrel"], temple: ["statue", "brazier"], mine: ["barrel", "crate"] };
const DRESS_TWO = new Set(["sarcophagus", "table", "bookshelf", "bed", "cart", "rack"]); // two squares long
const DRESS_WALL = new Set(["bookshelf", "rack", "bed"]);                                   // against a wall
function mapDress(d) {
  if (d._dress) return d._dress;
  const r = makeRng("dress", d.params.seed, d.params.theme, d.params.size, d.params.rooms), out = [], W = d.W;
  const ridOf = o => d.rid[o.cy * W + o.cx];
  d.rooms.forEach(o => {
    const rid = ridOf(o), blocked = new Set();
    const block = (x, y) => blocked.add(x + "," + y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) block(o.cx + dx, o.cy + dy);           // room number
    d.rooms.forEach(q => (q.icons || []).forEach(i => block(i.x, i.y)));                                      // stairs, chests, traps
    d.doors.forEach(dr => { const ix = dr.x + dr.dx, iy = dr.y + dr.dy; for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) block(ix + a, iy + b); });
    const cave = d.params.theme === "cavern", F = (x, y) => x >= 0 && y >= 0 && x < d.W && y < d.H && d.grid[y * W + x] > 0;
    const inner = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!F(x + dx, y + dy)) return false; return true; };
    // caves have curved walls, so furniture stays off their ragged edges
    const free = (x, y) => F(x, y) && d.grid[y * W + x] === 1 && d.rid[y * W + x] === rid && !blocked.has(x + "," + y) && (!cave || inner(x, y));
    const take = cells => cells.forEach(([x, y]) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!dx || !dy) block(x + dx, y + dy); });
    let kinds = null; for (const [re, k] of DRESS_BY_NAME) if (re.test(o.type)) { kinds = k; break; }
    kinds = kinds || DRESS_BY_THEME[d.params.theme];
    // pillars in big halls
    if (o.w >= 6 && o.h >= 6 && d.params.theme !== "cavern" && (/hall|sanctum|chapel|temple|narthex|statues/i.test(o.type) || r.chance(.35))) {
      for (const [x, y] of [[o.x + 1, o.y + 1], [o.x + o.w - 2, o.y + 1], [o.x + 1, o.y + o.h - 2], [o.x + o.w - 2, o.y + o.h - 2]]) if (free(x, y)) { out.push({ kind: "pillar", room: o.num, cells: [[x, y]] }); take([[x, y]]); }
    }
    if (o.type === "Entrance" || r.chance(.12)) return;                                                     // some rooms stay bare
    const n = Math.min(kinds.length, 1 + Math.floor((o.w * o.h) / 22) + (r.chance(.5) ? 1 : 0));
    for (let i = 0; i < n; i++) {
      const kind = kinds[i % kinds.length];
      for (let t = 0; t < 30; t++) {
        const x = r.int(o.x, o.x + o.w - 1), y = r.int(o.y, o.y + o.h - 1); if (!free(x, y)) continue;
        if (DRESS_WALL.has(kind) && !(x === o.x || y === o.y || x === o.x + o.w - 1 || y === o.y + o.h - 1)) continue;
        let cells = [[x, y]];
        if (DRESS_TWO.has(kind)) {
          const alongX = DRESS_WALL.has(kind) ? (y === o.y || y === o.y + o.h - 1) : r.chance(.5);
          const nx = alongX ? x + 1 : x, ny = alongX ? y : y + 1; if (!free(nx, ny)) continue; cells.push([nx, ny]);
        }
        out.push({ kind, room: o.num, cells }); take(cells); break;
      }
    }
  });
  return (d._dress = out);
}
function drawProp(g, p, st) {
  const ink = st.ink, [x0, y0] = p.cells[0], last = p.cells[p.cells.length - 1];
  const X = x0 * CS, Y = y0 * CS, w = (last[0] - x0 + 1) * CS, h = (last[1] - y0 + 1) * CS, cx = X + w / 2, cy = Y + h / 2, horiz = w > h;
  const fillA = st.dark ? "#4b4238" : "#d9ccb0", fillB = st.dark ? "#6e5a3f" : "#c8a979";
  g.save(); g.lineWidth = 1.2; g.strokeStyle = ink; g.lineJoin = "round"; g.lineCap = "round";
  const box = (x, y, bw, bh, f) => { g.fillStyle = f; g.fillRect(x, y, bw, bh); g.strokeRect(x, y, bw, bh); };
  switch (p.kind) {
    case "pillar": g.beginPath(); g.arc(cx, cy, CS * .34, 0, 7); g.fillStyle = st.dark ? "#8b8378" : "#bdb3a0"; g.fill(); g.stroke(); break;
    case "sarcophagus": { const a = horiz ? [X + 3, Y + 4, w - 6, h - 8] : [X + 4, Y + 3, w - 8, h - 6]; box(...a, fillA); g.beginPath(); if (horiz) { g.moveTo(X + 8, cy); g.lineTo(X + w - 8, cy); g.moveTo(X + 14, cy - 4); g.lineTo(X + 14, cy + 4); } else { g.moveTo(cx, Y + 8); g.lineTo(cx, Y + h - 8); g.moveTo(cx - 4, Y + 14); g.lineTo(cx + 4, Y + 14); } g.stroke(); break; }
    case "table": { const a = horiz ? [X + 3, Y + 5, w - 6, h - 10] : [X + 5, Y + 3, w - 10, h - 6]; box(...a, fillB); break; }
    case "bed": { const a = horiz ? [X + 2, Y + 4, w - 4, h - 8] : [X + 4, Y + 2, w - 8, h - 4]; box(...a, fillA); g.fillStyle = st.dark ? "#a59a8a" : "#fffaf0"; horiz ? g.fillRect(X + 4, Y + 6, 5, h - 12) : g.fillRect(X + 6, Y + 4, w - 12, 5); break; }
    case "bookshelf": case "rack": { const a = horiz ? [X + 1, Y + (y0 === 0 ? 1 : 2), w - 2, 6] : [X + 2, Y + 1, 6, h - 2]; box(...a, fillB); g.beginPath(); const n = Math.round((horiz ? w : h) / 5); for (let i = 1; i < n; i++) { if (horiz) { g.moveTo(X + 1 + i * 5, a[1]); g.lineTo(X + 1 + i * 5, a[1] + 6); } else { g.moveTo(a[0], Y + 1 + i * 5); g.lineTo(a[0] + 6, Y + 1 + i * 5); } } g.stroke(); break; }
    case "cart": { const a = horiz ? [X + 4, Y + 5, w - 8, h - 10] : [X + 5, Y + 4, w - 10, h - 8]; box(...a, fillB); g.fillStyle = ink; for (const [px, py] of horiz ? [[X + 8, Y + 4], [X + w - 8, Y + 4], [X + 8, Y + h - 4], [X + w - 8, Y + h - 4]] : [[X + 4, Y + 8], [X + w - 4, Y + 8], [X + 4, Y + h - 8], [X + w - 4, Y + h - 8]]) { g.beginPath(); g.arc(px, py, 2, 0, 7); g.fill(); } break; }
    case "crate": box(X + 4, Y + 4, CS - 8, CS - 8, fillB); g.beginPath(); g.moveTo(X + 4, Y + 4); g.lineTo(X + CS - 4, Y + CS - 4); g.moveTo(X + CS - 4, Y + 4); g.lineTo(X + 4, Y + CS - 4); g.stroke(); break;
    case "barrel": g.beginPath(); g.arc(cx, cy, CS * .32, 0, 7); g.fillStyle = fillB; g.fill(); g.stroke(); g.beginPath(); g.arc(cx, cy, CS * .17, 0, 7); g.stroke(); break;
    case "altar": box(X + 2, Y + 5, CS - 4, CS - 10, fillA); g.fillStyle = "#e8a33d"; g.beginPath(); g.arc(X + 6, Y + 8, 1.6, 0, 7); g.arc(X + CS - 6, Y + 8, 1.6, 0, 7); g.fill(); break;
    case "statue": g.fillStyle = fillA; g.fillRect(X + 3, Y + 3, CS - 6, CS - 6); g.strokeRect(X + 3, Y + 3, CS - 6, CS - 6); g.beginPath(); g.arc(cx, cy, CS * .2, 0, 7); g.fillStyle = st.dark ? "#a39a8c" : "#9e9584"; g.fill(); g.stroke(); break;
    case "brazier": g.beginPath(); g.arc(cx, cy, CS * .26, 0, 7); g.fillStyle = "#3a2e22"; g.fill(); g.stroke(); g.fillStyle = "#e8a33d"; g.beginPath(); g.arc(cx, cy, CS * .13, 0, 7); g.fill(); break;
    case "pool": { g.beginPath(); g.ellipse(cx, cy, CS * .44, CS * .38, 0, 0, 7); g.fillStyle = st.dark ? "#2e4b52" : "#a9c6c4"; g.fill(); g.stroke(); g.strokeStyle = st.dark ? "#4d7480" : "#e9f2f0"; g.beginPath(); g.arc(cx - 2, cy - 1, 4, 3.6, 5.4); g.stroke(); break; }
    case "bones": g.lineWidth = 1.6; g.strokeStyle = st.dark ? "#cfc6b4" : "#8b7e69"; g.beginPath(); g.moveTo(X + 5, Y + 6); g.lineTo(X + 13, Y + 12); g.moveTo(X + 13, Y + 6); g.lineTo(X + 7, Y + 14); g.moveTo(X + 10, Y + 15); g.lineTo(X + 16, Y + 14); g.stroke(); g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(X + 15, Y + 7, 2.2, 0, 7); g.fill(); break;
    case "rubble": g.fillStyle = st.dark ? "#575048" : "#b3a68e"; for (const [a, b, s] of [[5, 6, 4], [12, 5, 3], [9, 12, 5], [15, 13, 3], [4, 14, 2.5]]) { g.beginPath(); g.moveTo(X + a, Y + b - s); g.lineTo(X + a + s, Y + b); g.lineTo(X + a, Y + b + s); g.lineTo(X + a - s, Y + b); g.closePath(); g.fill(); g.stroke(); } break;
    case "fungus": g.fillStyle = st.dark ? "#7fae6e" : "#9bb98a"; for (const [a, b, s] of [[6, 7, 3], [12, 6, 2.2], [10, 13, 3.4], [15, 12, 2]]) { g.beginPath(); g.arc(X + a, Y + b, s, 0, 7); g.fill(); g.stroke(); } break;
    case "crystal": g.fillStyle = st.dark ? "#7a8fc0" : "#b9c8ea"; for (const [a, b] of [[7, 6], [13, 9], [8, 14]]) { g.beginPath(); g.moveTo(X + a, Y + b - 5); g.lineTo(X + a + 3, Y + b); g.lineTo(X + a, Y + b + 4); g.lineTo(X + a - 3, Y + b); g.closePath(); g.fill(); g.stroke(); } break;
    case "web": g.lineWidth = .8; g.strokeStyle = st.dark ? "rgba(220,220,220,.5)" : "rgba(60,50,40,.55)"; g.beginPath(); for (let i = 0; i <= 4; i++) { const a = i * Math.PI / 8; g.moveTo(X, Y); g.lineTo(X + Math.cos(a) * CS, Y + Math.sin(a) * CS); } for (const rr of [6, 11, 16]) { g.moveTo(X + rr, Y); for (let i = 1; i <= 4; i++) { const a = i * Math.PI / 8; g.lineTo(X + Math.cos(a) * rr, Y + Math.sin(a) * rr); } } g.stroke(); break;
  }
  g.restore();
}
// smooth value noise in [-1, 1] (for wobbly cave edges)
function mapNoise(seed) {
  const r = makeRng("noise", seed), N = 64, t = Array.from({ length: N * N }, () => r.f() * 2 - 1), sm = v => v * v * (3 - 2 * v);
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi), at = (a, b) => t[((b & 63) * N) + (a & 63)];
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * fx, b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * fx; return a + (b - a) * fy; };
}
// the grid-area picture (everything except room numbers, fog and the header), cached per map and look
function mapBase(d, showGrid, player, found, s) {
  const st = mapStyle(d), foundKey = found ? [...found].sort().join(";") : "";
  const key = [showGrid, player, foundKey, s, d.params.style || "parchment"].join("|");
  d._base = d._base || new Map(); if (d._base.has(key)) return d._base.get(key);
  const { W, H, grid, rid } = d, th = d.params.theme, PW = W * CS, PH = H * CS;
  const mk = () => { const c = document.createElement("canvas"); c.width = Math.round(PW * s); c.height = Math.round(PH * s); const g = c.getContext("2d"); g.setTransform(s, 0, 0, s, 0, 0); return [c, g]; };
  const [cv, g] = mk();
  const floor = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y * W + x] > 0;
  const tr = makeRng("tex", d.params.seed, th);
  const rockC = st.bg || MAP_BG[th], floorC = st.floor || MAP_FLOOR[th][st.dark ? 1 : 0];
  g.fillStyle = rockC; g.fillRect(0, 0, PW, PH);
  // rock beside the dungeon: hand-drawn hatching (or dark speckles)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (floor(x, y)) continue;
    let near = false; for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (floor(x + dx, y + dy)) { near = true; break; }
    if (!near) continue;
    if (st.dark) continue; // dark rock needs no hatching
    g.strokeStyle = st.hatch; g.lineWidth = 1; g.beginPath();
    const a = tr.f() * Math.PI, ca = Math.cos(a), sa = Math.sin(a), mx = x * CS + CS / 2 + (tr.f() - .5) * 4, my = y * CS + CS / 2 + (tr.f() - .5) * 4;
    for (let k = -2; k <= 2; k++) { const ox = -sa * k * 3.6, oy = ca * k * 3.6, L = 7 - Math.abs(k) * .8; g.moveTo(mx + ox - ca * L, my + oy - sa * L); g.lineTo(mx + ox + ca * L, my + oy + sa * L); }
    g.stroke();
  }
  // the floor layer: base colour, theme texture and grid, then cut to the dungeon's shape
  const [fc, fg] = mk(); fg.fillStyle = floorC; fg.fillRect(0, 0, PW, PH);
  if (st.tex) mapTexture(fg, d, st, tr);
  if (showGrid) { fg.strokeStyle = st.grid; fg.lineWidth = 1; fg.beginPath(); for (let x = 0; x <= W; x++) { fg.moveTo(x * CS + .5, 0); fg.lineTo(x * CS + .5, PH); } for (let y = 0; y <= H; y++) { fg.moveTo(0, y * CS + .5); fg.lineTo(PW, y * CS + .5); } fg.stroke(); }
  const smooth = th === "cavern" && typeof g.filter === "string";
  if (smooth) {
    // caves: blur the floor squares into a soft shape and trace a wobbly edge through it
    const [mc, mg] = mk(); mg.fillStyle = "#fff"; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (floor(x, y)) mg.fillRect(x * CS, y * CS, CS, CS);
    const [bc, bg] = mk(); bg.setTransform(1, 0, 0, 1, 0, 0); bg.filter = `blur(${(CS * .32 * s).toFixed(1)}px)`; bg.drawImage(mc, 0, 0); bg.filter = "none";
    const id = bg.getImageData(0, 0, bc.width, bc.height), px = id.data, nz = mapNoise(d.params.seed);
    const inner = new ImageData(bc.width, bc.height), outer = new ImageData(bc.width, bc.height), ip = inner.data, op = outer.data;
    const ink = st.ink.match(/\w\w/g).map(h => parseInt(h, 16));
    for (let yy = 0; yy < bc.height; yy++) for (let xx = 0; xx < bc.width; xx++) {
      const i = (yy * bc.width + xx) * 4, v = px[i + 3], n = nz(xx / s / 9, yy / s / 9) * 34;
      if (v > 120 + n) ip[i + 3] = 255;
      if (v > 78 + n) { op[i] = ink[0]; op[i + 1] = ink[1]; op[i + 2] = ink[2]; op[i + 3] = 255; }
    }
    const [ic, ig] = mk(); ig.setTransform(1, 0, 0, 1, 0, 0); ig.putImageData(inner, 0, 0);
    const [oc, og] = mk(); og.setTransform(1, 0, 0, 1, 0, 0); og.putImageData(outer, 0, 0);
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = "destination-in"; fg.drawImage(ic, 0, 0); fg.globalCompositeOperation = "source-over";
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(oc, 0, 0); g.drawImage(fc, 0, 0); g.setTransform(s, 0, 0, s, 0, 0);
    d._caveSmooth = true;
  } else {
    const [mc, mg] = mk(); mg.fillStyle = "#fff"; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (floor(x, y)) mg.fillRect(x * CS, y * CS, CS, CS);
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = "destination-in"; fg.drawImage(mc, 0, 0); fg.globalCompositeOperation = "source-over";
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(fc, 0, 0); g.setTransform(s, 0, 0, s, 0, 0);
    // walls: hand-inked (slightly wobbly, with a faint second stroke) or ruler-straight
    const wr = makeRng("ink", d.params.seed, th), segs = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!floor(x, y)) continue; const X = x * CS, Y = y * CS;
      if (!floor(x, y - 1)) segs.push([X, Y, X + CS, Y]); if (!floor(x, y + 1)) segs.push([X, Y + CS, X + CS, Y + CS]);
      if (!floor(x - 1, y)) segs.push([X, Y, X, Y + CS]); if (!floor(x + 1, y)) segs.push([X + CS, Y, X + CS, Y + CS]);
    }
    const pass = (lw, alpha, jit, off) => {
      g.strokeStyle = st.ink; g.globalAlpha = alpha; g.lineWidth = lw; g.lineCap = st.hand ? "round" : "square"; g.beginPath();
      segs.forEach(([a, b, c, e]) => { const mx = (a + c) / 2 + (a === c ? (wr.f() - .5) * jit : 0) + off, my = (b + e) / 2 + (b === e ? (wr.f() - .5) * jit : 0) + off; g.moveTo(a + off, b + off); g.quadraticCurveTo(mx, my, c + off, e + off); });
      g.stroke(); g.globalAlpha = 1;
    };
    pass(st.dark ? 4 : 3, 1, st.hand ? 1.8 : 0, 0);
    if (st.hand) pass(1, .35, 2.4, .9);
    if (st.dark) { g.strokeStyle = "rgba(201,180,138,.35)"; g.lineWidth = 1; g.beginPath(); segs.forEach(([a, b, c, e]) => { g.moveTo(a, b); g.lineTo(c, e); }); g.stroke(); }
  }
  mapDrawDoors(g, d, st, player, found);
  mapDress(d).forEach(pr => drawProp(g, pr, st));
  if (st.grain) {
    // paper: a little grain and darker edges
    const nr = makeRng("grain", d.params.seed); g.fillStyle = "rgba(90,60,30,.06)";
    for (let i = 0; i < (PW * PH) / 90; i++) g.fillRect(nr.f() * PW, nr.f() * PH, 1.2, 1.2);
    const v = g.createRadialGradient(PW / 2, PH / 2, Math.min(PW, PH) * .35, PW / 2, PH / 2, Math.max(PW, PH) * .72);
    v.addColorStop(0, "rgba(110,70,30,0)"); v.addColorStop(1, "rgba(110,70,30,.2)"); g.fillStyle = v; g.fillRect(0, 0, PW, PH);
  }
  mapDrawIcons(g, d, st, player);
  if (d._base.size > 6) d._base.delete(d._base.keys().next().value);
  d._base.set(key, cv); return cv;
}
function mapTexture(g, d, st, r) {
  const { W, H, grid, rid } = d, th = d.params.theme, dark = st.dark;
  const shade = a => dark ? `rgba(255,255,255,${a})` : `rgba(60,40,20,${a})`, lite = a => dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
  const F = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y * W + x] > 0;
  const corr = (x, y) => F(x, y) && rid[y * W + x] < 0;
  // which way a corridor square runs: "h", "v" or "x" (a junction)
  const dir = (x, y) => { const h = F(x - 1, y) || F(x + 1, y), v = F(x, y - 1) || F(x, y + 1); return h && v ? "x" : h ? "h" : "v"; };
  let largest = null; d.rooms.forEach(o => { if (!largest || o.w * o.h > largest.w * largest.h) largest = o; });
  const lid = largest ? rid[largest.cy * W + largest.cx] : -9;
  const stones = (x, y) => { const X = x * CS, Y = y * CS; g.fillStyle = (r.f() < .5 ? shade : lite)(.05 + r.f() * .07); g.fillRect(X, Y, CS, CS); g.strokeStyle = shade(.14); g.lineWidth = .8; g.strokeRect(X + .5, Y + .5, CS - 1, CS - 1); if (r.f() < .08) { g.beginPath(); g.moveTo(X + 4, Y + 5 + r.f() * 8); g.lineTo(X + 10, Y + 9); g.lineTo(X + 15, Y + 6 + r.f() * 9); g.stroke(); } };
  const specks = (x, y, n, a) => { g.fillStyle = shade(a); for (let i = 0; i < n; i++) g.fillRect(x * CS + r.f() * CS, y * CS + r.f() * CS, 1.4, 1.4); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!F(x, y)) continue; const X = x * CS, Y = y * CS, inRoom = rid[y * W + x] >= 0;
    if (th === "crypt") stones(x, y);
    else if (th === "cavern") { g.fillStyle = (r.f() < .5 ? shade : lite)(.04 + r.f() * .05); g.fillRect(X, Y, CS, CS); specks(x, y, 5, .22); }
    else if (th === "keep") {
      if (!inRoom) { stones(x, y); continue; }
      g.strokeStyle = shade(.2); g.lineWidth = .8; g.beginPath(); for (let k = 1; k < 4; k++) { g.moveTo(X, Y + k * 5 + .5); g.lineTo(X + CS, Y + k * 5 + .5); }
      for (let k = 0; k < 4; k++) if (r.f() < .35) { const jx = X + 3 + r.f() * (CS - 6); g.moveTo(jx, Y + k * 5); g.lineTo(jx, Y + k * 5 + 5); } g.stroke();
      g.fillStyle = shade(.03 + r.f() * .04); g.fillRect(X, Y, CS, CS);
    } else if (th === "sewer") {
      stones(x, y);
      if (corr(x, y)) { g.fillStyle = dark ? "rgba(60,110,105,.7)" : "rgba(80,130,120,.55)"; const t = dir(x, y); if (t !== "v") g.fillRect(X, Y + CS * .36, CS, CS * .28); if (t !== "h") g.fillRect(X + CS * .36, Y, CS * .28, CS); }
    } else if (th === "temple") {
      if (!inRoom) { stones(x, y); continue; }
      g.fillStyle = ((x + y) & 1) ? shade(.08) : lite(.12); g.fillRect(X, Y, CS, CS);
      if (rid[y * W + x] === lid) { g.strokeStyle = dark ? "rgba(214,170,90,.5)" : "rgba(170,120,50,.45)"; g.lineWidth = 1; g.beginPath(); g.moveTo(X + CS / 2, Y + 2); g.lineTo(X + CS - 2, Y + CS / 2); g.lineTo(X + CS / 2, Y + CS - 2); g.lineTo(X + 2, Y + CS / 2); g.closePath(); g.stroke(); }
    } else if (th === "mine") {
      specks(x, y, 7, .25); g.fillStyle = shade(.03 + r.f() * .05); g.fillRect(X, Y, CS, CS);
      if (corr(x, y)) { const t = dir(x, y); g.strokeStyle = dark ? "rgba(200,170,130,.55)" : "rgba(90,60,30,.55)"; g.lineWidth = 1; g.beginPath();
        if (t !== "v") { for (let k = 2; k < CS; k += 5) { g.moveTo(X + k, Y + 5); g.lineTo(X + k, Y + CS - 5); } g.moveTo(X, Y + 7); g.lineTo(X + CS, Y + 7); g.moveTo(X, Y + CS - 7); g.lineTo(X + CS, Y + CS - 7); }
        if (t !== "h") { for (let k = 2; k < CS; k += 5) { g.moveTo(X + 5, Y + k); g.lineTo(X + CS - 5, Y + k); } g.moveTo(X + 7, Y); g.lineTo(X + 7, Y + CS); g.moveTo(X + CS - 7, Y); g.lineTo(X + CS - 7, Y + CS); }
        g.stroke(); }
    }
  }
}
function mapDrawDoors(g, d, st, player, found) {
  d.doors.forEach(dr => {
    const ex = dr.dx > 0 ? (dr.x + 1) * CS : dr.dx < 0 ? dr.x * CS : dr.x * CS + CS / 2;
    const ey = dr.dy > 0 ? (dr.y + 1) * CS : dr.dy < 0 ? dr.y * CS : dr.y * CS + CS / 2;
    const isFound = found && found.has(dr.x + "," + dr.y);
    if (dr.secret && player && !isFound) {
      // to players an unfound secret door is just more wall
      const wx = dr.dx > 0 ? (dr.x + 1) * CS : dr.x * CS, wy = dr.dy > 0 ? (dr.y + 1) * CS : dr.y * CS;
      g.strokeStyle = st.ink; g.lineWidth = st.dark ? 4 : 3; g.beginPath();
      if (dr.dx) { g.moveTo(wx, dr.y * CS); g.lineTo(wx, dr.y * CS + CS); } else { g.moveTo(dr.x * CS, wy); g.lineTo(dr.x * CS + CS, wy); }
      g.stroke(); return;
    }
    if (dr.secret && !player) { g.fillStyle = isFound ? "#3f9a3a" : st.dark ? "#e7d9b8" : st.ink; /* green once the players have found it */ g.font = "bold 13px Cinzel, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("S", ex, ey); return; }
    const vert = dr.dx !== 0, w = vert ? CS * .32 : CS * .72, h = vert ? CS * .72 : CS * .32;
    g.fillStyle = st.dark ? "#8a6a3e" : "#c79a5b"; g.strokeStyle = st.ink; g.lineWidth = 1.5; g.fillRect(ex - w / 2, ey - h / 2, w, h); g.strokeRect(ex - w / 2, ey - h / 2, w, h);
  });
}
function mapDrawIcons(g, d, st, player) {
  const ink = st.dark ? "#e7d9b8" : st.ink;
  d.rooms.forEach(o => (o.icons || []).forEach(ic => {
    if (player && (ic.m === "trap" || ic.m === "down")) return;
    const X = ic.x * CS, Y = ic.y * CS;
    if (ic.m === "up" || ic.m === "down") {
      g.strokeStyle = ink; g.lineWidth = 1.4; g.beginPath();
      for (let k = 0; k < 5; k++) { const yy = Y + 3 + k * 3.5, inset = ic.m === "down" ? k * 1.5 : (4 - k) * 1.5; g.moveTo(X + 2 + inset, yy); g.lineTo(X + CS - 2 - inset, yy); }
      g.stroke();
    } else if (ic.m === "chest") {
      g.fillStyle = "#b8862e"; g.strokeStyle = st.ink; g.lineWidth = 1.2; g.fillRect(X + 4, Y + 6, CS - 8, CS - 11); g.strokeRect(X + 4, Y + 6, CS - 8, CS - 11);
      g.beginPath(); g.moveTo(X + 4, Y + 10); g.lineTo(X + CS - 4, Y + 10); g.stroke();
    } else if (ic.m === "trap") {
      g.strokeStyle = "#b02f2f"; g.lineWidth = 2; g.strokeRect(X + 3, Y + 3, CS - 6, CS - 6);
      g.beginPath(); g.moveTo(X + 6, Y + 6); g.lineTo(X + CS - 6, Y + CS - 6); g.moveTo(X + CS - 6, Y + 6); g.lineTo(X + 6, Y + CS - 6); g.stroke();
    }
  }));
}

/* ======================= Dungeon rendering =======================
   o.player draws the player-safe view (no traps, unfound secret doors drawn as wall, no seed);
   o.fog covers hidden squares (solid for players, a see-through tint for the DM). */
const CS = 20, TOP = 46, FOG_PLAYER = "#0b0a09", FOG_DM = "rgba(10,8,6,.5)";
function drawImageMap(cv, d, showGrid, o) {
  const { W, H } = d, player = !!o.player, fog = o.fog || null, showNums = o.numbers !== undefined ? o.numbers : !player;
  const dpr = o.scale || Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * CS * dpr); cv.height = Math.round((H * CS + TOP) * dpr);
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = "#e9e2d2"; g.fillRect(0, 0, W * CS, H * CS + TOP);
  g.imageSmoothingQuality = "high"; g.drawImage(d.img, d.ox, d.oy, W * d.px, H * d.px, 0, TOP, W * CS, H * CS);
  g.save(); g.translate(0, TOP);
  if (showGrid) { g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = .8; g.beginPath(); for (let x = 0; x <= W; x++) { g.moveTo(x * CS, 0); g.lineTo(x * CS, H * CS); } for (let y = 0; y <= H; y++) { g.moveTo(0, y * CS); g.lineTo(W * CS, y * CS); } g.stroke(); }
  d.rooms.forEach(r => {
    if (!showNums || (fog && !fog[r.cy * W + r.cx])) return;
    const X = r.cx * CS + CS / 2, Y = r.cy * CS + CS / 2;
    g.beginPath(); g.arc(X, Y, 10, 0, Math.PI * 2); g.fillStyle = "#2a2018"; g.fill(); g.strokeStyle = "#fdfaf2"; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = "#fdfaf2"; g.font = "bold 11px Cinzel, Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(r.num), X, Y + .5);
  });
  mapDrawTokens(g, o.tokens);
  if (fog) { g.fillStyle = player ? FOG_PLAYER : FOG_DM; g.beginPath(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!fog[y * W + x]) g.rect(x * CS, y * CS, CS, CS); g.fill(); }
  g.restore();
  g.fillStyle = "#2a2018"; g.font = "700 20px Cinzel, Georgia, serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(d.params.name || "Map", 14, TOP / 2);
  if (!player) { g.font = "italic 14px 'Crimson Pro', Georgia, serif"; g.textAlign = "right"; g.fillText(`Imported map · ${W} × ${H} squares · ${d.rooms.length} rooms`, W * CS - 14, TOP / 2); }
}
// tokens: a coloured disc with initials; Bloodied gets an orange ring, Down a grey disc with a cross
const TOKEN_COLORS = { pc: "#2f8a4a", npc: "#2f5f9b", foe: "#9b2f2f" };
function mapDrawTokens(g, tokens) {
  (tokens || []).forEach(t => {
    const X = t.x * CS + CS / 2, Y = t.y * CS + CS / 2, down = t.state === "Down";
    g.beginPath(); g.arc(X, Y, CS * .42, 0, 7); g.fillStyle = down ? "#6a625a" : TOKEN_COLORS[t.kind] || TOKEN_COLORS.npc; g.fill();
    g.lineWidth = t.state === "Bloodied" ? 2.5 : 1.5; g.strokeStyle = t.state === "Bloodied" ? "#f08a24" : "#fdfaf2"; g.stroke();
    const ini = String(t.name).replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean); const tag = (ini.length > 1 && /\d+/.test(ini[ini.length - 1]) ? ini[0][0] + ini[ini.length - 1] : ini.slice(0, 2).map(w => w[0]).join("")).toUpperCase().slice(0, 3);
    g.fillStyle = "#fdfaf2"; g.font = `bold ${tag.length > 2 ? 7 : 8.5}px Georgia, serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(tag, X, Y + .5);
    if (down) { g.strokeStyle = "#1a1612"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(X - 5, Y - 5); g.lineTo(X + 5, Y + 5); g.moveTo(X + 5, Y - 5); g.lineTo(X - 5, Y + 5); g.stroke(); }
  });
}
function drawDungeon(cv, d, showGrid, o = {}) {
  if (d.kind === "image") return drawImageMap(cv, d, showGrid, o);
  const { W, H } = d, st = mapStyle(d);
  const player = !!o.player, fog = o.fog || null, showNums = o.numbers !== undefined ? o.numbers : !player;
  const dpr = o.scale || Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * CS * dpr); cv.height = Math.round((H * CS + TOP) * dpr);
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = st.bg || MAP_BG[d.params.theme]; g.fillRect(0, 0, W * CS, H * CS + TOP);
  g.drawImage(mapBase(d, showGrid, player, o.found || null, dpr), 0, TOP, W * CS, H * CS);
  g.save(); g.translate(0, TOP);
  // room numbers
  d.rooms.forEach(r => {
    if (!showNums || (fog && !fog[r.cy * W + r.cx])) return;
    const X = r.cx * CS + CS / 2, Y = r.cy * CS + CS / 2, boss = !player && (r.marks || []).includes("boss");
    g.beginPath(); g.arc(X, Y, 10, 0, Math.PI * 2); g.fillStyle = boss ? "#9b2f2f" : st.dark ? "#0b0a09" : st.ink; g.fill();
    if (st.dark) { g.strokeStyle = "#c9b48a"; g.lineWidth = 1; g.stroke(); }
    g.fillStyle = "#fdfaf2"; g.font = "bold 11px Cinzel, Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(r.num), X, Y + .5);
  });
  mapDrawTokens(g, o.tokens); // under the fog, so tokens in fogged squares stay hidden from players
  if (fog) {
    g.fillStyle = player ? FOG_PLAYER : FOG_DM; g.beginPath();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!fog[y * W + x]) g.rect(x * CS, y * CS, CS, CS);
    g.fill();
  }
  g.restore();
  // header + scale + compass
  const head = st.dark ? "#e7d9b8" : st.ink;
  g.fillStyle = head; g.font = "700 20px Cinzel, Georgia, serif"; g.textAlign = "left"; g.textBaseline = "middle";
  g.fillText(d.params.name || "Dungeon", 14, TOP / 2);
  g.font = "italic 14px 'Crimson Pro', Georgia, serif"; g.textAlign = "right";
  if (!player) g.fillText(`${{ crypt: "Crypt", cavern: "Cavern", keep: "Keep", sewer: "Sewers", temple: "Temple", mine: "Mine" }[d.params.theme]} · ${d.rooms.length} areas · party level ${d.params.level} · seed ${d.params.seed}`, W * CS - 14, TOP / 2);
  const legend = (player && fog) || st.dark ? "#c9b48a" : st.ink; // readable on top of solid fog and dark rock
  const by = TOP + H * CS - 14; g.strokeStyle = legend; g.fillStyle = legend; g.lineWidth = 2; g.beginPath(); g.moveTo(14, by); g.lineTo(14 + CS * 4, by); for (let k = 0; k <= 4; k++) { g.moveTo(14 + k * CS, by - 4); g.lineTo(14 + k * CS, by + 4); } g.stroke();
  g.font = "12px 'Crimson Pro', Georgia, serif"; g.textAlign = "left"; g.fillText("20 ft", 14 + CS * 4 + 6, by);
  const cx = W * CS - 26, cy = TOP + H * CS - 26; g.beginPath(); g.moveTo(cx, cy - 14); g.lineTo(cx + 5, cy); g.lineTo(cx, cy + 14); g.lineTo(cx - 5, cy); g.closePath(); g.fillStyle = legend; g.fill();
  g.font = "bold 11px Cinzel, serif"; g.textAlign = "center"; g.fillText("N", cx, cy - 20);
}
// a map room's fight -> the campaign chosen under "Save to campaign" (and, while hosting, onto the TV)
function mapRunBtn(i) { return `<div><button class="btn sm" type="button" data-runenc="${i}" style="margin-top:6px" title="Add this fight to the campaign chosen under Save to campaign. While the TV is on, it also reveals the room and shows the turn order.">⚔ Run this fight</button></div>`; }
function curCampForMap() { return Store.get($("#mapCampaign").value) || null; }
function mapRunEncounter(i) {
  const d = currentMap, o = d && d.rooms[i]; if (!o || !o.enc) return;
  const c = curCampForMap(); if (!c) { toast("Create a campaign first (Campaign Tracker), then pick it under Save to campaign."); return; }
  const groups = parseEncText(o.enc.text); if (!groups.length) { toast("Couldn't read the monsters in that fight."); return; }
  const e = newEncounter(null, `${d.params.name} · Room ${o.num}: ${o.type || o.name || "Room"}`, d.params.level || c.currentLevel || 1, groups, { kind: "map", room: o.num, notes: `From the map “${d.params.name}”, room ${o.num}.` });
  c.encounters = c.encounters || []; c.encounters.push(e); Store.save(c);
  if (HOST.on && HOST.fog) {
    const tmp = new Uint8Array(d.W * d.H); if (fogRevealRoom(d, tmp, o.cx, o.cy)) { fogSnap(); tmp.forEach((on, k) => { if (on) HOST.fog[k] = 1; }); fogSaveLocal(); }
    HOST.enc = { cid: c.id, eid: e.id }; if (HOST.show === "handout") { HOST.show = "map"; handoutUI(); } drawMapDM(); hostSend();
  }
  toast(`Fight added to “${c.name}” → Encounters${HOST.on ? ", the room is revealed and the turn order is on the TV" : ""}.`);
}
$("#roomKey").addEventListener("click", e => { const b = e.target.closest("[data-runenc]"); if (b) mapRunEncounter(+b.dataset.runenc); });
function roomKeyHTML(d) {
  return d.rooms.map((o, i) => `<div class="key-room"><span class="key-num">${o.num}</span><b>${esc(o.type)}</b> <span class="muted">(${o.w * 5} × ${o.h * 5} ft)</span><div>Features ${esc(o.feature)}.</div>${o.content.map(c => `<div>${esc(c)}</div>`).join("")}${o.enc ? encHTML(o.enc) + mapRunBtn(i) : ""}</div>`).join("");
}
function roomKeyText(d) {
  return `${d.params.name}\n${"=".repeat(d.params.name.length)}\n` + d.rooms.map(o => `${o.num}. ${o.type} (${o.w * 5}×${o.h * 5} ft)\n   Features ${o.feature}.\n` + o.content.map(c => "   " + c + "\n").join("") + (o.enc ? `   Encounter: ${o.enc.text} [${o.enc.rating}]\n` : "")).join("\n");
}

/* ======================= Map UI ======================= */
let currentMap = null;
function readMapForm() {
  if (!$("#mapSeed").value.trim()) $("#mapSeed").value = newSeed();
  return {
    name: $("#mapName").value.trim().slice(0, 60) || "Untitled Dungeon", theme: $("#mapTheme").value, size: $("#mapSize").value,
    rooms: clamp(parseInt($("#mapRooms").value) || 10, 4, 24), level: clamp(parseInt($("#mapLevel").value) || 1, 1, 20),
    party: clamp(parseInt($("#mapParty").value) || 4, 1, 8), seed: $("#mapSeed").value.trim().toUpperCase(), style: $("#mapStyle").value
  };
}
// open a map saved in a campaign; its saved fog (if any) replaces the copy kept on this computer
function mapOpenSaved(m) {
  if (m.kind === "image") { imgOpenSaved(m); return; }
  setMapForm(m);
  if (m.fog) fogStorePut(fogKey(m), m.fog, m.found || [], m.tokens);
  HOST.key = null; location.hash = "map"; renderMap();
}
function setMapForm(p) { $("#mapStyle").value = MAP_STYLES[p.style] ? p.style : "parchment"; $("#mapName").value = p.name; $("#mapTheme").value = p.theme; $("#mapSize").value = p.size; $("#mapRooms").value = p.rooms; $("#mapLevel").value = p.level; $("#mapParty").value = p.party; $("#mapSeed").value = p.seed; }
function renderMap() {
  $("#impPanel").hidden = true; $("#impPlace").checked = false;
  const p = readMapForm();
  const cap = { small: 10, medium: 16, large: 24 }[p.size];
  currentMap = generateDungeon({ ...p, rooms: Math.min(p.rooms, cap) });
  hostLoad(currentMap); drawMapDM(); if (HOST.on) hostSend();
  $("#roomKey").innerHTML = roomKeyHTML(currentMap) + (currentMap.rooms.length < p.rooms ? `<p class="hint">Only ${currentMap.rooms.length} rooms fit on this map size. Try a larger size.</p>` : ""); fogKeyButtons();
}
$("#mapForm").addEventListener("submit", e => { e.preventDefault(); $("#mapSeed").value = newSeed(); renderMap(); });
["#mapTheme", "#mapStyle", "#mapSize", "#mapRooms", "#mapLevel", "#mapParty", "#mapGrid"].forEach(id => $(id).addEventListener("change", () => {
  // on an imported map, the grid lines and party settings just redraw; any other setting means "make me a dungeon"
  if (currentMap && currentMap.kind === "image" && ["#mapGrid", "#mapLevel", "#mapParty"].includes(id)) { drawMapDM(); if (HOST.on) hostSend(); } else renderMap();
}));
$("#mapName").addEventListener("change", renderMap); $("#mapSeed").addEventListener("change", renderMap);
$("#mapCopyKey").addEventListener("click", async () => { if (!currentMap) return; try { await navigator.clipboard.writeText(currentMap.kind === "image" ? imgKeyText(currentMap) : roomKeyText(currentMap)); toast("Room key copied"); } catch { toast("Couldn't copy here — select the key text instead"); } });
$("#mapDownload").addEventListener("click", () => {
  if (!currentMap) return;
  const cv = document.createElement("canvas"); drawDungeon(cv, currentMap, $("#mapGrid").checked, { scale: 2 });
  cv.toBlob(blob => saveFile(mapFileName() + ".png", blob), "image/png");
});
function mapFileName() { return currentMap.params.name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "dungeon"; }
$("#mapDownloadPlayer").addEventListener("click", () => {
  if (!currentMap) return;
  const cv = document.createElement("canvas"); drawDungeon(cv, currentMap, $("#mapGrid").checked, { player: true, numbers: true, scale: 2 });
  cv.toBlob(blob => saveFile(mapFileName() + "-players.png", blob), "image/png");
});
/* the map on screen as a saved entry (generated: its settings; imported: imgRecord, no picture), with its fog and tokens */
function mapEntryNow() {
  if (!currentMap) return null;
  const rec = currentMap.kind === "image" ? imgRecord(currentMap) : { ...currentMap.params };
  const fogPart = HOST.fog && HOST.key === fogKey(rec) ? { fog: fogEncode(HOST.fog), found: [...HOST.found], tokens: HOST.tokens } : (e => e ? { fog: e.f, found: e.s || [], tokens: e.k } : {})(fogStoreRead()[fogKey(rec)]);
  return { ...rec, id: uid("m"), saved: Date.now(), ...fogPart };
}
$("#mapSave").addEventListener("click", () => {
  const id = $("#mapCampaign").value; const c = Store.get(id);
  if (!c || !currentMap) { toast("Create a campaign first"); return; }
  c.maps = c.maps || [];
  c.maps.unshift(mapEntryNow());
  Store.save(c); toast(`Map saved to “${c.name}”`); if (activeId === id) renderTracker();
});
/* World places: which place the map on screen belongs to (set when it's opened from the World tab) */
const MAPLINK = { place: null };
function mapPlaceFill() { const sel = $("#mapPlace"); if (sel) sel.innerHTML = wpOptionsHTML(MAPLINK.place && wp(MAPLINK.place) ? MAPLINK.place : null, "Choose a place…").replace(/^<option value="" ([^>]*)>No place<\/option>/, '<option value="" $1>Choose a place…</option>'); }
$("#mapSavePlace").addEventListener("click", () => {
  if (!currentMap) { toast("Make or open a map first"); return; }
  const pl = wpPick($("#mapPlace").value); if (!pl) { if (pl === "") toast("Choose a World place first"); mapPlaceFill(); return; }
  const old = pl.map; pl.map = mapEntryNow(); MAPLINK.place = pl.id; worldSave(); mapPlaceFill();
  if (old && old.imgId && old.imgId !== pl.map.imgId) mapImgTidy(old.imgId);
  toast(`Map saved to ${pl.name} on the World tab`);
});
/* forget an imported map's picture once no campaign map or World place uses it */
function mapImgTidy(imgId) {
  if (!imgId || (currentMap && currentMap.kind === "image" && currentMap.id === imgId)) return;
  const used = W.places.some(x => x.map && x.map.imgId === imgId) || Store.list().some(c => (c.maps || []).some(m => m.imgId === imgId));
  if (!used) MAPIMG.del(imgId).catch(() => {});
}

/* ======================= Imported maps, map files and VTT exports =======================
   An imported map is {kind:"image", id, img (canvas), px (image pixels per square), ox, oy, W, H, rooms (numbered markers), walls (in squares), params}.
   Its picture is kept on this computer (IndexedDB "dmforge-maps"), never in the campaign data, so it costs no Netlify storage. */
const MAPIMG = {
  db: null,
  open() { return this.db || (this.db = new Promise((res, rej) => { const r = indexedDB.open("dmforge-maps", 1); r.onupgradeneeded = () => r.result.createObjectStore("images"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
  async put(id, blob) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction("images", "readwrite"); t.objectStore("images").put(blob, id); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); },
  async get(id) { const db = await this.open(); return new Promise((res, rej) => { const q = db.transaction("images").objectStore("images").get(id); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); }); },
  /* every stored picture: [[key, Blob]] (map pictures and NPC pictures), for backups */
  async all() { const db = await this.open(); return new Promise((res, rej) => { const out = [], q = db.transaction("images").objectStore("images").openCursor(); q.onsuccess = () => { const c = q.result; if (!c) return res(out); out.push([String(c.key), c.value]); c.continue(); }; q.onerror = () => rej(q.error); }); },
  async clear() { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction("images", "readwrite"); t.objectStore("images").clear(); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); },
  async del(id) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction("images", "readwrite"); t.objectStore("images").delete(id); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
};
const IMG_MAX = 4096;
async function loadImageCanvas(src) { // a File, Blob or data: URL -> a canvas no bigger than 4096 px, and how much it was shrunk
  const blob = typeof src === "string" ? await (await fetch(src)).blob() : src;
  const bmp = await createImageBitmap(blob), k = Math.min(1, IMG_MAX / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
  return { cv, k };
}
const canvasBlob = (cv, type = "image/webp") => new Promise(res => cv.toBlob(b => res(b), type, .92));
function imgRoom(r, i) { return { num: i + 1, cx: r.cx, cy: r.cy, x: r.cx, y: r.cy, w: 1, h: 1, name: r.name || "", notes: r.notes || "", type: r.name || `Room ${i + 1}`, feature: "", content: r.content || [], enc: r.enc || null, marks: [], icons: [] }; }
function imageMapBuild(m, img) {
  const d = { kind: "image", id: m.imgId || m.id, img, px: m.px, ox: m.ox || 0, oy: m.oy || 0, walls: m.walls || [], doors: [], rooms: [], params: {} };
  d.params = { kind: "image", id: d.id, imgId: d.id, name: m.name || "Imported map", theme: m.theme || "crypt", level: m.level || +$("#mapLevel").value || 3, party: m.party || +$("#mapParty").value || 4, seed: d.id, style: "parchment", size: "image", rooms: 0 };
  imgRegrid(d, m.markers || []); return d;
}
function imgRegrid(d, markers) {
  d.W = Math.max(1, Math.floor((d.img.width - d.ox) / d.px)); d.H = Math.max(1, Math.floor((d.img.height - d.oy) / d.px));
  d.grid = new Uint8Array(d.W * d.H).fill(1); d.rid = new Int16Array(d.W * d.H).fill(-1);
  d.rooms = (markers || d.rooms).filter(r => r.cx < d.W && r.cy < d.H).map((r, i) => imgRoom(r, i));
  d.params.W = d.W; d.params.H = d.H; d.params.rooms = d.rooms.length;
}
function imgRecord(d) { // what a campaign keeps (no picture)
  return { kind: "image", imgId: d.id, name: d.params.name, theme: d.params.theme, level: d.params.level, party: d.params.party, px: d.px, ox: d.ox, oy: d.oy, W: d.W, H: d.H, walls: d.walls,
    markers: d.rooms.map(r => ({ cx: r.cx, cy: r.cy, name: r.name, notes: r.notes, content: r.content, enc: r.enc })) };
}
function imageKeyHTML(d) {
  if (!d.rooms.length) return `<p class="muted">Turn on <b>Place rooms</b> above, then click the map to number each room. Each one gets an entry here for your notes.</p>`;
  return d.rooms.map((o, i) => `<div class="key-room"><div class="row" style="align-items:center;gap:6px"><span class="key-num">${o.num}</span><input type="text" data-imf="name" data-i="${i}" value="${esc(o.name)}" placeholder="Room name" style="flex:1;min-width:160px"><button class="btn sm" type="button" data-ima="roll" data-i="${i}" title="Fill this room with an encounter, trap, treasure or something odd, for your party's level">🎲 Roll contents</button><button class="icon-btn" type="button" data-ima="del" data-i="${i}" title="Remove room ${o.num}">✕</button></div>
    <textarea data-imf="notes" data-i="${i}" placeholder="What's here: description, monsters, treasure, secrets…" style="margin-top:6px;min-height:52px">${esc(o.notes)}</textarea>${o.content.map(c => `<div>${esc(c)}</div>`).join("")}${o.enc ? encHTML(o.enc) + mapRunBtn(i) : ""}</div>`).join("");
}
function imgKeyText(d) { return `${d.params.name}\n${"=".repeat(d.params.name.length)}\n` + d.rooms.map(o => `${o.num}. ${o.name || "Room"}\n` + (o.notes ? `   ${o.notes}\n` : "") + o.content.map(c => "   " + c + "\n").join("") + (o.enc ? `   Encounter: ${o.enc.text} [${o.enc.rating}]\n` : "")).join("\n"); }
function renderImageMap() {
  const d = currentMap; $("#impPanel").hidden = false;
  $("#impName").value = d.params.name; $("#impTheme").value = d.params.theme; $("#impAcross").value = Math.round(d.img.width / d.px);
  for (const k of ["X", "Y"]) { const el = $("#impOff" + k); el.max = Math.max(0, Math.floor(d.px) - 1); el.value = k === "X" ? d.ox : d.oy; $("#impOff" + k + "v").textContent = el.value; }
  hostLoad(d); drawMapDM(); if (HOST.on) hostSend();
  $("#roomKey").innerHTML = imageKeyHTML(d); fogKeyButtons();
}
function imgUse(d, toastMsg) { currentMap = d; HOST.key = null; MAPUI.hover = null; location.hash = "map"; renderImageMap(); if (toastMsg) toast(toastMsg); }
// roll a room's contents the way the dungeon generator does
function rollRoomContents(o, theme, level, party) {
  const r = makeRng("roll", Date.now(), Math.random()), lv = clamp(level, 1, 20), tier = tierOf(lv), tags = TAGMAP[theme];
  const dc = [12, 15, 18, 21][tier], dmg = ["2d10", "4d10", "10d10", "18d10"][tier], coin = [[20, 150], [200, 1200], [1500, 8000], [10000, 40000]][tier];
  o.content = [`Features ${r.pick(FEATURES[theme])}.`]; o.enc = null; if (!o.name) o.name = o.type = r.pick(ROOM_TYPES[theme]);
  const roll = r.f();
  if (roll < .38) o.enc = buildEncounter(r, lv, party, r.pick(["easy", "medium", "medium", "hard"]), tags);
  else if (roll < .52) o.content.push(`Trap: ${r.pick(TRAPS)} (DC ${dc} to spot or avoid, ${dmg} damage).`);
  else if (roll < .66) o.content.push(`Treasure: ${r.int(coin[0], coin[1])} gp${r.chance(.35) ? ", " + r.pick(REWARDS[tier]) : ""}.`);
  else if (roll < .76) { o.enc = buildEncounter(r, lv, party, "medium", tags); o.content.push(`Treasure: ${r.int(coin[0], coin[1])} gp.`); }
  else o.content.push(r.pick(["Empty, but something has been here recently.", "Quiet. A good place for a short rest.", "A clue to the villain's plan is scratched into the wall.", "A lost NPC is hiding here.", "A puzzle blocks a hidden cache."]));
}
// panel
$("#impName").addEventListener("change", e => { if (currentMap && currentMap.kind === "image") { currentMap.params.name = e.target.value.trim().slice(0, 60) || "Imported map"; drawMapDM(); if (HOST.on) hostSend(); } });
$("#impTheme").addEventListener("change", e => { if (currentMap && currentMap.kind === "image") currentMap.params.theme = e.target.value; });
function imgGridChanged() { const d = currentMap; imgRegrid(d); HOST.key = null; renderImageMap(); }
$("#impAcross").addEventListener("change", e => { const d = currentMap; if (!d || d.kind !== "image") return; const n = clamp(parseInt(e.target.value) || 30, 4, 200); d.px = d.img.width / n; d.ox = Math.min(d.ox, Math.floor(d.px) - 1); d.oy = Math.min(d.oy, Math.floor(d.px) - 1); imgGridChanged(); });
for (const k of ["X", "Y"]) $("#impOff" + k).addEventListener("input", e => { const d = currentMap; if (!d || d.kind !== "image") return; d["o" + k.toLowerCase()] = +e.target.value; $("#impOff" + k + "v").textContent = e.target.value; imgGridChanged(); });
$("#impPlace").addEventListener("change", e => { $("#mapCanvas").classList.toggle("placing", e.target.checked); if (e.target.checked && HOST.on) toast("Stop hosting to place rooms; while hosting, the mouse paints fog."); });
// key entries
$("#roomKey").addEventListener("change", e => { const t = e.target; if (!t.dataset.imf || !currentMap || currentMap.kind !== "image") return; const o = currentMap.rooms[+t.dataset.i]; if (!o) return; o[t.dataset.imf] = t.value; if (t.dataset.imf === "name") o.type = t.value || `Room ${o.num}`; });
$("#roomKey").addEventListener("click", e => {
  const b = e.target.closest("[data-ima]"); if (!b || !currentMap || currentMap.kind !== "image") return; const d = currentMap, i = +b.dataset.i, o = d.rooms[i]; if (!o) return;
  if (b.dataset.ima === "roll") rollRoomContents(o, d.params.theme, +$("#mapLevel").value || d.params.level, +$("#mapParty").value || d.params.party);
  else if (b.dataset.ima === "del") { d.rooms.splice(i, 1); d.rooms = d.rooms.map((r, k) => Object.assign(r, { num: k + 1 })); d.params.rooms = d.rooms.length; drawMapDM(); if (HOST.on) hostSend(); }
  $("#roomKey").innerHTML = imageKeyHTML(d); fogKeyButtons();
});
// placing and moving room numbers
function imgPlaceOn() { return !!currentMap && currentMap.kind === "image" && $("#impPlace").checked && !HOST.on; }
function imgDown(e) { const c = canvasCell(e); if (!c || !c.inGrid) return; MAPUI.drag = { o: mapRoomAt(c), x: c.x, y: c.y, moved: false }; e.target.setPointerCapture(e.pointerId); }
function imgMove(e) {
  const g = MAPUI.drag, c = canvasCell(e); if (!g.o || !c || !c.inGrid || (c.x === g.o.cx && c.y === g.o.cy) || currentMap.rooms.some(r => r !== g.o && r.cx === c.x && r.cy === c.y)) return;
  g.o.cx = g.o.x = c.x; g.o.cy = g.o.y = c.y; g.moved = true; drawMapDM();
}
function imgUp() {
  const g = MAPUI.drag, d = currentMap; MAPUI.drag = null; if (!g) return;
  if (!g.o && !d.rooms.some(r => r.cx === g.x && r.cy === g.y)) { d.rooms.push(imgRoom({ cx: g.x, cy: g.y }, d.rooms.length)); d.params.rooms = d.rooms.length; }
  drawMapDM(); if (HOST.on) hostSend(); $("#roomKey").innerHTML = imageKeyHTML(d); fogKeyButtons();
}
// importing
$("#mapImportImage").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  let loaded; try { loaded = await loadImageCanvas(f); } catch { toast("Couldn't open that picture. Try a PNG, JPG or WebP."); return; }
  const id = uid("img"); MAPIMG.put(id, await canvasBlob(loaded.cv)).catch(() => toast("Couldn't keep the picture on this computer; export a map file to keep it."));
  const across = clamp(Math.round(loaded.cv.width / 70), 4, 200);
  imgUse(imageMapBuild({ imgId: id, name: f.name.replace(/\.[^.]+$/, "").slice(0, 60), px: loaded.cv.width / across, theme: $("#mapTheme").value }, loaded.cv), "Map imported. Set Squares across so the grid lines up, then turn on Place rooms.");
});
$("#mapImportVtt").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  let j; try { j = JSON.parse(await f.text()); } catch { j = null; }
  const res = j && j.resolution;
  if (!res || !res.pixels_per_grid || !res.map_size || typeof j.image !== "string") { toast("That isn't a Universal VTT file (.dd2vtt, .df2vtt or .uvtt)."); return; }
  let loaded; try { loaded = await loadImageCanvas((j.image.startsWith("data:") ? "" : "data:image/png;base64,") + j.image); } catch { toast("Couldn't read the picture inside that VTT file."); return; }
  const o = res.map_origin || { x: 0, y: 0 }, walls = [];
  const addLine = pts => { for (let i = 1; i < (pts || []).length; i++) walls.push([pts[i - 1].x - o.x, pts[i - 1].y - o.y, pts[i].x - o.x, pts[i].y - o.y]); };
  (j.line_of_sight || []).forEach(addLine); (j.objects_line_of_sight || []).forEach(addLine);
  (j.portals || []).forEach(p => addLine(p.bounds)); // doors count as walls when revealing an area
  const id = uid("img"); MAPIMG.put(id, await canvasBlob(loaded.cv)).catch(() => {});
  imgUse(imageMapBuild({ imgId: id, name: f.name.replace(/\.[^.]+$/, "").slice(0, 60), px: res.pixels_per_grid * loaded.k, walls, theme: $("#mapTheme").value }, loaded.cv), "VTT map imported with its grid and walls. Turn on Place rooms to number the rooms.");
});
$("#mapImportFile").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  let j; try { j = JSON.parse(await f.text()); } catch { j = null; }
  if (!j || j.app !== "dmforge-map" || !j.map) { toast("That file isn't a Forge map. Choose a file made with Export → Map file."); return; }
  const m = j.map;
  if (m.kind === "image") {
    if (typeof j.image !== "string") { toast("That map file has no picture in it."); return; }
    let loaded; try { loaded = await loadImageCanvas(j.image); } catch { toast("Couldn't read the picture in that map file."); return; }
    const id = m.imgId || uid("img"); MAPIMG.put(id, await canvasBlob(loaded.cv)).catch(() => {});
    const d = imageMapBuild({ ...m, imgId: id, px: m.px * loaded.k, ox: Math.round((m.ox || 0) * loaded.k), oy: Math.round((m.oy || 0) * loaded.k) }, loaded.cv);
    if (m.fog) fogStorePut(fogKey(imgRecord(d)), m.fog, m.found || [], m.tokens);
    imgUse(d, `“${d.params.name}” loaded.`); return;
  }
  setMapForm(m); if (m.fog) fogStorePut(fogKey(m), m.fog, m.found || [], m.tokens);
  HOST.key = null; location.hash = "map"; renderMap(); toast(`“${m.name}” loaded.`);
});
async function imgOpenSaved(m) {
  let blob = null; try { blob = await MAPIMG.get(m.imgId); } catch { /* storage unavailable */ }
  if (!blob) { toast("This map's picture isn't on this computer. Use Import → Map file to load it."); return; }
  const loaded = await loadImageCanvas(blob), d = imageMapBuild(m, loaded.cv);
  if (m.fog) fogStorePut(fogKey(imgRecord(d)), m.fog, m.found || [], m.tokens);
  imgUse(d);
}
// exporting
function mapFogForExport(key) { if (HOST.fog && HOST.key === key) return { fog: fogEncode(HOST.fog), found: [...HOST.found] }; const e = fogStoreRead()[key]; return e ? { fog: e.f, found: e.s || [] } : {}; }
$("#mapExportFile").addEventListener("click", async () => {
  const d = currentMap; if (!d) return;
  if (d.kind === "image") {
    const rec = imgRecord(d), image = await new Promise(res => { const r = new FileReader(); canvasBlob(d.img).then(b => { r.onload = () => res(r.result); r.readAsDataURL(b); }); });
    saveFile(mapFileName() + ".forgemap.json", JSON.stringify({ app: "dmforge-map", v: 1, made: new Date().toISOString(), map: { ...rec, ...mapFogForExport(fogKey(rec)) }, image }));
  } else saveFile(mapFileName() + ".forgemap.json", JSON.stringify({ app: "dmforge-map", v: 1, made: new Date().toISOString(), map: { ...d.params, ...mapFogForExport(fogKey(d.params)) } }));
  toast("Map file downloaded.");
});
// the map picture at a VTT's pixels per square, without the header (players' version: no traps, secret doors as wall)
function mapVttPicture(d, ppg) {
  if (d.kind === "image") { const cv = document.createElement("canvas"); cv.width = Math.round(d.W * ppg); cv.height = Math.round(d.H * ppg); cv.getContext("2d").drawImage(d.img, d.ox, d.oy, d.W * d.px, d.H * d.px, 0, 0, cv.width, cv.height); return cv; }
  return mapBase(d, false, true, HOST.key === fogKey(d.params) ? HOST.found : null, ppg / CS);
}
function mapVttWalls(d) {
  if (d.kind === "image") return d.walls.map(w => [{ x: w[0], y: w[1] }, { x: w[2], y: w[3] }]);
  const { W, H, grid } = d, F = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y * W + x] > 0, out = [];
  for (let y = 0; y <= H; y++) { let run = null; for (let x = 0; x <= W; x++) { const edge = x < W && F(x, y - 1) !== F(x, y); if (edge && run === null) run = x; if (!edge && run !== null) { out.push([{ x: run, y }, { x, y }]); run = null; } } }
  for (let x = 0; x <= W; x++) { let run = null; for (let y = 0; y <= H; y++) { const edge = y < H && F(x - 1, y) !== F(x, y); if (edge && run === null) run = y; if (!edge && run !== null) { out.push([{ x, y: run }, { x, y }]); run = null; } } }
  const found = HOST.key === fogKey(d.params) ? HOST.found : new Set();
  d.doors.filter(dr => dr.secret && !found.has(dr.x + "," + dr.y)).forEach(dr => out.push(mapDoorEdge(dr)));
  return out;
}
function mapDoorEdge(dr) { // the edge between a door's corridor square and the room it opens into
  if (dr.dx) { const X = dr.x + (dr.dx > 0 ? 1 : 0); return [{ x: X, y: dr.y }, { x: X, y: dr.y + 1 }]; }
  const Y = dr.y + (dr.dy > 0 ? 1 : 0); return [{ x: dr.x, y: Y }, { x: dr.x + 1, y: Y }];
}
$("#mapExportVtt").addEventListener("click", () => {
  const d = currentMap; if (!d) return; toast("Preparing the VTT file…");
  setTimeout(() => {
    const ppg = 100, pic = mapVttPicture(d, ppg);
    const found = d.kind !== "image" && HOST.key === fogKey(d.params) ? HOST.found : new Set();
    const portals = d.kind === "image" ? [] : d.doors.filter(dr => !dr.secret || found.has(dr.x + "," + dr.y)).map(dr => { const b = mapDoorEdge(dr); return { position: { x: (b[0].x + b[1].x) / 2, y: (b[0].y + b[1].y) / 2 }, bounds: b, rotation: dr.dx ? Math.PI / 2 : 0, closed: true, freestanding: false }; });
    const vtt = { format: 0.3, resolution: { map_origin: { x: 0, y: 0 }, map_size: { x: d.W, y: d.H }, pixels_per_grid: ppg }, line_of_sight: mapVttWalls(d), objects_line_of_sight: [], portals, environment: { baked_lighting: false, ambient_light: "ffffffff" }, lights: [], image: pic.toDataURL("image/png").split(",")[1] };
    saveFile(mapFileName() + ".dd2vtt", JSON.stringify(vtt));
  }, 30);
});
$("#mapExportRoll20").addEventListener("click", () => { const d = currentMap; if (!d) return; mapVttPicture(d, 70).toBlob(b => saveFile(mapFileName() + "-roll20.png", b), "image/png"); });

/* ======================= Player screen (same computer) =======================
   The TV window (player.html) only ever receives finished pictures over a BroadcastChannel:
   DM -> TV on "dmforge.map" ({t:"frame",blob} | {t:"ping",x,y} | {t:"bye"}), TV -> DM on "dmforge.map.tv" ({t:"hello"} | {t:"bye"}).
   No network is used. */
const HOST = { ch: null, up: null, win: null, on: false, tv: false, key: null, fog: null, found: new Set(), numbers: false, undo: [], timer: 0,
  show: "map", handout: null, enc: null /* {cid, eid}: the fight whose turn order is on the TV */, tokens: [], tokDrag: null };
function drawMapDM() {
  if (!currentMap) return;
  const cv = $("#mapCanvas"), d = currentMap; $("#mapOverlay").parentElement.style.width = (MAPUI.zoom * 100) + "%"; // the stage grows; the canvas fills it
  // draw at the size it's shown, so zooming in stays sharp
  const shown = Math.max(300, ($("#mapWrap").clientWidth - 20) * MAPUI.zoom) * (window.devicePixelRatio || 1);
  const scale = Math.min(4, Math.max(1, Math.ceil((shown / (d.W * CS)) * 4) / 4));
  drawDungeon(cv, d, $("#mapGrid").checked, { fog: HOST.on ? HOST.fog : null, found: HOST.found, scale, tokens: HOST.on ? tokenView() : [] });
  mapOverlayDraw(); fogKeyButtons();
}
/* ---- reading the map: hover a room <-> its key entry, click to jump, zoom and drag ---- */
const MAPUI = { zoom: 1, hover: null, pan: null, drag: null };
const MAP_ZOOMS = [1, 1.5, 2, 3];
function mapRoomAt(c) { const d = currentMap; if (!d || !c || !c.inGrid) return null; if (d.kind === "image") return d.rooms.find(o => o.cx === c.x && o.cy === c.y) || null; const r = d.rid[c.y * d.W + c.x]; return r < 0 ? null : d.rooms.find(o => d.rid[o.cy * d.W + o.cx] === r) || null; }
function mapSetHover(num) {
  if (MAPUI.hover === num) return; MAPUI.hover = num;
  document.querySelectorAll("#roomKey .key-room").forEach((el, i) => el.classList.toggle("hl", !!currentMap && currentMap.rooms[i] && currentMap.rooms[i].num === num));
  mapOverlayDraw();
}
function mapOverlayDraw() {
  const ov = $("#mapOverlay"), cv = $("#mapCanvas"), d = currentMap; if (!d) return;
  ov.width = cv.width; ov.height = cv.height; const g = ov.getContext("2d"), k = cv.width / (d.W * CS); g.setTransform(k, 0, 0, k, 0, 0);
  const o = MAPUI.hover && d.rooms.find(r => r.num === MAPUI.hover); if (!o) return;
  if (d.kind === "image") { g.strokeStyle = "#e8a33d"; g.lineWidth = 3; g.shadowColor = "rgba(232,163,61,.9)"; g.shadowBlur = 8; g.beginPath(); g.arc(o.cx * CS + CS / 2, TOP + o.cy * CS + CS / 2, 14, 0, 7); g.stroke(); return; }
  const rid = d.rid[o.cy * d.W + o.cx], same = (x, y) => x >= 0 && y >= 0 && x < d.W && y < d.H && d.rid[y * d.W + x] === rid;
  g.translate(0, TOP); g.fillStyle = "rgba(232,163,61,.14)"; g.strokeStyle = "#e8a33d"; g.lineWidth = 2.5; g.shadowColor = "rgba(232,163,61,.8)"; g.shadowBlur = 6; g.beginPath();
  for (let y = 0; y < d.H; y++) for (let x = 0; x < d.W; x++) {
    if (!same(x, y)) continue; const X = x * CS, Y = y * CS; g.fillRect(X, Y, CS, CS);
    if (!same(x, y - 1)) { g.moveTo(X, Y); g.lineTo(X + CS, Y); } if (!same(x, y + 1)) { g.moveTo(X, Y + CS); g.lineTo(X + CS, Y + CS); }
    if (!same(x - 1, y)) { g.moveTo(X, Y); g.lineTo(X, Y + CS); } if (!same(x + 1, y)) { g.moveTo(X + CS, Y); g.lineTo(X + CS, Y + CS); }
  }
  g.stroke();
}
function mapZoom(z) {
  const w = $("#mapWrap"), cx = (w.scrollLeft + w.clientWidth / 2) / w.scrollWidth, cy = (w.scrollTop + w.clientHeight / 2) / w.scrollHeight;
  MAPUI.zoom = z; drawMapDM();
  w.scrollLeft = cx * w.scrollWidth - w.clientWidth / 2; w.scrollTop = cy * w.scrollHeight - w.clientHeight / 2;
}
$("#mapZoomIn").addEventListener("click", () => mapZoom(MAP_ZOOMS.find(z => z > MAPUI.zoom) || MAPUI.zoom));
$("#mapZoomOut").addEventListener("click", () => mapZoom([...MAP_ZOOMS].reverse().find(z => z < MAPUI.zoom) || 1));
$("#mapFit").addEventListener("click", () => mapZoom(1));
$("#mapCanvas").addEventListener("pointermove", e => {
  if (MAPUI.drag) { imgMove(e); return; }
  if (MAPUI.pan) { const p = MAPUI.pan, dx = e.clientX - p.x, dy = e.clientY - p.y; if (Math.abs(dx) + Math.abs(dy) > 4) p.moved = true; $("#mapWrap").scrollLeft = p.sl - dx; $("#mapWrap").scrollTop = p.st - dy; return; }
  const o = mapRoomAt(canvasCell(e)); mapSetHover(o ? o.num : null);
});
$("#mapCanvas").addEventListener("pointerleave", () => { if (!MAPUI.pan) mapSetHover(null); });
$("#mapCanvas").addEventListener("pointerdown", e => {
  if (HOST.on || e.button !== 0) return; // while hosting, the mouse paints fog instead
  if (imgPlaceOn()) { imgDown(e); return; }
  MAPUI.pan = { x: e.clientX, y: e.clientY, sl: $("#mapWrap").scrollLeft, st: $("#mapWrap").scrollTop, moved: false };
  e.target.setPointerCapture(e.pointerId); $("#mapWrap").classList.add("panning");
});
$("#mapCanvas").addEventListener("pointerup", e => {
  if (MAPUI.drag) { imgUp(e); return; }
  const p = MAPUI.pan; if (!p) return; MAPUI.pan = null; $("#mapWrap").classList.remove("panning");
  if (p.moved) return;
  const o = mapRoomAt(canvasCell(e)), el = o && document.querySelectorAll("#roomKey .key-room")[currentMap.rooms.indexOf(o)];
  if (el) { mapSetHover(o.num); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
});
$("#roomKey").addEventListener("mouseover", e => { const el = e.target.closest(".key-room"); if (!el || !currentMap) return; const i = [...document.querySelectorAll("#roomKey .key-room")].indexOf(el); if (currentMap.rooms[i]) mapSetHover(currentMap.rooms[i].num); });
$("#roomKey").addEventListener("mouseleave", () => mapSetHover(null));
// "Reveal on TV" / "Hide on TV" buttons on each Room Key entry while hosting (a keyboard-friendly way to use the Room tool)
function fogKeyButtons() {
  const d = currentMap; if (!d) return;
  $("#roomKey").querySelectorAll(".key-room").forEach((el, i) => {
    const o = d.rooms[i]; if (!o) return;
    let b = el.querySelector("[data-fogroom]");
    if (!HOST.on || !HOST.fog) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement("button"); b.type = "button"; b.className = "btn sm"; b.style.float = "right"; b.dataset.fogroom = o.num; el.prepend(b); }
    const shown = !!HOST.fog[o.cy * d.W + o.cx]; b.textContent = shown ? "Hide on TV" : "👁 Reveal on TV"; b.setAttribute("aria-label", (shown ? "Hide room " : "Reveal room ") + o.num + " on the TV");
  });
}
function hostLoad(d) {
  const key = fogKey(d.params); if (HOST.key === key && HOST.fog) return;
  const saved = fogLoadLocal(key);
  HOST.key = key; HOST.fog = saved ? saved.fog : fogNew(d); HOST.found = saved ? saved.found : new Set(); HOST.undo = []; HOST.tokens = saved && saved.tokens ? saved.tokens : []; tokListRender();
  if (HOST.on) hostSend();
}
function hostStatus() {
  const b = $("#hostStatus"); b.textContent = !HOST.on ? "Not connected" : (HOST.tv ? "📺 TV connected" : "Waiting for the TV window…") + (HOST.show === "handout" ? " · showing a handout" : "");
  b.className = "badge" + (HOST.on && HOST.tv ? " ok" : "");
  $("#hostStart").textContent = HOST.on ? "Stop hosting" : "📺 Host for players"; $("#hostStart").classList.toggle("primary", !HOST.on);
  $("#fogTools").disabled = !HOST.on; $("#mapCanvas").classList.toggle("fogging", HOST.on);
}
function hostSend() {
  clearTimeout(HOST.timer);
  HOST.timer = setTimeout(() => {
    if (!HOST.on || !HOST.ch) return;
    const cv = hostFrameCanvas(); if (!cv) return;
    cv.toBlob(blob => { if (blob && HOST.on) HOST.ch.postMessage({ t: "frame", blob }); }, "image/png");
  }, 80);
}
// the picture the TV gets: a handout, or the player map (with the turn order across the top when a fight is on the TV)
function hostFrameCanvas() {
  if (HOST.show === "handout" && HOST.handout) return HOST.handout;
  let cv = null;
  if (HOST.show === "atlas" && HOST.atlas) { // a World or region map (src/app/06b-atlas.js): found places only
    cv = atlasTvCanvas();
    if (cv) { const f = hostEnc(); if (f) tvDrawInitStrip(cv, tvInitRows(f.c, f.e), f.e.round); return cv; }
  }
  if (currentMap) { cv = document.createElement("canvas"); drawDungeon(cv, currentMap, $("#mapGrid").checked, { player: true, fog: HOST.fog, found: HOST.found, numbers: HOST.numbers, scale: 2, tokens: tokenView() }); }
  const f = hostEnc();
  if (f) { const rows = tvInitRows(f.c, f.e); if (cv) tvDrawInitStrip(cv, rows, f.e.round); else cv = tvInitBoard(rows, f.e.round); }
  if (!cv) { cv = document.createElement("canvas"); cv.width = 1920; cv.height = 1080; const g = cv.getContext("2d"); g.fillStyle = "#0b0a09"; g.fillRect(0, 0, 1920, 1080); } // nothing to show yet: a dark screen
  return cv;
}
function hostEnc() { if (!HOST.enc) return null; const c = Store.get(HOST.enc.cid), e = c && findEnc(c, HOST.enc.eid); return e ? { c, e } : null; }
// what the TV may know about a fight: names, whose turn, Bloodied/Down. Never HP numbers.
function tvInitRows(c, e) {
  return encOrder(c, e).map(o => {
    const m = o.foe ? e.enemies.find(x => x.id === o.key) : null;
    const state = !m ? "" : m.hp <= 0 ? "Down" : m.hp <= m.max / 2 ? "Bloodied" : "";
    return { name: o.name, foe: !!o.foe, cur: e.turn === o.key, state };
  });
}
function tvChipLabel(r) { return (r.cur ? "▶ " : "") + r.name + (r.state ? " · " + r.state : ""); }
function tvDrawInitStrip(cv, rows, round) {
  const g = cv.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0);
  const W = cv.width, h = Math.round(Math.max(70, Math.min(130, W * .05))), pad = Math.round(h * .22);
  g.fillStyle = "#0c0a08"; g.fillRect(0, 0, W, h);
  g.fillStyle = "#c79a5b"; g.fillRect(0, h - 3, W, 3);
  let fs = Math.round(h * .36), label = `Round ${round || 1}`;
  const widths = f => { g.font = `600 ${f}px 'Crimson Pro', Georgia, serif`; return rows.map(r => g.measureText(tvChipLabel(r)).width + f * 1.2); };
  g.font = `700 ${fs}px Cinzel, Georgia, serif`; const lw = g.measureText(label).width + pad * 2;
  let ws = widths(fs); while (fs > 14 && lw + ws.reduce((a, b) => a + b + pad / 2, 0) > W - pad) { fs -= 2; ws = widths(fs); }
  g.textBaseline = "middle"; g.font = `700 ${fs}px Cinzel, Georgia, serif`; g.fillStyle = "#f5bb63"; g.textAlign = "left"; g.fillText(label, pad, h / 2);
  let x = lw; const ch = fs * 1.7, y = (h - 3 - ch) / 2;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], w = ws[i]; if (x + w > W - pad) { g.fillStyle = "#c9b48a"; g.fillText("…", x, h / 2); break; }
    g.fillStyle = r.cur ? "#e8a33d" : "rgba(255,255,255,.07)"; g.fillRect(x, y, w, ch);
    g.font = `600 ${fs}px 'Crimson Pro', Georgia, serif`;
    g.fillStyle = r.cur ? "#1a120a" : r.state === "Down" ? "#7d7266" : r.foe ? "#f2b8ae" : "#bcd8a8"; g.fillText(tvChipLabel(r), x + fs * .6, h / 2);
    if (r.state === "Down") { g.fillRect(x + fs * .5, h / 2, w - fs, 2); }
    x += w + pad / 2;
  }
}
function tvInitBoard(rows, round) {
  const cv = document.createElement("canvas"); cv.width = 1920; cv.height = 1080; const g = cv.getContext("2d");
  g.fillStyle = "#15110d"; g.fillRect(0, 0, 1920, 1080);
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#f5bb63"; g.font = "700 64px Cinzel, Georgia, serif"; g.fillText(`Round ${round || 1}`, 960, 110);
  const lh = Math.min(90, 820 / Math.max(1, rows.length)), fs = Math.round(lh * .55), top = 200;
  rows.forEach((r, i) => {
    const y = top + i * lh + lh / 2;
    if (r.cur) { g.fillStyle = "#e8a33d"; g.fillRect(460, y - lh * .42, 1000, lh * .84); }
    g.font = `600 ${fs}px 'Crimson Pro', Georgia, serif`; g.fillStyle = r.cur ? "#1a120a" : r.state === "Down" ? "#7d7266" : r.foe ? "#f2b8ae" : "#bcd8a8";
    g.fillText(tvChipLabel(r), 960, y);
  });
  return cv;
}
// handouts: a picture from the DM's computer, or writing on parchment
async function handoutPicture(file) {
  let bmp; try { bmp = await createImageBitmap(file); } catch { toast("Couldn't open that picture. Try a PNG or JPG."); return; }
  const k = Math.min(1, 2560 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas");
  cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
  handoutShow(cv);
}
function handoutWriting(title, text) {
  // size the parchment to the writing: short notes get big letters, long letters shrink to fit
  const W = 1200, M = 100, MAXH = 1600, top = title ? 240 : 120;
  const meas = document.createElement("canvas").getContext("2d");
  const wrap = f => { meas.font = `italic ${f}px 'Crimson Pro', Georgia, serif`; const out = []; String(text).split(/\n/).forEach(par => { let line = ""; par.split(/\s+/).forEach(w => { const t = line ? line + " " + w : w; if (meas.measureText(t).width > W - 2 * M && line) { out.push(line); line = w; } else line = t; }); out.push(line); }); return out; };
  let fs = 60, lines = wrap(fs);
  while (fs > 22 && top + lines.length * fs * 1.4 > MAXH - M) { fs -= 2; lines = wrap(fs); }
  const H = Math.max(900, Math.min(MAXH, Math.round(top + lines.length * fs * 1.4 + M)));
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  g.fillStyle = "#e9dcbd"; g.fillRect(0, 0, W, H);
  const v = g.createRadialGradient(W / 2, H / 2, H * .2, W / 2, H / 2, H * .75); v.addColorStop(0, "rgba(120,80,30,0)"); v.addColorStop(1, "rgba(120,80,30,.45)"); g.fillStyle = v; g.fillRect(0, 0, W, H);
  g.fillStyle = "#2a2018"; g.textBaseline = "top";
  if (title) { g.textAlign = "center"; g.font = "700 64px Cinzel, Georgia, serif"; g.fillText(title.slice(0, 60), W / 2, 120, W - 2 * M); }
  g.textAlign = "left"; g.font = `italic ${fs}px 'Crimson Pro', Georgia, serif`;
  lines.forEach((l, i) => g.fillText(l, M, top + i * fs * 1.4));
  handoutShow(cv);
}
function handoutShow(cv) { HOST.handout = cv; HOST.show = "handout"; handoutUI(); hostSend(); }
function handoutUI() { $("#handoutBack").hidden = HOST.show !== "handout" && HOST.show !== "atlas"; hostStatus(); }
/* ---- tokens ---- */
function tokenView() { // tokens with the fight-on-TV state (Bloodied/Down) for monsters
  const f = hostEnc(), st = {}; if (f) f.e.enemies.forEach(m => { st[m.name] = m.hp <= 0 ? "Down" : m.hp <= m.max / 2 ? "Bloodied" : ""; }); // same words as the TV's turn order, never HP
  return HOST.tokens.map(t => ({ ...t, state: t.kind === "foe" ? st[t.name] || "" : "" }));
}
function tokFree(tx, ty) { // the nearest floor square to (tx,ty) without a token
  const d = currentMap, seen = new Set([ty * d.W + tx]), q = [[tx, ty]];
  while (q.length) {
    const [x, y] = q.shift(), k = y * d.W + x;
    if (d.grid[k] > 0 && !HOST.tokens.some(t => t.x === x && t.y === y) && !d.rooms.some(r => r.cx === x && r.cy === y)) return [x, y];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * d.W + nx; if (nx >= 0 && ny >= 0 && nx < d.W && ny < d.H && !seen.has(j)) { seen.add(j); q.push([nx, ny]); } }
  }
  return [tx, ty];
}
function tokAdd(name, kind, room) {
  const d = currentMap; if (!d || !name) return;
  const o = (room && d.rooms.find(r => r.num === room)) || d.rooms[0], [x, y] = o ? tokFree(o.cx, o.cy) : tokFree(d.W >> 1, d.H >> 1);
  HOST.tokens.push({ id: uid("t"), name: String(name).slice(0, 40), kind, x, y });
}
function tokListRender() {
  const el = $("#tokList"); if (!el) return;
  el.innerHTML = HOST.tokens.map(t => `<span class="tok-chip"><i style="background:${TOKEN_COLORS[t.kind]}"></i>${esc(t.name)}<button type="button" data-tokdel="${t.id}" title="Remove ${esc(t.name)}" aria-label="Remove ${esc(t.name)}">✕</button></span>`).join("");
}
function tokChanged() { tokListRender(); fogChanged(); }
$("#tokParty").addEventListener("click", () => {
  const c = curCampForMap(), names = c && c.party && c.party.length ? c.party.map(p => p.name).filter(Boolean) : PCS.roster.map(p => p.name);
  const add = names.filter(n => !HOST.tokens.some(t => t.name === n));
  if (!add.length) { toast(names.length ? "The party's tokens are already on the map." : "No heroes yet: add them to the campaign's Party, or save characters to My Characters."); return; }
  add.forEach(n => tokAdd(n, "pc")); tokChanged();
});
$("#tokFight").addEventListener("click", () => {
  const f = hostEnc(); if (!f) { toast("Put a fight on the TV first: 📺 Show on TV in Encounters, or ⚔ Run this fight in the Room Key."); return; }
  const add = f.e.enemies.map(m => m.name).filter(n => !HOST.tokens.some(t => t.name === n));
  add.forEach(n => tokAdd(n, "foe", f.e.room)); tokChanged();
});
$("#tokAdd").addEventListener("click", () => { const n = $("#tokName").value.trim(); if (!n) { toast("Type a name for the token"); return; } tokAdd(n, $("#tokKind").value); $("#tokName").value = ""; tokChanged(); });
$("#tokList").addEventListener("click", e => { const b = e.target.closest("[data-tokdel]"); if (!b) return; HOST.tokens = HOST.tokens.filter(t => t.id !== b.dataset.tokdel); tokChanged(); });
function hostPing(fx, fy) { if (HOST.on && HOST.ch) HOST.ch.postMessage({ t: "ping", x: fx, y: fy }); }
function hostStart() {
  if (!HOST.ch) {
    HOST.ch = new BroadcastChannel("dmforge.map"); HOST.up = new BroadcastChannel("dmforge.map.tv");
    HOST.up.onmessage = e => { const m = e.data || {}; if (m.t === "hello") { HOST.tv = true; hostSend(); } else if (m.t === "bye") HOST.tv = false; hostStatus(); };
  }
  const w = window.open("player.html", "dmforge-tv", "popup,width=1280,height=800");
  if (!w) { toast("Your browser blocked the player window. Allow pop-ups for this site and try again."); return; }
  HOST.win = w; HOST.on = true; hostStatus(); drawMapDM(); hostSend();
}
function hostStop() {
  if (HOST.ch) HOST.ch.postMessage({ t: "bye" });
  HOST.on = false; HOST.tv = false; hostStatus(); drawMapDM();
}
$("#hostStart").addEventListener("click", () => HOST.on ? hostStop() : hostStart());

/* ---- fog: kept on this computer while playing; goes into a campaign only on Save ---- */
const FOG_LS = "dmforge.fog.v1", FOG_KEEP = 40;
function fogStoreRead() { try { return JSON.parse(localStorage.getItem(FOG_LS) || "{}"); } catch { return {}; } }
function fogStorePut(key, fogStr, found, tokens) {
  const all = fogStoreRead(); all[key] = { f: fogStr, s: found, k: tokens || [], t: Date.now() };
  const keys = Object.keys(all).sort((a, b) => all[b].t - all[a].t); keys.slice(FOG_KEEP).forEach(k => delete all[k]);
  try { localStorage.setItem(FOG_LS, JSON.stringify(all)); } catch { /* storage full: fog just won't persist */ }
}
function fogSaveLocal() { if (currentMap && HOST.fog) fogStorePut(HOST.key, fogEncode(HOST.fog), [...HOST.found], HOST.tokens); }
function fogLoadLocal(key) {
  const e = fogStoreRead()[key]; if (!e || !currentMap) return null;
  return { fog: fogDecode(e.f, currentMap.W * currentMap.H), found: new Set(e.s || []), tokens: (e.k || []).filter(t => t.x < currentMap.W && t.y < currentMap.H) };
}
function fogChanged() { fogSaveLocal(); drawMapDM(); hostSend(); }
function fogSnap() { HOST.undo.push({ f: HOST.fog.slice(), s: new Set(HOST.found) }); if (HOST.undo.length > 50) HOST.undo.shift(); }
// which map square is under the mouse; fx/fy are fractions of the whole picture (for pings)
function canvasCell(e) {
  const cv = $("#mapCanvas"), d = currentMap; if (!d) return null;
  const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) * (d.W * CS) / r.width, py = (e.clientY - r.top) * (d.H * CS + TOP) / r.height;
  const x = Math.floor(px / CS), y = Math.floor((py - TOP) / CS);
  return { x, y, fx: px / (d.W * CS), fy: py / (d.H * CS + TOP), inGrid: x >= 0 && y >= 0 && x < d.W && y < d.H };
}
const fogTool = () => $("input[name=fogTool]:checked").value, fogVal = () => $("input[name=fogVal]:checked").value === "reveal" ? 1 : 0;
let fogDrag = null;
$("#mapCanvas").addEventListener("pointerdown", e => {
  if (!HOST.on || !currentMap || e.button !== 0) return;
  const c = canvasCell(e); if (!c) return;
  if (e.shiftKey) { if (HOST.show === "map") hostPing(c.fx, c.fy); else toast("The TV is showing a handout. Press Back to map first."); return; }
  if (!c.inGrid) return;
  const d = currentMap, t = fogTool(), v = fogVal();
  if (t === "room") {
    const tmp = new Uint8Array(d.W * d.H); if (!fogRevealRoom(d, tmp, c.x, c.y)) return;
    fogSnap(); tmp.forEach((on, i) => { if (on) HOST.fog[i] = v; }); fogChanged();
  } else if (t === "secret") {
    const dr = d.doors.find(o => o.secret && o.x === c.x && o.y === c.y); if (!dr) { toast("Click on a secret door (S)"); return; }
    fogSnap(); const k = dr.x + "," + dr.y; HOST.found.has(k) ? HOST.found.delete(k) : HOST.found.add(k); fogChanged();
    toast(HOST.found.has(k) ? "Secret door found: now shown on the TV" : "Secret door hidden again");
  } else if (t === "token") {
    const tk = HOST.tokens.find(k => k.x === c.x && k.y === c.y); if (!tk) { toast("Press on a token and drag it. Add tokens under Tokens below."); return; }
    HOST.tokDrag = tk; e.target.setPointerCapture(e.pointerId);
  } else {
    fogSnap(); fogDrag = { t, v, x: c.x, y: c.y, cx: c.x, cy: c.y }; e.target.setPointerCapture(e.pointerId);
    if (t === "brush") { fogPaint(HOST.fog, d, c.x, c.y, +$("#fogSize").value, v); fogChanged(); } else fogBoxPreview();
  }
});
$("#mapCanvas").addEventListener("pointermove", e => {
  if (HOST.tokDrag) { const c = canvasCell(e), k = HOST.tokDrag; if (c && c.inGrid && (c.x !== k.x || c.y !== k.y) && !HOST.tokens.some(o => o !== k && o.x === c.x && o.y === c.y)) { k.x = c.x; k.y = c.y; drawMapDM(); } return; }
  if (!fogDrag) return; const c = canvasCell(e); if (!c) return;
  const x = Math.max(0, Math.min(currentMap.W - 1, c.x)), y = Math.max(0, Math.min(currentMap.H - 1, c.y));
  if (x === fogDrag.cx && y === fogDrag.cy) return; fogDrag.cx = x; fogDrag.cy = y;
  if (fogDrag.t === "brush") { fogPaint(HOST.fog, currentMap, x, y, +$("#fogSize").value, fogDrag.v); fogChanged(); } else fogBoxPreview();
});
function fogDragEnd() {
  if (HOST.tokDrag) { HOST.tokDrag = null; fogChanged(); return; }
  if (!fogDrag) return; const g = fogDrag; fogDrag = null;
  if (g.t === "box") { fogBox(HOST.fog, currentMap, g.x, g.y, g.cx, g.cy, g.v); fogChanged(); }
}
$("#mapCanvas").addEventListener("pointerup", fogDragEnd); $("#mapCanvas").addEventListener("pointercancel", fogDragEnd);
function fogBoxPreview() {
  drawMapDM(); const g = fogDrag, cv = $("#mapCanvas"), ctx = cv.getContext("2d");
  const x = Math.min(g.x, g.cx) * CS, y = TOP + Math.min(g.y, g.cy) * CS, w = (Math.abs(g.cx - g.x) + 1) * CS, h = (Math.abs(g.cy - g.y) + 1) * CS;
  ctx.save(); ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeStyle = g.v ? "#e8a33d" : "#9b2f2f"; ctx.fillStyle = g.v ? "rgba(232,163,61,.15)" : "rgba(10,8,6,.35)";
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.restore();
}
$("#fogAll").addEventListener("click", () => { if (!HOST.fog) return; fogSnap(); HOST.fog.fill(1); fogChanged(); });
$("#fogNone").addEventListener("click", () => { if (!HOST.fog) return; fogSnap(); HOST.fog.fill(0); fogChanged(); });
$("#fogUndo").addEventListener("click", () => { const u = HOST.undo.pop(); if (!u) { toast("Nothing to undo"); return; } HOST.fog = u.f; HOST.found = u.s; fogChanged(); });
$("#roomKey").addEventListener("click", e => {
  const b = e.target.closest("[data-fogroom]"); if (!b || !HOST.on || !currentMap) return;
  const d = currentMap, o = d.rooms.find(r => r.num === +b.dataset.fogroom); if (!o) return;
  const tmp = new Uint8Array(d.W * d.H); fogRevealRoom(d, tmp, o.cx, o.cy);
  const v = HOST.fog[o.cy * d.W + o.cx] ? 0 : 1; fogSnap(); tmp.forEach((on, i) => { if (on) HOST.fog[i] = v; }); fogChanged();
});
$("#handoutFile").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if (f) handoutPicture(f); });
$("#handoutTextShow").addEventListener("click", () => { const t = $("#handoutText").value.trim(); if (!t) { toast("Write something to show first"); return; } handoutWriting($("#handoutTitle").value.trim(), t); });
$("#handoutBack").addEventListener("click", () => { HOST.show = "map"; handoutUI(); hostSend(); });
$("#fogNums").addEventListener("change", e => { HOST.numbers = e.target.checked; hostSend(); });
setInterval(() => { if (HOST.on && HOST.tv && HOST.win && HOST.win.closed) { HOST.tv = false; hostStatus(); } }, 2000);
addEventListener("pagehide", () => { if (HOST.on && HOST.ch) HOST.ch.postMessage({ t: "bye" }); });

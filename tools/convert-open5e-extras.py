# Builds the extra (open-licensed, non-Wizards) rules data from Open5e's files:
#   data/extra-monsters.json   Kobold Press: Tome of Beasts 1 (2023 edition), 2 and 3, Creature Codex, Black Flag SRD
#   data/extra-spells.json     Kobold Press: Deep Magic, Deep Magic Extended, Tome of Heroes, Kobold Press compilation,
#                              Warlock zine; Spells That Don't Suck (somanyrobots)
#   data/extra-items.json      Kobold Press: Vault of Magic
#   data/extra-books.json      each book's name, authors, licence and link, and the Open Game License text (for the
#                              credits page, public/credits.html, that tools/build.mjs writes)
# Only books under the Open Game License 1.0a or Creative Commons Attribution 4.0 are used; Open5e has already left out
# their Product Identity. Names that match an official SRD entry are skipped (Black Flag has its own goblins, etc.),
# and a name found in two books is kept from the first book listed below.
#
# Usage (needs a copy of github.com/open5e/open5e-api; git clone --depth 1 is enough):
#   python3 tools/convert-open5e-extras.py <open5e-api>/data/v2 data
# then npm run build:app. Each entry carries "src", the book's code (a key of data/extra-books.json).
import json, sys, re, importlib.util, os
from collections import OrderedDict

V2, OUT = sys.argv[1], sys.argv[2]
spec = importlib.util.spec_from_file_location("srdmon", os.path.join(os.path.dirname(__file__), "convert-srd-monsters.py"))
srdmon = importlib.util.module_from_spec(spec); spec.loader.exec_module(srdmon)

def lj(path): return json.load(open(os.path.join(V2, path)))

# A few entries carry HTML (tables, headings, <em>); the app shows text, so it becomes the light markdown the lists
# understand: **bold**, _italic_, "- " bullets and | pipe | tables. Any other tag is dropped.
def clean(t):
    if not isinstance(t, str) or "<" not in t and "#" not in t: return t
    def table(m):
        rows = re.findall(r"<tr>(.*?)</tr>", m.group(0), re.S)
        cells = [[re.sub(r"<[^>]+>", "", c).strip() for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", r, re.S)] for r in rows]
        return "\n\n" + "\n".join("| " + " | ".join(c) + " |" for c in cells if c) + "\n\n"
    t = re.sub(r"<table.*?</table>", table, t, flags=re.S)
    t = re.sub(r"<br\s*/?>", "\n", t)
    t = re.sub(r"<h\d[^>]*>(.*?)</h\d>", lambda m: "\n\n**" + m.group(1).strip() + "**\n\n", t, flags=re.S)
    t = re.sub(r"^#{1,6}\s*(.+)$", r"**\1**", t, flags=re.M)
    t = re.sub(r"<(strong|b)>(.*?)</\1>", r"**\2**", t, flags=re.S)
    t = re.sub(r"<(em|i)>(.*?)</\1>", r"_\2_", t, flags=re.S)
    t = re.sub(r"<li[^>]*>(.*?)</li>", lambda m: "\n- " + m.group(1).strip(), t, flags=re.S)
    t = re.sub(r"</?[a-z][^>]*>", "", t)
    return re.sub(r"\n{3,}", "\n\n", t).strip()
def clean_all(x):
    if isinstance(x, str): return clean(x)
    if isinstance(x, list): return [clean_all(v) for v in x]
    if isinstance(x, dict): return {k: (clean_all(v) if k not in ("n", "src", "k") else v) for k, v in x.items()}
    return x

# The 2023 edition of Tome of Beasts 1 comes first, so the 2016 book only adds the monsters it dropped (and lends the
# 2023 ones its habitats).
MONSTER_BOOKS = ["kobold-press/tob-2023", "kobold-press/tob", "kobold-press/tob2", "kobold-press/tob3", "kobold-press/ccdx", "kobold-press/bfrd"]
SPELL_BOOKS = ["kobold-press/deepm", "kobold-press/deepmx", "kobold-press/toh", "kobold-press/kp", "kobold-press/wz", "somanyrobots/spells-that-dont-suck"]
ITEM_BOOKS = ["kobold-press/vom"]
OK_LICENCES = {"ogl-10a", "cc-by-40"}
# the short label on list rows
SHORT = {"tob-2023": "ToB1", "tob": "ToB1 (2016)", "tob2": "ToB2", "tob3": "ToB3", "ccdx": "Creature Codex", "bfrd": "Black Flag",
         "deepm": "Deep Magic", "deepmx": "Deep Magic Ext.", "toh": "Tome of Heroes", "kp": "Kobold Press", "wz": "Warlock",
         "spells-that-dont-suck": "STDS", "vom": "Vault of Magic", "tdcs": "Tal'Dorei", "open5e": "Open5e", "open5e-2024": "Open5e"}

books = OrderedDict()
def book(path):
    d = lj(f"{path}/Document.json")[0]; f = d["fields"]
    lic = [l for l in f["licenses"] if l in OK_LICENCES]
    if not lic: raise SystemExit(f"{path} has no open licence: {f['licenses']}")
    year = (f.get("publication_date") or "")[:4]
    pub = {"kobold-press": "Open Design LLC d/b/a Kobold Press", "somanyrobots": "Ben Somers / somanyrobots"}.get(f["publisher"], f["publisher"])
    books[d["pk"]] = {"name": f.get("display_name") or f["name"], "short": SHORT.get(d["pk"], d["pk"]), "by": pub, "authors": f.get("author") or "", "year": year,
                      "lic": "cc-by-40" if "cc-by-40" in lic else "ogl-10a", "url": f.get("permalink") or ""}
    return d["pk"]

def srd_names(model):
    return {x["fields"]["name"].lower() for ed in ("srd-2014", "srd-2024") for x in lj(f"wizards-of-the-coast/{ed}/{model}.json")}

# ---------- monsters ----------
# Where a monster lives, for random encounters. The first Tome of Beasts lists habitats; the others don't, so they're
# worked out from the name, type, speeds and traits (keywords first, then the creature type).
ENV_WORDS = [
    (r"\b(sea|ocean|shark|kraken|squid|octopus|whale|merrow|reef|coral|eel|tide|abyssal|leviathan|brine|pelagic)", ["ocean", "coast"]),
    (r"\b(swamp|bog|marsh|mire|fen|bayou|leech|toad|frog|crocodile|lizardfolk|mud)", ["swamp"]),
    (r"\b(desert|sand|dune|scorpion|mummy|sphinx|jackal|vulture|camel|sun\b|solar|dust)", ["desert"]),
    (r"\b(ice|frost|snow|glacier|winter|polar|yeti|tundra|rime|frozen|boreal|mammoth)", ["arctic"]),
    (r"\b(mountain|cliff|peak|roc\b|eagle|avalanche|griffon|wyvern|goat|stone giant|volcan|magma|lava)", ["mountain", "hills"]),
    (r"\b(forest|wood|tree|treant|leaf|leshy|moss|thorn|bramble|grove|vine|owlbear|elk|deer|bear\b|spider)", ["forest"]),
    (r"\b(fung|mushroom|myconid|spore|mold|cave|tunnel|stalact|underdark|deep |derro|drow|duergar|ghoul|morlock|grimlock)", ["caves", "underworld"]),
    (r"\b(sewer|rat\b|rats\b|ratfolk|sludge|filth|plague|ooze|slime|carrion)", ["sewer"]),
    (r"\b(city|street|urban|alley|thief|guard|noble|merchant|cultist|spy|assassin|courtier|priest|watch|clockwork|gearforged)", ["urban"]),
    (r"\b(tomb|crypt|mummy|barrow|grave|sepulch|wight|lich|skeleton|bone|ghast|revenant|mausoleum)", ["tomb", "ruins"]),
    (r"\b(ruin|ancient|forgotten|golem|guardian|sentinel)", ["ruins"]),
    (r"\b(fey|pixie|sprite|satyr|hag|dryad|redcap|faerie|fairy|unseelie|seelie|bogg|korred)", ["feywild", "forest"]),
    (r"\b(shadow|shade|gloom|umbral|dusk|darakhul|nightmare|void)", ["shadowfell"]),
    (r"\b(hill|ogre|goblin|hobgoblin|orc|bandit|wolf|boar|giant\b|troll|gnoll|kobold)", ["hills", "forest"]),
    (r"\b(plain|grass|prairie|steppe|horse|road|caravan|centaur|bison|lion|hyena)", ["grassland"]),
]
TYPE_ENVS = {"fey": ["feywild", "forest"], "undead": ["tomb", "ruins", "shadowfell"], "aberration": ["underworld", "caves"],
             "ooze": ["caves", "sewer"], "construct": ["ruins", "tomb", "urban"], "beast": ["forest", "grassland", "hills"],
             "monstrosity": ["hills", "forest", "caves"], "dragon": ["mountain", "caves"], "fiend": ["ruins", "underworld"],
             "celestial": ["mountain", "ruins"], "elemental": ["mountain", "desert"], "giant": ["hills", "mountain"],
             "humanoid": ["urban", "grassland", "hills"], "plant": ["forest", "swamp"]}
def guess_env(m):
    text = " ".join([m["n"], m.get("sub", "")] + [t[0] for t in m["traits"]]).lower()
    env = []
    for rx, places in ENV_WORDS:
        if re.search(rx, text): env += [p for p in places if p not in env]
    sp = m.get("speed", "")
    if re.search(r"swim \d", sp) and re.search(r"amphibious|water breathing|hold breath|limited amphibiousness", text) and "ocean" not in env and "swamp" not in env:
        env += ["coast", "swamp"]
    if sp.startswith("0 ft.") and "swim" in sp and "ocean" not in env: env += ["ocean", "coast"]
    if re.search(r"sunlight sensitivity|sunlight hypersensitivity", text) and "underworld" not in env: env += ["underworld", "caves"]
    if re.search(r"burrow \d", sp) and "caves" not in env: env.append("caves")
    if m["type"] == "elemental":
        for rx, places in [(r"fire|flame|ember|cinder|magma|smoke", ["desert", "mountain"]), (r"water|tide|wave|mist", ["coast", "ocean"]),
                           (r"air|wind|storm|cloud|thunder|lightning", ["mountain", "hills"]), (r"earth|stone|rock|mud|crystal|salt", ["caves", "mountain"])]:
            if re.search(rx, m["n"].lower()): env += [p for p in places if p not in env]
    return env or list(TYPE_ENVS.get(m["type"], ["ruins"]))

# (2026-11-24, QA-1) Open5e's v2 files lack the plain Actions of almost every Tome of Beasts 3 monster (only 2 of 397
# have any; bonus actions, reactions and legendary actions are there). Its older v1 files have them, so a monster with no
# Actions takes them from there. data/v1 folder per book code:
V1_FOLDER = {"tob-2023": "tob-2023", "tob": "tob", "tob2": "tob2", "tob3": "tob3", "ccdx": "cc", "bfrd": "blackflag"}
def v1_actions(code):
    path = os.path.join(V2, "..", "v1", V1_FOLDER.get(code, code), "Monster.json")
    if not os.path.exists(path): return {}
    out = {}
    for x in json.load(open(path)):
        acts = json.loads(x["fields"].get("actions_json") or "[]")
        if acts: out[x["fields"]["name"].lower()] = [[a["name"], a.get("desc") or ""] for a in acts]
    return out

# (2026-11-24, QA-4) Tidy the damage lines so they only name damage. Black Flag writes one line per kind mixing damage
# types, conditions and the name of a trait that explains it ("Fey Resilience"): conditions an immunity line names go
# to Condition Immunities, other conditions are labelled as conditions, and a trait name becomes "see <trait>".
DMG = "acid bludgeoning cold fire force lightning necrotic piercing poison psychic radiant slashing thunder".split()
CONDS = set("blinded charmed deafened exhaustion frightened grappled incapacitated invisible paralyzed petrified poisoned prone restrained stunned unconscious".split())
def tidy_damage(m):
    for k in ("vul", "res", "imm"):
        v = m.get(k)
        if not v: continue
        cm = re.match(r"(.*?)\s*Condition Immunities\s+(.*)$", v)  # (Moderate Malleable) two lines run together
        if cm:
            v = cm.group(1); m["ci"] = ", ".join(x for x in [cm.group(2), m.get("ci")] if x)
        v = v.replace("piericing", "piercing").replace("nonmagic B/P/S", "nonmagical bludgeoning, piercing and slashing").replace("B/P/S", "bludgeoning, piercing and slashing")
        if m.get("src") != "bfrd" and k != "imm": m[k] = v; continue
        keep, conds, see = [], [], []
        parts = [t.strip() for t in re.split(r",(?![^(]*\))", v) if t.strip()]
        if m.get("src") != "bfrd" and not any(t.lower() in CONDS for t in parts): m[k] = v; continue
        for t in parts:
            low = t.lower()
            if low in CONDS: conds.append(low)
            elif any(d in low for d in DMG) or m.get("src") != "bfrd": keep.append(t)
            else: see.append("see " + t)
        if k == "imm" and conds:
            ci = [c.strip() for c in (m.get("ci") or "").split(",") if c.strip()]
            m["ci"] = ", ".join(ci + [c for c in conds if c not in ci]); conds = []
        line = ", ".join(keep)
        if conds: line += ("; " if line else "") + ", ".join(conds) + (" (conditions)" if len(conds) > 1 else " (condition)")
        if see: line += ("; " if line else "") + "; ".join(see)
        if line: m[k] = line
        else: m.pop(k, None)
    if m.get("lang"): m["lang"] = re.sub(r",(?=\S)", ", ", m["lang"])

def monsters():
    srd = srd_names("Creature")
    tob_env = {m["n"].lower(): [re.sub(r"^[a-z0-9]+_", "", e) for e in m.get("env", [])] for m in srdmon.convert(os.path.join(V2, "kobold-press/tob"))}
    out, seen = [], set()
    for path in MONSTER_BOOKS:
        code = book(path)
        older = v1_actions(code)
        for m in srdmon.convert(os.path.join(V2, path)):
            if not m.get("actions") and older.get(m["n"].lower()):
                m["actions"] = older[m["n"].lower()]
                m["role"] = srdmon.role(m, m.get("traits") or [], m["actions"])
            if not m.get("actions"):  # (Berberoka) the source lists its Multiattack and attacks among its traits
                moved = [t for t in m.get("traits") or [] if t[0] == "Multiattack" or re.search(r"(Weapon|Spell) Attack", t[1] or "")]
                if moved:
                    m["traits"] = [t for t in m["traits"] if t not in moved]; m["actions"] = moved
                    m["role"] = srdmon.role(m, m["traits"], m["actions"])
            env = [re.sub(r"^[a-z0-9]+_", "", e) for e in m.get("env", [])]
            k = m["n"].lower()
            if k in seen or k in srd: continue
            seen.add(k)
            env = env or tob_env.get(k) or []
            if len(env) > 12: env = []  # listed as living everywhere, sea included: worked out below instead
            env = [e for e in env if e != "badlands"] + [e for e in (["desert", "hills"] if "badlands" in env else []) if e not in env]
            m["env"] = env
            if not m["env"]: m["env"] = guess_env(m); m["envGuess"] = 1
            m["src"] = code
            tidy_damage(m)
            out.append(m)
    out.sort(key=lambda m: m["n"])
    return out

# ---------- spells ----------
TIME = {"action": "1 action", "bonus-action": "1 bonus action", "reaction": "1 reaction", "round": "1 round", "turn": "1 turn"}
def cast_time(t):
    if t in TIME: return TIME[t]
    m = re.match(r"(\d+)(minute|hour|day)s?$", t)
    if m: n = int(m[1]); return f"{n} {m[2]}{'s' if n != 1 else ''}"
    return t
def cap(s): return s[:1].upper() + s[1:] if s else s

def spells():
    srd = srd_names("Spell")
    out, seen = [], set()
    for path in SPELL_BOOKS:
        code = book(path)
        for x in lj(f"{path}/Spell.json"):
            f = x["fields"]; k = f["name"].lower()
            if k in seen or k in srd: continue
            seen.add(k)
            du = f.get("duration") or ""
            if f.get("concentration") and not du.lower().startswith("up to"): du = "up to " + du
            dts = [cap(d) for d in (f.get("damage_types") or [])]
            s = {"n": f["name"], "l": int(f["level"]), "s": cap(f["school"]), "c": sorted(cap(c.replace("srd_", "")) for c in f.get("classes") or []),
                 "t": cast_time(f["casting_time"]) + (", " + f["reaction_condition"] if f["casting_time"] == "reaction" and f.get("reaction_condition") else ""),
                 "r": re.sub(r"\b(\d+) ?(ft|feet)\.?$", r"\1 feet", cap(f.get("range_text") or "")), "cp": ("V" if f.get("verbal") else "") + ("S" if f.get("somatic") else "") + ("M" if f.get("material") else ""),
                 "m": cap(f.get("material_specified") or ""), "du": cap(du), "co": 1 if f.get("concentration") else 0, "ri": 1 if f.get("ritual") else 0,
                 "d": f.get("desc") or "", "h": f.get("higher_level") or "", "dt": dts[0] if dts else "", "at": "",
                 "sv": (f.get("saving_throw_ability") or "")[:3].upper(), "src": code}
            if not s["c"]: s["c"] = ["Wizard"] if s["l"] else ["Sorcerer", "Wizard"]
            out.append(s)
    out.sort(key=lambda s: (s["n"]))
    return out

# ---------- magic items ----------
RARITY = {"common": ("Common", 0), "uncommon": ("Uncommon", 1), "rare": ("Rare", 2), "very-rare": ("Very Rare", 3), "legendary": ("Legendary", 4), "artifact": ("Artifact", 5)}
CAT = {"wondrous-item": "Wondrous Item", "weapon": "Weapon", "armor": "Armor", "shield": "Armor", "potion": "Potion", "ring": "Ring",
       "rod": "Rod", "staff": "Staff", "wand": "Wand", "ammunition": "Ammunition", "scroll": "Scroll"}
def items():
    srd = srd_names("MagicItem")
    out, seen = [], set()
    for path in ITEM_BOOKS:
        code = book(path)
        for x in lj(f"{path}/MagicItem.json"):
            f = x["fields"]; k = f["name"].lower()
            if k in seen or k in srd: continue
            seen.add(k)
            r, rk = RARITY[f["rarity"]]; cat = CAT[f["category"]]
            att = "Required" if f.get("requires_attunement") else ""
            label = "Armor (shield)" if f["category"] == "shield" else "Wondrous item" if cat == "Wondrous Item" else cat
            out.append({"k": x["pk"], "n": f["name"], "cat": cat, "type": f"{label}, {r.lower()}" + (" (requires attunement)" if att else ""),
                        "r": r, "rk": rk, "att": att, "cons": f["category"] in ("potion", "scroll", "ammunition"),
                        "base": f["category"] in ("weapon", "armor", "shield", "ammunition"),
                        "d": f.get("desc") or "", "src": code})
    out.sort(key=lambda m: m["n"])
    return out

# ---------- species, subclasses, feats and backgrounds ----------
# Written as homebrew entries (the Homebrew tab's saved format, docs/features/homebrew-classes.md), with id "book-<key>",
# book: true and src. The app joins them to the homebrew it applies (hbBook in src/app/07b-feats-homebrew.js), so
# pickers, sheets and imports see them, but they aren't anyone's homebrew and are never synced.
SKILL_NAMES = ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation",
               "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"]
ABIL = {"strength": "str", "dexterity": "dex", "constitution": "con", "intelligence": "int", "wisdom": "wis", "charisma": "cha"}
DMG = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"]
SUB_LV = {"Cleric": 1, "Sorcerer": 1, "Warlock": 1, "Druid": 2, "Wizard": 2}  # 2014 subclass levels; the rest choose at 3
OPTION_BOOKS = {"species": ["kobold-press/toh"], "subclass": ["kobold-press/toh", "green-ronin/tdcs", "open5e/open5e", "open5e/open5e-2024"],
                "feat": ["kobold-press/toh", "green-ronin/tdcs"], "background": ["kobold-press/toh", "green-ronin/tdcs", "open5e/open5e"]}

def skills_in(t):
    return [k for k in SKILL_NAMES if re.search(r"\b" + k + r"\b", t)]
def asi_in(t):
    return {ABIL[a.lower()]: int(n) for a, n in re.findall(r"(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) score (?:increases|increase) by (\d)", t)}
def trait_fx(t):
    """the sheet effects a trait's text clearly gives: skill proficiencies and damage resistances"""
    fx = []
    m = re.search(r"proficiency in the ([A-Z][\w ]+?) skills?\b", t)
    if m: fx += [{"t": "skill", "a": k} for k in skills_in(m.group(1))]
    for d in re.findall(r"resistance to (\w+) damage", t):
        if d in DMG: fx.append({"t": "res", "a": d})
    return fx[:12]

def species_list():
    out = []
    for path in OPTION_BOOKS["species"]:
        code = book(path)
        S = lj(f"{path}/Species.json"); T = lj(f"{path}/SpeciesTrait.json")
        traits = {}
        for t in T: traits.setdefault(t["fields"]["parent"], []).append(t["fields"])
        own = {x["pk"]: x for x in S}
        for x in S:
            f = x["fields"]
            if f.get("subspecies_of"): continue
            e = {"id": "book-" + x["pk"], "kind": "species", "name": f["name"], "ed": "both", "book": True, "src": code,
                 "speed": 30, "skills": [], "asi": {}, "traits": [], "subs": [], "term": "Subrace"}
            about = [f.get("desc") or ""]
            for t in traits.get(x["pk"], []):
                n, d = t["name"], t["desc"]
                if n == "Ability Score Increase": e["asi"] = asi_in(d); about.append(f"**{n}.** {d}"); continue
                if n == "Speed":
                    m = re.search(r"(\d+) feet", d)
                    if m: e["speed"] = int(m.group(1))
                    about.append(f"**{n}.** {d}"); continue
                if n in ("Age", "Alignment", "Size", "Languages"): about.append(f"**{n}.** {d}"); continue
                fx = trait_fx(d)
                e["skills"] += [a["a"] for a in fx if a["t"] == "skill" and a["a"] not in e["skills"]]
                e["traits"].append({"l": 1, "n": n, "d": d, "fx": [a for a in fx if a["t"] != "skill"]})
            for y in S:
                g = y["fields"]
                if g.get("subspecies_of") != x["pk"]: continue
                ts = traits.get(y["pk"], [])
                asi = next((asi_in(t["desc"]) for t in ts if t["name"] == "Ability Score Increase"), {})
                body = [g.get("desc") or ""] + [f"**{t['name']}.** {t['desc']}" for t in ts]
                fx = [a for t in ts if t["name"] != "Ability Score Increase" for a in trait_fx(t["desc"])]
                e["subs"].append({"n": g["name"], "d": "\n\n".join(b for b in body if b), "asi": asi, "fx": fx[:12]})
            e["desc"] = "\n\n".join(a for a in about if a)
            if not e["subs"]: del e["term"]
            out.append(e)
    return out

def subclass_list():
    out = []
    for path in OPTION_BOOKS["subclass"]:
        code = book(path)
        C = lj(f"{path}/CharacterClass.json"); F = lj(f"{path}/ClassFeature.json"); I = lj(f"{path}/ClassFeatureItem.json")
        lv = {}
        for i in I: lv.setdefault(i["fields"]["parent"], []).append(i["fields"]["level"])
        for x in C:
            f = x["fields"]; parent = f.get("subclass_of") or ""
            m = re.match(r"srd(-2024)?_([a-z]+)$", parent)
            if not m: continue  # Black Flag's own classes and their subclasses: a different rules system
            cls = m.group(2).capitalize(); ed = "2024" if m.group(1) else "both"
            first = 3 if ed == "2024" else SUB_LV.get(cls, 3)
            feats = [{"l": min(lv.get(y["pk"]) or [first]), "n": y["fields"]["name"], "d": y["fields"]["desc"]} for y in F if y["fields"]["parent"] == x["pk"]]
            feats.sort(key=lambda a: (a["l"], a["n"]))
            out.append({"id": "book-" + x["pk"], "kind": "subclass", "name": f["name"], "ed": ed, "book": True, "src": code, "cls": cls,
                        "desc": f.get("desc") or "", "features": feats})
    # the sheet finds a feature's text by its name, so a name two subclasses share gets its subclass in brackets
    count = {}
    for e in out:
        for ft in e["features"]: count[ft["n"]] = count.get(ft["n"], 0) + 1
    for e in out:
        for ft in e["features"]:
            if count[ft["n"]] > 1: ft["n"] = f"{ft['n']} ({e['name']})"
    return out

def feat_list():
    out = []
    for path in OPTION_BOOKS["feat"]:
        code = book(path)
        F = lj(f"{path}/Feat.json"); B = lj(f"{path}/FeatBenefit.json")
        for x in F:
            f = x["fields"]; ben = [b["fields"]["desc"] for b in B if b["fields"]["parent"] == x["pk"]]
            req = re.sub(r"\s+", " ", (f.get("prerequisite") or "").replace("*", "")).strip()
            m = re.fullmatch(r"(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) (\d+) or higher", req)
            req = "" if req in ("", "N/A", "None") else f"{ABIL[m.group(1).lower()]}{m.group(2)}" if m else "@" + req
            ab = []
            for b in ben:
                mm = re.match(r"Increase your ((?:\w+(?:, | or )?)+) score by 1", b)
                if mm: ab = [ABIL[w.lower()] for w in re.findall(r"Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma", mm.group(1))]
            desc = (f.get("desc") or "") + ("\n\n" + "\n".join("- " + b for b in ben) if ben else "")
            out.append({"id": "book-" + x["pk"], "kind": "feat", "name": f["name"], "ed": "both", "book": True, "src": code,
                        "desc": desc, "req": req, "ab": " ".join(ab), "group": "g"})
    return out

def background_list():
    out = []
    for path in OPTION_BOOKS["background"]:
        code = book(path)
        G = lj(f"{path}/Background.json"); B = lj(f"{path}/BackgroundBenefit.json")
        for x in G:
            f = x["fields"]; ben = [b["fields"] for b in B if b["fields"]["parent"] == x["pk"]]
            by = {}
            for b in ben: by.setdefault(b.get("type") or "", []).append(b)
            sk = skills_in(" ".join(b["desc"] for b in by.get("skill_proficiency", [])))[:2]
            feature = [f"**{b['name']}.** {b['desc']}" for b in by.get("feature", [])]
            extra = [f"**{b['name']}.** {b['desc']}" for t in ("tool_proficiency", "language") for b in by.get(t, [])]
            out.append({"id": "book-" + x["pk"], "kind": "background", "name": f["name"], "ed": "both", "book": True, "src": code,
                        "desc": "\n\n".join(a for a in [f.get("desc") or ""] + extra + feature if a), "skills": sk + [""] * (2 - len(sk)),
                        "feat": "", "gear": " ".join(b["desc"] for b in by.get("equipment", []))})
    return out

def dump(name, data):
    p = os.path.join(OUT, name)
    json.dump(data, open(p, "w"), separators=(",", ":"), ensure_ascii=False)
    print(p, len(data) if isinstance(data, list) else len(data.get("books", {})), f"{os.path.getsize(p) // 1024} KB")

mons, sps, its = clean_all(monsters()), clean_all(spells()), clean_all(items())
# the official names a book entry mustn't take (a user's homebrew of the same name still wins in the app)
taken = {"species": srd_names("Species"), "background": srd_names("Background"), "feat": srd_names("Feat"), "subclass": set()}
opts = []
for L in (species_list(), subclass_list(), feat_list(), background_list()):
    seen = set()
    for e in clean_all(L):
        k = (e.get("cls", ""), e["name"].lower())
        if k in seen or e["name"].lower() in taken[e["kind"]]: continue
        seen.add(k); opts.append(e)
dump("extra-options.json", opts)
dump("extra-monsters.json", mons); dump("extra-spells.json", sps); dump("extra-items.json", its)
ogl = next(x["fields"]["desc"] for x in lj("License.json") if x["pk"] == "ogl-10a")
dump("extra-books.json", {"books": books, "ogl": ogl.replace("\r\n", "\n")})
print("habitats worked out for", sum(1 for m in mons if m.get("envGuess")), "of", len(mons), "monsters")

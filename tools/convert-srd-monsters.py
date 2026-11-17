# Builds the Monster Manual data in data/monsters.json (run npm run build:data afterwards to update the app).
# from the Open5e SRD 5.1 / 5.2 fixtures (github.com/open5e/open5e-api, data/v2/wizards-of-the-coast).
# Usage: python3 tools/convert-srd-monsters.py <open5e>/data/v2/wizards-of-the-coast data/monsters.json
import json, sys, re
from collections import defaultdict
D, OUT = sys.argv[1], sys.argv[2]
AB = ["strength","dexterity","constitution","intelligence","wisdom","charisma"]
ABS = ["Str","Dex","Con","Int","Wis","Cha"]
SKILLS = ["acrobatics","animal_handling","arcana","athletics","deception","history","insight","intimidation","investigation","medicine","nature","perception","performance","persuasion","religion","sleight_of_hand","stealth","survival"]
mod = lambda s: (s - 10) // 2
sgn = lambda n: f"+{n}" if n >= 0 else str(n)
num = lambda v: int(v) if v is not None and float(v).is_integer() else v

def load(ed, name): return json.load(open(f"{D}/{ed}/{name}.json"))

def uses(f):
    t, p = f.get("uses_type"), f.get("uses_param")
    if t == "RECHARGE_ON_ROLL": return f" (Recharge {p}–6)" if p and p < 6 else " (Recharge 6)"
    if t == "PER_DAY": return f" ({p}/Day)"
    if t == "RECHARGE": return " (Recharge after a Short or Long Rest)"
    return ""

def role(m, traits, acts):
    names = " ".join(n for n, _ in traits).lower(); text = " ".join(d for _, d in acts).lower()
    t, s = m["type"], m["scores"]
    if "pack tactics" in names: return "pack"
    if t == "ooze": return "ooze"
    if t in ("undead", "construct") and s[3] <= 4: return "mindless"
    if "ambush" in names or "false appearance" in names: return "ambusher"
    if ("ranged" in text or "range" in text) and s[1] > s[0]: return "skirmisher"
    if t == "humanoid" and m["cr"] <= 0.5: return "minion"
    if t == "humanoid": return "soldier"
    return "brute"

# Corrections where the SRD source data is wrong or incomplete (missing walking speeds, HP that doesn't match the hit dice)
FIXES = {"2014": {"Donkey": {"speed": "40 ft."}, "Elf, Drow": {"speed": "30 ft."}, "Gnome, Deep (Svirfneblin)": {"speed": "20 ft."},
                  "Cult Fanatic": {"hp": 33}, "Reef Shark": {"hd": "4d8+4"}}}
out = {}
for ed, key in [("srd-2014", "2014"), ("srd-2024", "2024")]:
    acts, traits = defaultdict(list), defaultdict(list)
    for a in load(ed, "CreatureAction"): acts[a["fields"]["parent"]].append(a["fields"])
    for t in load(ed, "CreatureTrait"): traits[t["fields"]["parent"]].append(t["fields"])
    mons = []
    for c in load(ed, "Creature"):
        f, pk = c["fields"], c["pk"]
        scores = [f[f"ability_score_{a}"] for a in AB]
        saves = [f"{ABS[i]} {sgn(f[f'saving_throw_{a}'])}" for i, a in enumerate(AB)
                 if f.get(f"saving_throw_{a}") is not None and f[f"saving_throw_{a}"] != mod(scores[i])]
        skills = [f"{s.replace('_', ' ').title()} {sgn(f['skill_bonus_' + s])}" for s in SKILLS if f.get("skill_bonus_" + s) is not None]
        sp = [f"{num(f['walk'])} ft." if f.get("walk") is not None else "0 ft."]
        for k in ["burrow", "climb", "fly", "swim"]:
            if f.get(k): sp.append(f"{k} {num(f[k])} ft." + (" (hover)" if k == "fly" and f.get("hover") else ""))
        senses = [f"{k} {num(f[k + '_range'])} ft." for k in ["blindsight", "darkvision", "tremorsense", "truesight"] if f.get(k + "_range")]
        senses.append(f"passive Perception {f['passive_perception']}")
        tr = [[t["name"], t["desc"]] for t in traits[pk]]
        al = sorted(acts[pk], key=lambda a: (a.get("order_in_statblock") or 0))
        pick = lambda kind: [[a["name"] + uses(a) + (f" (Costs {a['legendary_action_cost']} Actions)" if kind == "LEGENDARY_ACTION" and (a.get("legendary_action_cost") or 1) > 1 else ""), a["desc"]] for a in al if a["action_type"] == kind]
        m = {
            "n": f["name"], "cr": float(f["challenge_rating"]), "type": f["type"], "sub": f.get("subcategory") or "",
            "size": f["size"], "al": f.get("alignment") or "", "ac": f["armor_class"], "acd": f.get("armor_detail") or "",
            "hp": f["hit_points"], "hd": (f.get("hit_dice") or "").replace(" ", ""), "speed": ", ".join(sp), "scores": scores,
            "saves": saves, "skills": skills,
            "vul": f.get("damage_vulnerabilities_display") or "", "res": f.get("damage_resistances_display") or "",
            "imm": f.get("damage_immunities_display") or "", "ci": f.get("condition_immunities_display") or "",
            "senses": ", ".join(senses), "lang": f.get("languages_desc") or "—",
            "init": f.get("initiative_bonus") if f.get("initiative_bonus") is not None else mod(scores[1]),
            "env": [e.replace("srd_", "").replace("-", " ") for e in (f.get("environments") or [])],
            "traits": tr, "actions": pick("ACTION"), "bonus": pick("BONUS_ACTION"), "reacts": pick("REACTION"), "legend": pick("LEGENDARY_ACTION"),
        }
        if m["cr"].is_integer(): m["cr"] = int(m["cr"])
        m["role"] = role(m, tr, m["actions"])
        m.update(FIXES.get(key, {}).get(m["n"], {}))
        mons.append({k: v for k, v in m.items() if v not in ("", [], None) or k in ("traits", "actions")})
    mons.sort(key=lambda m: m["n"])
    out[key] = mons
json.dump(out, open(OUT, "w"), separators=(",", ":"), ensure_ascii=False)
for k, v in out.items(): print(k, len(v), "monsters")

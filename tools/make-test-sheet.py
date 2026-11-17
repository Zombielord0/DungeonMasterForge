"""Write test/e2e/fixtures/sheet-wizard.pdf: a made-up, filled-in copy of the official fillable 5e character sheet
(same field names, and spell boxes at the same places on page 3), for `npm run test:import`.

Needs Python 3 and pypdf (pip install pypdf). Run from the repository root:  python tools/make-test-sheet.py
"""
from pypdf import PdfWriter
from pypdf.generic import (ArrayObject, BooleanObject, DictionaryObject, FloatObject, NameObject, NumberObject,
                           TextStringObject)

OUT = "test/e2e/fixtures/sheet-wizard.pdf"

# page 1 text boxes (positions don't matter here)
P1 = {
    "CharacterName": "Pip Underbough", "ClassLevel": "Wizard 6", "Background": "Charlatan", "PlayerName": "Test",
    "Race ": "Halfling", "Alignment": "CG", "XP": "6500",
    "STR": "8", "DEX": "20", "CON": "16", "INT": "18", "WIS": "13", "CHA": "15",
    "STRmod": "-1", "DEXmod ": "+5", "CONmod": "+3", "INTmod": "+4", "WISmod": "+1", "CHamod": "+2",
    "ProfBonus": "+3", "AC": "15", "Initiative": "+5", "Speed": "25ft", "HPMax": "44", "HPCurrent": "\n40",
    "HD": "d6", "HDTotal": "6", "Passive": "11",
    "ST Intelligence": "7", "ST Wisdom": "4", "Arcana": "7", "Deception ": "5", "Investigation ": "7", "SleightofHand": "11",
    "Wpn Name": "Dagger", "Wpn1 AtkBonus": "+8", "Wpn1 Damage": "1d4+5/ P",
    "ProficienciesLang": "Disguise Kit\nForgery Kit\n\nCommon, Halfling",
    "Equipment": "Explorers Pack\nSpellbook\nComponent Pouch\n2 Daggers\nSkeletal hand clasp",
    "Features and Traits": "Brave - Advantage vs Fear\nLucky - Reroll 1s\nHalfling Nimbleness\nNaturally Stealthy",
    "PersonalityTraits ": "I lie about almost everything.", "Ideals": "Fairness", "Bonds": "My grandmother's ring",
    "Flaws": "I can't resist a pretty face.", "GP": "120\n", "SP": "7",
}
# proficiency check boxes: 20/21 = INT and WIS saves; 25, 27, 31, 38 = Arcana, Deception, Investigation, Sleight of Hand
CHECKS = ["Check Box 20", "Check Box 21", "Check Box 25", "Check Box 27", "Check Box 31", "Check Box 38", "Check Box 11"]
UNCHECKED = ["Check Box 11"]  # STR save box present but off
# page 2
P2 = {"Age": "23", "Height": "3' 1\"", "Weight": "40lbs", "Allies": "The Copper Kettle crew", "Feat+Traits": "Free healing potion 1/day"}
# page 3: (name, value, rect) with the official sheet's positions
P3 = [
    ("Spellcasting Class 2", "Wizard", (40, 700, 200, 715)), ("SpellSaveDC  2", "15", (250, 700, 290, 715)), ("SpellAtkBonus 2", "+7", (300, 700, 340, 715)),
    ("SlotsTotal 19", "4", (52, 457, 91, 478)), ("SlotsTotal 20", "3", (52, 229, 91, 250)), ("SlotsTotal 21", "3", (241, 625, 280, 646)),
    ("SlotsTotal 22", "", (241, 400, 280, 420)),
    ("Spells 1014", "Firebolt", (40, 607, 199, 620)), ("Spells 1016", "Mage Hand", (40, 594, 199, 606)),
    ("Spells 1015", "Detect Magic", (41, 422, 199, 432)), ("Spells 1023", "Magic Missle", (41, 408, 199, 418)),
    ("Spells 1024", "Protection from Evil", (41, 394, 199, 404)), ("Spells 1025", "Tensers Floating Disc (R)", (41, 380, 199, 390)),
    ("Spells 1046", "Mirror Image", (41, 210, 199, 220)), ("Spells 1034", "Bone Shard (Bonus)", (41, 196, 199, 206)),
    ("Spells 1048", "Haste", (230, 606, 388, 616)), ("Spells 1047", "Melf's Minute Meteors", (230, 592, 388, 602)),
    ("Spells 1049", "", (230, 578, 388, 588)),
]

w = PdfWriter()
pages = [w.add_blank_page(612, 792) for _ in range(3)]
fields = ArrayObject()


def add(page, name, value, rect, check=None):
    d = DictionaryObject({
        NameObject("/Type"): NameObject("/Annot"), NameObject("/Subtype"): NameObject("/Widget"),
        NameObject("/T"): TextStringObject(name), NameObject("/Rect"): ArrayObject([FloatObject(v) for v in rect]),
        NameObject("/F"): NumberObject(4),
    })
    if check is None:
        d[NameObject("/FT")] = NameObject("/Tx"); d[NameObject("/V")] = TextStringObject(value)
    else:
        d[NameObject("/FT")] = NameObject("/Btn")
        d[NameObject("/V")] = NameObject("/Yes" if check else "/Off"); d[NameObject("/AS")] = NameObject("/Yes" if check else "/Off")
    ref = w._add_object(d)
    if "/Annots" not in page: page[NameObject("/Annots")] = ArrayObject()
    page["/Annots"].append(ref); fields.append(ref)


y = 760
for k, v in P1.items():
    add(pages[0], k, v, (30, y - 12, 200, y)); y -= 14
    if y < 40: y = 760
for i, k in enumerate(CHECKS):
    add(pages[0], k, "", (300, 700 - i * 14, 310, 710 - i * 14), check=k not in UNCHECKED)
add(pages[0], "CHARACTER IMAGE", "", (400, 500, 560, 700), check=False)
y = 760
for k, v in P2.items():
    add(pages[1], k, v, (30, y - 12, 300, y)); y -= 14
for k, v, r in P3:
    add(pages[2], k, v, r)
w._root_object[NameObject("/AcroForm")] = DictionaryObject({NameObject("/Fields"): fields, NameObject("/NeedAppearances"): BooleanObject(True)})
with open(OUT, "wb") as f:
    w.write(f)
print("wrote", OUT, len(fields), "fields")

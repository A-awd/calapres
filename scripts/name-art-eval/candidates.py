"""Zero-cost CANDIDATE style examples of the word «مثال» (م ث ا ل) for owner review.

Font-derived compositions: spelling is correct by construction and re-checked
structurally (check.py) — visual quality is NOT claimed. Nothing here is wired
into the theme; the owner or the fulfilment designer decides.
"""
import json
from pathlib import Path
import compose as C
from glyphs import Font, shape_name, rasterize
from check import check

OUT = Path(__file__).parent / "out" / "mithal"
WORD = "مثال"
FONTS = [("Amiri-Bold.ttf", None), ("ArefRuqaa-Bold.ttf", None), ("ReemKufi[wght].ttf", 700),
         ("Rakkas-Regular.ttf", None), ("Alkalami-Regular.ttf", None), ("Qahiri-Regular.ttf", None), ("Blaka-Regular.ttf", None)]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for fname, w in FONTS:
        font = Font(fname, w)
        for lname, fn in C.LAYOUTS:
            pcs, inv, err = fn(font, WORD)
            stem = f"{Path(fname).stem}-{lname}"
            if err:
                rows.append({"id": stem, "result": "no layout: " + err}); continue
            img, pmap = rasterize(pcs, size=1024, piece_map=True)
            img.save(OUT / f"{stem}.png"); pmap.save(OUT / f"{stem}.map.png")
            c = check(WORD, OUT / f"{stem}.png", OUT / f"{stem}.map.png")
            gap_ok, gap = C.clearance_ok(pcs, font.upem)
            rows.append({"id": stem, "font": fname, "layout": lname,
                         "letters_ok": inv["same_letters_same_order"] and inv["pieces_match_rules"] and inv["notdef_glyphs"] == 0,
                         "structure": c["verdict"], "why": c["reasons"] + c["flags"], "clearance_em": gap})
    (OUT / "candidates.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1))
    for r in rows:
        print(r["id"], r.get("structure", r.get("result")), r.get("why", ""))


if __name__ == "__main__":
    main()

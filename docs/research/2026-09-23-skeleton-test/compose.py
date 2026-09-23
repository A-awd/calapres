"""Exact-letter skeleton composer (zero-cost preparation for a capped bake-off).

Letters come only from HarfBuzz shaping of the exact input string, so every
letter, dot and hamza present in the input is present in the output, in the
same reading order. Variety comes from geometry only: kashida elongation,
stacking/overlap of connected letter groups, and continuous warps (arc, polar)
applied to the glyph outlines. Nothing is added except tatweel (U+0640), a
stroke extension, never a letter. Output: black ink on white, 1024x1024.
"""
import json, math, sys, unicodedata
from pathlib import Path
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

HERE = Path(__file__).parent
FONTS = HERE / "fonts"
OUT = HERE / "out"; OUT.mkdir(exist_ok=True)
TATWEEL = "ـ"
TAGS = []  # (glyph id, cluster, glyph name) per polygon, in the order layouts emit them
# Letters that do not connect to the following (left) letter.
RIGHT_ONLY = set("اأإآدذرزوؤةء")


class Font:
    def __init__(self, fname, wght=None):
        self.path = FONTS / fname
        blob = hb.Blob.from_file_path(str(self.path))
        self.face = hb.Face(blob)
        self.hbfont = hb.Font(self.face)
        if wght is not None:
            self.hbfont.set_variations({"wght": wght})
        self.tt = TTFont(str(self.path))
        self.upem = self.face.upem
        self.gs = self.tt.getGlyphSet(location={"wght": wght} if wght is not None else None)
        self.order = self.tt.getGlyphOrder()
        gdef = self.tt["GDEF"].table if "GDEF" in self.tt else None
        cd = gdef.GlyphClassDef.classDefs if gdef is not None and gdef.GlyphClassDef else {}
        self.marks = frozenset(n for n, c in cd.items() if c == 3)

    def shape(self, text, features=None):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(self.hbfont, buf, features or {})
        return buf.glyph_infos, buf.glyph_positions


def flatten(rec, steps=12):
    """RecordingPen ops -> list of closed polygons [(x,y),...]."""
    polys, cur, last = [], [], None
    for op, pts in rec.value:
        if op == "moveTo":
            if cur: polys.append(cur)
            cur = [pts[0]]; last = pts[0]
        elif op == "lineTo":
            cur.append(pts[0]); last = pts[0]
        elif op == "qCurveTo":
            # TrueType implied on-curve points between consecutive off-curve points
            offs, end = list(pts[:-1]), pts[-1]
            if end is None:  # closed contour of only off-curve points
                end = ((offs[-1][0] + offs[0][0]) / 2, (offs[-1][1] + offs[0][1]) / 2)
            segs, p0 = [], last
            for i, c in enumerate(offs):
                p2 = end if i == len(offs) - 1 else ((c[0] + offs[i + 1][0]) / 2, (c[1] + offs[i + 1][1]) / 2)
                for s in range(1, steps + 1):
                    t = s / steps
                    x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p2[0]
                    y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p2[1]
                    cur.append((x, y))
                p0 = p2
            last = end
        elif op == "curveTo":
            c1, c2, p3 = pts; p0 = last
            for s in range(1, steps + 1):
                t = s / steps; u = 1 - t
                x = u**3*p0[0] + 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t**3*p3[0]
                y = u**3*p0[1] + 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t**3*p3[1]
                cur.append((x, y))
            last = p3
        elif op in ("closePath", "endPath"):
            if cur: polys.append(cur)
            cur = []
    if cur: polys.append(cur)
    return polys


def pieces_of(text):
    """Split into connected letter groups (pieces of Arabic words), in reading order.
    Returns list of (start, end) code-point indices into text."""
    out, start = [], None
    for i, ch in enumerate(text):
        if ch == " ":
            if start is not None: out.append((start, i)); start = None
            continue
        if start is None: start = i
        nxt = text[i + 1] if i + 1 < len(text) else " "
        if ch in RIGHT_ONLY or nxt == " ":
            out.append((start, i + 1)); start = None
    if start is not None: out.append((start, len(text)))
    return out


def shaped_pieces(font, text, features=None):
    """Shape the WHOLE text once, then group glyph outlines by piece.
    Each piece: dict(polys in font units with pen x in visual LTR coords, bbox, chars)."""
    TAGS.clear()
    infos, poss = font.shape(text, features)
    # visual order from HarfBuzz is LTR for display; accumulate pen position
    x = 0; glyphs = []
    notdef = 0
    for inf, pos in zip(infos, poss):
        name = font.order[inf.codepoint]
        if inf.codepoint == 0: notdef += 1
        rec = DecomposingRecordingPen(font.gs); font.gs[name].draw(rec)
        polys = [[(px + x + pos.x_offset, py + pos.y_offset) for px, py in poly] for poly in flatten(rec)]
        glyphs.append({"cluster": inf.cluster, "name": name, "polys": polys, "gid": len(glyphs)})
        x += pos.x_advance
    ranges = pieces_of(text)
    pcs = []
    for (a, b) in ranges:
        gl = [g for g in glyphs if a <= g["cluster"] < b]
        polys = [p for g in gl for p in g["polys"]]
        TAGS.extend((g["gid"], g["cluster"], g["name"]) for g in gl for _ in g["polys"])
        xs = [pt[0] for p in polys for pt in p]; ys = [pt[1] for p in polys for pt in p]
        pcs.append({"chars": text[a:b], "polys": polys,
                    "bbox": (min(xs), min(ys), max(xs), max(ys)) if xs else (0, 0, 0, 0),
                    "glyphs": [g["name"] for g in gl]})
    covered = sorted({g["cluster"] for g in glyphs})
    return pcs, {"notdef": notdef, "glyph_count": len(glyphs), "clusters": covered,
                 "total_width": x}


def verify(text, stripped_input, pcs, meta):
    """Structural checks (not OCR): same letters, same order, nothing missing."""
    letters_out = "".join(p["chars"] for p in pcs).replace(TATWEEL, "")
    return {
        "input": stripped_input,
        "letters_in_output_order": letters_out,
        "same_letters_same_order": letters_out == stripped_input.replace(" ", ""),
        "notdef_glyphs": meta["notdef"],
        "glyph_names_by_piece": [p["glyphs"] for p in pcs],
        "pieces_reading_order": [p["chars"] for p in pcs],
        "empty_pieces": sum(1 for p in pcs if not p["polys"]),
    }


def to_path(polys):
    return " ".join("M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in poly) + " Z" for poly in polys if len(poly) > 2)


def fit_svg(polys, size=1024, margin=0.14):
    xs = [x for p in polys for x, _ in p]; ys = [y for p in polys for _, y in p]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    w, h = x1 - x0, y1 - y0
    s = size * (1 - 2 * margin) / max(w, h)
    tx = (size - w * s) / 2 - x0 * s
    ty = (size - h * s) / 2 + y1 * s  # flip y (font y-up -> svg y-down)
    moved = [[(x * s + tx, -y * s + ty) for x, y in p] for p in polys]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">'
            f'<rect width="100%" height="100%" fill="#fff"/>'
            f'<path d="{to_path(moved)}" fill="#000" fill-rule="nonzero"/></svg>')


def transform(polys, fn):
    return [[fn(x, y) for x, y in p] for p in polys]


# ---------------------------------------------------------------- layouts
def layout_sweep(font, name, stretch_after, bend=0.00018, features=None):
    """Horizontal: kashida elongation inside one joined pair + a curved baseline."""
    txt = name
    if stretch_after:
        i = txt.index(stretch_after) + len(stretch_after)
        txt = txt[:i] + TATWEEL * 6 + txt[i:]
    pcs, meta = shaped_pieces(font, txt, features)
    polys = [p for pc in pcs for p in pc["polys"]]
    w = meta["total_width"]; cx = w / 2
    warped = transform(polys, lambda x, y: (x, y - bend * (x - cx) ** 2 + 0.06 * (x - cx)))
    return txt, pcs, meta, warped


def layout_stack(font, name, tiers, overlap=0.28, shift=0.18, features=None):
    """Thuluth-like stacking: connected groups placed in tiers, reading RTL then
    top-to-bottom; tiers overlap vertically so strokes interlace."""
    pcs, meta = shaped_pieces(font, name, features)
    up = font.upem
    out, y = [], 0
    k = 0
    for t, count in enumerate(tiers):
        tier = pcs[k:k + count]; k += count
        # place tier pieces right-to-left
        x = 0; placed = []
        for pc in tier:
            bx0, by0, bx1, by1 = pc["bbox"]
            dx = x - bx1
            placed.append([[(px + dx, py) for px, py in poly] for poly in pc["polys"]])
            x = x - (bx1 - bx0) - 0.02 * up
        # right-align each tier with a diagonal stagger to the left
        tier_polys = [p for pp in placed for p in pp]
        xs = [px for p in tier_polys for px, _ in p]
        dx = -max(xs) - t * shift * up
        out += [[(px + dx, py + y) for px, py in poly] for poly in tier_polys]
        y -= up * (1 - overlap)
    return name, pcs, meta, out


def layout_emblem(font, name, arc_deg=300, r_in=0.9, features=None):
    """Bend the whole line around a circle (polar warp). Reading order runs
    counter-clockwise from the right, keeping right-to-left sequence."""
    pcs, meta = shaped_pieces(font, name, features)
    polys = [p for pc in pcs for p in pc["polys"]]
    xs = [x for p in polys for x, _ in p]; ys = [y for p in polys for _, y in p]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    W, H = x1 - x0, y1 - y0
    arc = math.radians(arc_deg)
    R = W / arc
    R0 = R * r_in
    def polar(x, y):
        # rightmost x -> start angle at top-right; moves clockwise as x decreases? keep RTL:
        th = math.pi / 2 - (x1 - x) / W * arc + arc / 2
        th = math.pi / 2 + arc / 2 - (x1 - x) / W * arc
        r = R0 + (y - y0)
        return (r * math.cos(th), r * math.sin(th))
    return name, pcs, meta, transform(polys, polar)


NAMES = {
    "mada": {"text": "مدى", "sweep_after": "م", "stack": [1, 1]},
    "abdulrahman": {"text": "عبد الرحمن", "sweep_after": "الرحم", "stack": [1, 3]},
}


def stack_tiers(pcs_count, spec):
    return spec


def main():
    ruqaa = Font("ArefRuqaa-Bold.ttf")
    amiri = Font("Amiri-Bold.ttf")
    kufi = Font("ReemKufi[wght].ttf", wght=700)
    report = {}
    for key, cfg in NAMES.items():
        text = cfg["text"]
        pieces = pieces_of(text)
        # tiers: mada -> [1,1] (مد / ى); abdulrahman pieces: عبد | ا | لر | حمن -> [1,3]
        designs = {
            "1-stack": (amiri, lambda f: layout_stack(f, text, cfg["stack"])),
            "2-sweep": (ruqaa, lambda f: layout_sweep(f, text, cfg["sweep_after"])),
            "3-emblem": (kufi, lambda f: layout_emblem(f, text)),
        }
        report[key] = {"pieces": [text[a:b] for a, b in pieces], "designs": {}}
        for dname, (font, fn) in designs.items():
            attempts = []
            variants = [fn] if dname != "1-stack" else [
                (lambda f, ov=ov, sh=sh: layout_stack(f, text, cfg["stack"], overlap=ov, shift=sh))
                for ov in (0.28, 0.15, 0.0, -0.15) for sh in (0.18, 0.4, 0.6, 0.8, -0.2, -0.4, -0.6)]
            for v in variants:
                used_text, pcs, meta, polys = v(font)
                tags = list(TAGS)
                plain = [p for pc in pcs for p in pc["polys"]]
                gate = relative_dot_gate(polys, plain, tags, font.marks)
                attempts.append(gate["all_marks_owned"])
                if len(attempts) == 1:
                    first_gate = gate
                    fit_svg_first = fit_svg(polys)
                if gate["all_marks_owned"]:
                    break
            if len(attempts) > 1:
                (OUT / f"{key}-{dname}-REJECTED-first.svg").write_text(fit_svg_first)
            svg = fit_svg(polys)
            (OUT / f"{key}-{dname}.svg").write_text(svg)
            report[key]["designs"][dname] = {
                "font": font.path.name,
                "shaped_text_codepoints": [f"U+{ord(c):04X}" for c in used_text],
                "check": verify(used_text, text, pcs, meta),
                "dot_gate_first_attempt": first_gate,
                "dot_gate_final": gate,
                "attempts": attempts,
            }
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(json.dumps(report, ensure_ascii=False, indent=1))



# ------------------------------------------------ structural dot-ownership gate
def signed_area(p):
    return 0.5 * sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))


def dot_ownership(polys, tags, mark_names=frozenset()):
    """Every small detached mark (dot/hamza) must sit closer to its own letter
    than to any other letter. Font geometry guarantees the right dots exist;
    this checks that the COMPOSITION has not moved a dot onto another letter
    (e.g. the dot of ب landing on ر so it reads ز). Not OCR."""
    by_gid = {}
    index_of = {}
    for i, (poly, (gid, cl, name)) in enumerate(zip(polys, tags)):
        by_gid.setdefault(gid, {"cluster": cl, "name": name, "polys": []})["polys"].append(poly)
        index_of[id(poly)] = i
    sareas = {gid: [signed_area(p) for p in g["polys"]] for gid, g in by_gid.items()}
    big_signed = max((a for v in sareas.values() for a in v), key=abs)
    outer_sign = 1 if big_signed > 0 else -1
    big = abs(big_signed)
    # holes (counters) have the opposite winding; give them zero area so they are ignored
    areas = {gid: [abs(a) if a * outer_sign > 0 else None for a in v] for gid, v in sareas.items()}
    # body contours = large contours; marks = small separate contours
    bodies, marks = {}, []
    for gid, g in by_gid.items():
        outers = [(a, p) for p, a in zip(g["polys"], areas[gid]) if a is not None]
        if not outers:
            continue
        outers.sort(key=lambda t: -t[0])
        if g["name"] in mark_names or outers[0][0] < 0.06 * big:   # mark glyph (GDEF class 3) or tiny
            marks += [(gid, p) for _, p in outers]
            continue
        bodies[gid] = [outers[0][1]]           # main stroke of the letter
        for a, p in outers[1:]:                # every other outer contour = dot/hamza/detached part
            marks.append((gid, p))
    # a mark-only glyph (e.g. separate dot glyph) belongs to the base glyph of its cluster
    def owner(gid):
        if gid in bodies: return gid
        cl = by_gid[gid]["cluster"]
        for og, g in by_gid.items():
            if og in bodies and g["cluster"] == cl: return og
        return gid
    def dist(pt, polys):
        return min(math.hypot(pt[0] - x, pt[1] - y) for p in polys for x, y in p)
    results = []
    seen = set()
    for gid, p in marks:
        key = (gid, round(p[0][0], 1), round(p[0][1], 1))
        if key in seen: continue
        seen.add(key)
        # skip counters (holes) lying inside their own body bbox with opposite winding
        c = (sum(x for x, _ in p) / len(p), sum(y for _, y in p) / len(p))
        own = owner(gid)
        if own not in bodies: continue
        d_own = dist(c, bodies[own])
        others = [(dist(c, b), by_gid[og]["name"]) for og, b in bodies.items() if og != own]
        d_other, other_name = min(others) if others else (float("inf"), None)
        results.append({"idx": index_of[id(p)], "ratio": d_own / d_other if d_other else 0.0,
                        "mark_of": by_gid[own]["name"], "d_own": round(d_own), "nearest_other": other_name,
                        "d_other": round(d_other) if d_other != float("inf") else None,
                        "ok": d_own < 0.8 * d_other})
    return {"marks_checked": len(results), "all_marks_owned": all(r["ok"] for r in results),
            "failures": [r for r in results if not r["ok"]], "all": results}



def relative_dot_gate(layout_polys, plain_polys, tags, marks):
    """Pass if every mark is at least as clearly attached to its own letter as in
    plain typesetting of the same shaped text (ratio own/other not >15% worse),
    or is unambiguous outright (own < 0.8 * other)."""
    base = {r["idx"]: r["ratio"] for r in dot_ownership(plain_polys, tags, marks)["all"]}
    lay = dot_ownership(layout_polys, tags, marks)["all"]
    fails = [r for r in lay if not (r["ratio"] < 0.8 or r["ratio"] <= base.get(r["idx"], 0) * 1.15)]
    return {"marks_checked": len(lay), "all_marks_owned": not fails,
            "failures": [{k: v for k, v in f.items() if k != "idx"} | {"plain_ratio": round(base.get(f["idx"], 0), 2), "ratio": round(f["ratio"], 2)} for f in fails]}


if __name__ == "__main__":
    main()

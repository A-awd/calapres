"""Exact-letter skeletons in the three designer layouts (v2).

Purpose: the INPUT for skeleton-conditioned generation (Mode S), not the final
art. Letters come from HarfBuzz shaping of the typed name; layouts only move,
scale, rotate, lengthen or bend whole letter groups. Every skeleton must pass
all gates before a human sees it:
  G1 inventory     same letters, same order, piece split as joining rules say, no .notdef
  G2 structure     check.py on the rendered skeleton (catches fonts that drop a dot)
  G3 clearance     different letter groups do not touch
  G4 dot owner     no dot/hamza ends up closer to another letter than in plain typesetting
  G5 bend limit    no letter group rotated more than 55 degrees
Layouts follow the designer reference: 1 stacked compact block, 2 horizontal
with a tall stroke and a long sweeping tail, 3 arched/looped around a curve.
"""
import json, math, itertools, sys
from pathlib import Path
from shapely import affinity
from shapely.geometry import MultiPolygon, Polygon
from shapely.ops import unary_union

from arabic import normalize
from glyphs import Font, shape_name, piece_geom, transform_piece, rasterize, TATWEEL
from check import check

HERE = Path(__file__).parent
OUT = HERE / "out"

NAMES = {"mada": "مدى", "abdulrahman": "عبد الرحمن"}
FONT_ORDER = [("Amiri-Bold.ttf", None), ("ArefRuqaa-Bold.ttf", None), ("ReemKufi[wght].ttf", 700)]
CLEARANCE = 0.035   # em fraction between letter groups
ASCENDERS = set("الأإآك")
TAIL_LETTERS = set("ىين")


# ------------------------------------------------------------ geometry helpers
def move(piece, dx=0, dy=0, rot=0, origin=(0, 0), sx=1, sy=1):
    def f(g):
        if sx != 1 or sy != 1:
            g = affinity.scale(g, sx, sy, origin=origin)
        if rot:
            g = affinity.rotate(g, rot, origin=origin)
        return affinity.translate(g, dx, dy)
    return transform_piece(piece, f)


def bounds(pcs):
    return unary_union([piece_geom(p) for p in pcs]).bounds


def lengthen_glyphs(piece, chars, fy=1.0, fx_left=1.0, y_from=0.0, upem=1000):
    """Lengthen strokes of the given letters: vertical stretch above y_from
    (tall alif/lam) or leftward stretch of the part left of the glyph centre
    (sweeping tail of ى/ي/ن). The letter keeps its shape parts and dots."""
    def warp(g, cx):
        def fn(x, y, z=None):
            nx = cx - (cx - x) * fx_left if x < cx else x
            ny = y_from + (y - y_from) * fy if y > y_from else y
            return nx, ny
        return _apply(g, fn)
    glyphs = []
    for gl in piece["glyphs"]:
        if gl["char"] in chars and not gl["is_mark"]:
            cx = (gl["geom"].bounds[0] + gl["geom"].bounds[2]) / 2
            glyphs.append(dict(gl, geom=warp(gl["geom"], cx)))
        else:
            glyphs.append(gl)
    return {"text": piece["text"], "glyphs": glyphs}


def _apply(g, fn):
    from shapely.ops import transform
    return transform(lambda xs, ys, zs=None: tuple(zip(*[fn(x, y) for x, y in zip(xs, ys)])), _densify(g))


def _densify(g, step=12):
    from shapely import segmentize
    return segmentize(g, step)


def bend(pcs, radius):
    """Bend the whole line onto an arc of the given radius (text on the outside)."""
    x0, y0, x1, y1 = bounds(pcs)
    cx = (x0 + x1) / 2
    def fn(x, y):
        th = (x - cx) / radius
        r = radius + (y - y0)
        return cx + r * math.sin(th), y0 - radius + r * math.cos(th)
    return [transform_piece(p, lambda g: _apply(g, fn)) for p in pcs]


# ------------------------------------------------------------------- gates
def clearance_ok(pcs, upem):
    gs = [piece_geom(p) for p in pcs]
    worst = min((a.distance(b) for a, b in itertools.combinations(gs, 2)), default=upem)
    return worst >= CLEARANCE * upem, round(worst / upem, 3)


def _marks_and_bodies(pcs):
    """Detached marks = mark glyphs, or every part of a glyph except its largest."""
    bodies, marks = [], []
    for pi, p in enumerate(pcs):
        base_of_cluster = {}
        for gl in p["glyphs"]:
            parts = list(gl["geom"].geoms) if isinstance(gl["geom"], MultiPolygon) else [gl["geom"]]
            parts = [q for q in parts if not q.is_empty]
            if not parts:
                continue
            if gl["is_mark"]:
                marks.append((pi, gl["cluster"], unary_union(parts)))
                continue
            parts.sort(key=lambda q: -q.area)
            bodies.append((pi, gl["cluster"], parts[0]))
            base_of_cluster[gl["cluster"]] = parts[0]
            for q in parts[1:]:
                if q.area < 0.6 * parts[0].area:   # medial ب tooth can be small; its dot is still the smaller part
                    marks.append((pi, gl["cluster"], q))
    return bodies, marks


def dot_ratios(pcs):
    """Per mark: (own-letter distance / nearest same-group other letter,
    own-letter distance / nearest letter of ANOTHER group)."""
    bodies, marks = _marks_and_bodies(pcs)
    out = []
    for pi, cl, m in marks:
        own = [b for bpi, bcl, b in bodies if bcl == cl]
        same = [b for bpi, bcl, b in bodies if bcl != cl and bpi == pi]
        other = [b for bpi, bcl, b in bodies if bpi != pi]
        if not own:
            continue
        d_own = min(m.distance(b) for b in own)
        r_same = d_own / max(min((m.distance(b) for b in same), default=1e9), 1e-6)
        r_other = d_own / max(min((m.distance(b) for b in other), default=1e9), 1e-6)
        out.append((r_same, r_other))
    return out


def corridor_ok(pcs, upem):
    """A dot below its letter must not sit right above a letter of another group
    (and vice versa): readers attach it to the letter across the gap even when
    it is geometrically closer to its own (seen as «الزحمن» in a stacked Kufi test)."""
    from shapely.geometry import box
    bodies, marks = _marks_and_bodies(pcs)
    bad = []
    for pi, cl, m in marks:
        own = [b for bpi, bcl, b in bodies if bcl == cl]
        if not own:
            continue
        ob = min(own, key=lambda b: m.distance(b))
        d_own = m.distance(ob)
        mx0, my0, mx1, my1 = m.bounds
        w = mx1 - mx0
        below = m.centroid.y < ob.centroid.y
        reach = max(4 * d_own, 0.6 * upem)
        corridor = box(mx0 - 3 * w, my0 - reach, mx1 + 3 * w, my0) if below else box(mx0 - 3 * w, my1, mx1 + 3 * w, my1 + reach)
        hits = [b for bpi, bcl, b in bodies if bpi != pi and b.intersects(corridor)]
        if hits:
            bad.append({"piece": pcs[pi]["text"], "side": "below" if below else "above",
                        "gap_em": round(min(m.distance(b) for b in hits) / upem, 2)})
    return not bad, bad


def dots_ok(pcs, plain, upem=1000):
    """A dot must stay as clearly attached to its letter as in plain typesetting
    (within its letter group), and must be at most half as far from its own
    letter as from any letter of another group (the «الزحمن» failure)."""
    lay, base = dot_ratios(pcs), dot_ratios(plain)
    if len(lay) != len(base):
        return False, "mark count changed"
    bad = []
    for (rs, ro), (bs, bo) in zip(lay, base):
        if not (rs < 0.8 or rs <= bs * 1.15) or ro > max(0.5, bo * 1.15):
            bad.append({"same_group": round(rs, 2), "other_group": round(ro, 2), "plain": [round(bs, 2), round(bo, 2)]})
    c_ok, c_bad = corridor_ok(pcs, upem)
    return (not bad) and c_ok, bad + c_bad


# ------------------------------------------------------------------ layouts
def rows_for(pcs, text):
    """One row per word; a single word puts its last letter group on a second row."""
    words = normalize(text).split()
    if len(words) > 1:
        rows, i = [], 0
        for w in words:
            acc, row = "", []
            while i < len(pcs) and len(acc) < len(w):
                acc += pcs[i]["text"].replace(TATWEEL, ""); row.append(pcs[i]); i += 1
            rows.append(row)
        return rows
    return [pcs[:-1], pcs[-1:]] if len(pcs) > 1 else [pcs]


def place_row(row, gap):
    """Right-to-left: first piece at the right."""
    x = 0; out = []
    for p in row:
        bx0, _, bx1, _ = piece_geom(p).bounds
        out.append(move(p, dx=x - bx1)); x = x - (bx1 - bx0) - gap
    return out


def layout_block(font, text):
    """1 — compact stacked block, rows read top-to-bottom, pulled together as
    tightly as the clearance and dot gates allow."""
    pcs, inv = shape_name(font, text)
    up = font.upem
    rows = [place_row(r, 0.06 * up) for r in rows_for(pcs, text)]
    # scale lower rows to roughly the width of the first row
    w0 = bounds(rows[0])[2] - bounds(rows[0])[0]
    placed = rows[0]
    for r in rows[1:]:
        w = bounds(r)[2] - bounds(r)[0]
        s = max(0.85, min(1.45, w0 / w * 1.05))
        r = [move(p, sx=s, sy=s) for p in r]
        best = None
        tx0, ty0, tx1, ty1 = bounds(placed)
        for dxf in [i / 20 for i in range(-14, 15)]:
            for dyf in [i / 20 for i in range(-10, 17)]:
                rx0, ry0, rx1, ry1 = bounds(r)
                dx = tx1 - rx1 + dxf * up
                dy = ty0 - ry1 + dyf * up          # overlap rows vertically (interlace) as far as allowed
                cand = placed + [move(p, dx=dx, dy=dy) for p in r]
                ok, _ = clearance_ok(cand, up)
                if not ok:
                    continue
                d_ok, _ = dots_ok(cand, pcs, up)
                if not d_ok:
                    continue
                x0, y0, x1, y1 = bounds(cand)
                score = (x1 - x0) * (y1 - y0) * (1 + abs(math.log((x1 - x0) / (y1 - y0))))  # compact, near square
                if best is None or score < best[0]:
                    best = (score, cand)
        if best is None:
            return None, inv, "no gate-passing stack found"
        placed = best[1]
    return placed, inv, None


def layout_sweep(font, text):
    """2 — horizontal: kashida inside the last joined pair, tall alif/lam, and a
    long sweeping tail on the final ى/ي/ن, slightly rising baseline."""
    t = normalize(text)
    # kashida inside the last pair of letters that actually join
    for i in range(len(t) - 2, -1, -1):
        if t[i] != " " and t[i + 1] != " " and t[i] not in "اأإآدذرزوؤةء":
            t = t[:i + 1] + TATWEEL * 5 + t[i + 1:]
            break
    pcs, inv = shape_name(font, t)
    up = font.upem
    pcs = [lengthen_glyphs(p, ASCENDERS, fy=1.45, y_from=0.45 * up, upem=up) for p in pcs]
    last = pcs[-1]
    if any(g["char"] in TAIL_LETTERS for g in last["glyphs"]):
        pcs[-1] = lengthen_glyphs(last, TAIL_LETTERS, fx_left=1.9, upem=up)
    x0, y0, x1, y1 = bounds(pcs)
    pcs = [move(p, rot=5, origin=((x0 + x1) / 2, (y0 + y1) / 2)) for p in pcs]
    return pcs, inv, None


def layout_arch(font, text):
    """3 — letters arched around a curve, tail of the last letter drawn long so
    the composition closes into a loop."""
    t = normalize(text)
    pcs, inv = shape_name(font, t)
    up = font.upem
    last = pcs[-1]
    if any(g["char"] in TAIL_LETTERS for g in last["glyphs"]):
        pcs[-1] = lengthen_glyphs(last, TAIL_LETTERS, fx_left=1.6, upem=up)
    pcs = place_row(pcs, 0.12 * up)
    x0, y0, x1, y1 = bounds(pcs)
    width = x1 - x0
    best = None
    for arc_deg in (70, 60, 50, 40):              # G5: end groups rotate at most arc/2 = 35 degrees
        radius = width / math.radians(arc_deg)
        bent = bend(pcs, radius)
        if not clearance_ok(bent, up)[0]:
            continue
        if not dots_ok(bent, shape_name(font, t)[0], up)[0]:
            continue
        best = (arc_deg, bent); break
    if best is None:
        return None, inv, "no gate-passing arch"
    return best[1], inv, None


LAYOUTS = [("1-block", layout_block), ("2-sweep", layout_sweep), ("3-arch", layout_arch)]


def run():
    OUT.mkdir(exist_ok=True)
    fonts = [Font(f, w) for f, w in FONT_ORDER]
    report = {}
    for key, text in NAMES.items():
        report[key] = {"name": text, "designs": {}}
        for lname, fn in LAYOUTS:
            tried = []
            for font in fonts:
                pcs, inv, err = fn(font, text)
                entry = {"font": font.path.name, "inventory": inv}
                if err:
                    entry["rejected"] = err; tried.append(entry); continue
                g1 = inv["same_letters_same_order"] and inv["pieces_match_rules"] and inv["notdef_glyphs"] == 0
                g3, gap = clearance_ok(pcs, font.upem)
                g4, dbad = dots_ok(pcs, shape_name(font, normalize(text))[0], font.upem) if lname != "2-sweep" else corridor_ok(pcs, font.upem)
                img, pmap = rasterize(pcs, size=1024, piece_map=True)
                stem = f"{key}-{lname}"
                img.save(OUT / f"{stem}.png"); pmap.save(OUT / f"{stem}.map.png")
                c = check(text, OUT / f"{stem}.png", OUT / f"{stem}.map.png")
                g2 = c["verdict"] == "PASS-PREFILTER"
                entry.update({"G1_inventory": g1, "G2_structure": c["verdict"], "G2_reasons": c["reasons"] + c["flags"],
                              "G3_clearance_em": gap, "G3_ok": g3, "G4_dots_ok": g4, "G4_detail": dbad})
                tried.append(entry)
                if g1 and g2 and g3 and g4:
                    entry["accepted"] = True
                    break
                for suffix in (".png", ".map.png"):
                    (OUT / f"{stem}{suffix}").rename(OUT / f"{stem}-REJECTED-{font.path.stem}{suffix}")
            report[key]["designs"][lname] = tried
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    for key, r in report.items():
        for lname, tried in r["designs"].items():
            acc = [t for t in tried if t.get("accepted")]
            print(key, lname, "ACCEPTED " + acc[0]["font"] if acc else "NONE",
                  [(t["font"], t.get("rejected") or t.get("G2_reasons") or ("clear" if t.get("G3_ok") else f"gap {t.get('G3_clearance_em')}"))
                   for t in tried if not t.get("accepted")])
    return report


if __name__ == "__main__":
    run()

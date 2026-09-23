"""Exact Arabic shaping to vector outlines, and rasterising them.

Letters come only from HarfBuzz shaping of the exact typed string, so the letter
inventory (letters, dots, hamza, order) is correct by construction. Geometry is
returned as shapely polygons tagged with glyph/piece so layouts can move whole
letter groups and gates can reason about them.
"""
from pathlib import Path
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely import affinity
from PIL import Image, ImageDraw

from arabic import normalize, pieces as text_pieces, RIGHT_JOINING

HERE = Path(__file__).parent
FONTS = HERE / "fonts"
TATWEEL = "ـ"


class Font:
    def __init__(self, fname, wght=None):
        self.path = FONTS / fname
        self.face = hb.Face(hb.Blob.from_file_path(str(self.path)))
        self.hb = hb.Font(self.face)
        if wght is not None:
            self.hb.set_variations({"wght": wght})
        self.tt = TTFont(str(self.path))
        self.upem = self.face.upem
        self.gs = self.tt.getGlyphSet(location={"wght": wght} if wght is not None else None)
        self.order = self.tt.getGlyphOrder()
        gdef = self.tt["GDEF"].table if "GDEF" in self.tt else None
        cd = gdef.GlyphClassDef.classDefs if gdef is not None and gdef.GlyphClassDef else {}
        self.mark_glyphs = frozenset(n for n, c in cd.items() if c == 3)

    def shape(self, text, features=None):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(self.hb, buf, features or {})
        return buf.glyph_infos, buf.glyph_positions


def _flatten(rec, steps=10):
    polys, cur, last = [], [], None
    for op, pts in rec.value:
        if op == "moveTo":
            if cur: polys.append(cur)
            cur = [pts[0]]; last = pts[0]
        elif op == "lineTo":
            cur.append(pts[0]); last = pts[0]
        elif op == "qCurveTo":
            offs, end = list(pts[:-1]), pts[-1]
            if end is None:
                end = ((offs[-1][0] + offs[0][0]) / 2, (offs[-1][1] + offs[0][1]) / 2)
            p0 = last
            for i, c in enumerate(offs):
                p2 = end if i == len(offs) - 1 else ((c[0] + offs[i + 1][0]) / 2, (c[1] + offs[i + 1][1]) / 2)
                for s in range(1, steps + 1):
                    t = s / steps
                    cur.append(((1-t)**2*p0[0] + 2*(1-t)*t*c[0] + t*t*p2[0], (1-t)**2*p0[1] + 2*(1-t)*t*c[1] + t*t*p2[1]))
                p0 = p2
            last = end
        elif op == "curveTo":
            c1, c2, p3 = pts; p0 = last
            for s in range(1, steps + 1):
                t = s / steps; u = 1 - t
                cur.append((u**3*p0[0] + 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t**3*p3[0],
                            u**3*p0[1] + 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t**3*p3[1]))
            last = p3
        elif op in ("closePath", "endPath"):
            if cur: polys.append(cur)
            cur = []
    if cur: polys.append(cur)
    return [p for p in polys if len(p) > 2]


def _signed(p):
    return 0.5 * sum(p[i][0] * p[(i+1) % len(p)][1] - p[(i+1) % len(p)][0] * p[i][1] for i in range(len(p)))


def glyph_geometry(contours):
    """Nonzero fill approximated as union(outers) - union(holes), orientation
    taken from the glyph's largest contour."""
    if not contours:
        return Polygon()
    big = max(contours, key=lambda c: abs(_signed(c)))
    sign = 1 if _signed(big) > 0 else -1
    outers = [Polygon(c).buffer(0) for c in contours if _signed(c) * sign > 0]
    holes = [Polygon(c).buffer(0) for c in contours if _signed(c) * sign < 0]
    g = unary_union(outers)
    if holes:
        g = g.difference(unary_union(holes))
    return g


def shape_name(font, text, features=None):
    """Shape the whole string once and return glyph records grouped by piece.

    Each glyph: {name, cluster, char, is_mark, geom (shapely, font units, y-up)}.
    Each piece: {text, glyphs:[...]} in reading order.
    Tatweel may appear in `text` (elongation); it is never a letter.
    """
    infos, poss = font.shape(text, features)
    x = 0
    glyphs = []
    for inf, pos in zip(infos, poss):
        name = font.order[inf.codepoint]
        rec = DecomposingRecordingPen(font.gs)
        font.gs[name].draw(rec)
        contours = [[(px + x + pos.x_offset, py + pos.y_offset) for px, py in c] for c in _flatten(rec)]
        glyphs.append({"name": name, "gid": inf.codepoint, "cluster": inf.cluster, "char": text[inf.cluster],
                       "is_mark": name in font.mark_glyphs, "contours": contours,
                       "geom": glyph_geometry(contours)})
        x += pos.x_advance
    # piece ranges over the string that may contain tatweel
    ranges, start = [], None
    for i, ch in enumerate(text):
        if ch == " ":
            if start is not None: ranges.append((start, i)); start = None
            continue
        if start is None: start = i
        nxt = text[i + 1] if i + 1 < len(text) else " "
        if ch in RIGHT_JOINING or nxt == " ":
            ranges.append((start, i + 1)); start = None
    if start is not None: ranges.append((start, len(text)))
    pcs = []
    for a, b in ranges:
        gl = [g for g in glyphs if a <= g["cluster"] < b]
        pcs.append({"text": text[a:b], "glyphs": gl})
    notdef = sum(1 for g in glyphs if g["gid"] == 0)
    letters = "".join(p["text"] for p in pcs).replace(TATWEEL, "")
    inventory = {
        "typed": normalize(text.replace(TATWEEL, "")),
        "letters_in_output": letters,
        "same_letters_same_order": letters == normalize(text.replace(TATWEEL, "")).replace(" ", ""),
        "pieces": [p["text"].replace(TATWEEL, "") for p in pcs],
        "pieces_match_rules": [p["text"].replace(TATWEEL, "") for p in pcs] == text_pieces(text.replace(TATWEEL, "")),
        "notdef_glyphs": notdef,
        "glyph_names": [[g["name"] for g in p["glyphs"]] for p in pcs],
    }
    return pcs, inventory


def piece_geom(piece):
    return unary_union([g["geom"] for g in piece["glyphs"]])


def transform_piece(piece, fn):
    """Apply fn(geom)->geom to every glyph of a piece (returns a new piece)."""
    return {"text": piece["text"], "glyphs": [dict(g, geom=fn(g["geom"])) for g in piece["glyphs"]]}


def all_geom(pcs):
    return unary_union([piece_geom(p) for p in pcs])


def rasterize(pcs_or_geom, size=1024, margin=0.12, piece_map=False):
    """Black ink on white, fitted into a square. Optionally also a label image
    where each pixel holds 1+piece index (for layout-matched checking)."""
    geoms = [piece_geom(p) for p in pcs_or_geom] if isinstance(pcs_or_geom, list) else [pcs_or_geom]
    allg = unary_union(geoms)
    x0, y0, x1, y1 = allg.bounds
    s = size * (1 - 2 * margin) / max(x1 - x0, y1 - y0)
    ox = (size - (x1 - x0) * s) / 2 - x0 * s
    oy = (size - (y1 - y0) * s) / 2 + y1 * s
    def fit(g):
        return affinity.affine_transform(g, [s, 0, 0, -s, ox, oy])
    img = Image.new("L", (size, size), 255)
    lab = Image.new("L", (size, size), 0) if piece_map else None
    d = ImageDraw.Draw(img)
    dl = ImageDraw.Draw(lab) if lab else None
    for idx, g in enumerate(geoms):
        g = fit(g)
        for poly in (g.geoms if isinstance(g, MultiPolygon) else [g]):
            if poly.is_empty: continue
            d.polygon(list(poly.exterior.coords), fill=0)
            if dl: dl.polygon(list(poly.exterior.coords), fill=idx + 1)
            for hole in poly.interiors:
                d.polygon(list(hole.coords), fill=255)
                if dl: dl.polygon(list(hole.coords), fill=0)
    return (img, lab) if piece_map else img

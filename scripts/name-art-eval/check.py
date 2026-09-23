"""Letter-structure prefilter for a generated Arabic name design.

Compares a candidate image with facts derived from the TYPED name only:
  1. number of letter groups (connected ink bodies),
  2. number of detached marks (dots, hamza) above and below.
Optionally (Mode S) also matches each ink body to the skeleton piece it came
from and compares marks piece by piece.

This is a PREFILTER, not an acceptance test. It reads no letters (no OCR) and
cannot tell م from د. It rejects clear structural errors quickly so the owner
only reviews plausible images. Every PASS still needs human approval.

Usage:
  python3 check.py --name "مدى" candidate.png [--skeleton-map out/mada-block.map.png]
"""
import argparse, json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree

from arabic import fingerprint

MARK_AREA = 0.10     # a mark is smaller than 10% of the largest ink body ...
MARK_EXTENT = 0.16   # ... and no longer than 16% of the ink extent
MARK_PENS = 4.2         # ... or at most ~4 pen widths across (a three-dot cluster), for short words
MARK_ELONGATION = 3.5  # ... and compact (a merged two-dot dash is about 2-3:1)
SPECK = 0.00004      # ignore specks below this fraction of the image area


def ink_mask(img: Image.Image, work=1024):
    g = img.convert("L")
    g.thumbnail((work, work))
    a = np.asarray(g, dtype=np.float32)
    # Otsu threshold
    hist, _ = np.histogram(a, bins=256, range=(0, 256))
    hist = hist.astype(np.float64)
    w = np.cumsum(hist); m = np.cumsum(hist * np.arange(256))
    mt = m[-1]; wt = w[-1]
    between = ((mt * w - m * wt) ** 2) / np.maximum(w * (wt - w), 1)
    t = int(np.argmax(between))
    ink = a <= t
    if ink.mean() > 0.5:  # light ink on dark background
        ink = ~ink
    ink = ndimage.binary_closing(ink, structure=np.ones((3, 3)), iterations=1)
    return ink


def components(ink):
    lab, n = ndimage.label(ink, structure=np.ones((3, 3)))
    if n == 0:
        return lab, []
    idx = np.arange(1, n + 1)
    areas = ndimage.sum(np.ones_like(lab), lab, idx)
    objs = ndimage.find_objects(lab)
    ys, xs = np.nonzero(ink)
    extent = max(ys.max() - ys.min(), xs.max() - xs.min()) + 1
    comps = []
    for i, (a, sl) in enumerate(zip(areas, objs), start=1):
        if a < SPECK * ink.size:
            continue
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        cy, cx = ndimage.center_of_mass(lab == i)
        comps.append({"label": i, "area": float(a), "h": h, "w": w, "cy": cy, "cx": cx,
                      "bbox": (sl[0].start, sl[1].start, sl[0].stop, sl[1].stop)})
    amax = max(c["area"] for c in comps)
    # Pen width from the distance transform: marks are a few pen widths across, letters are longer.
    dt = ndimage.distance_transform_edt(ink)
    pen = max(2.0, 2 * float(np.percentile(dt[ink], 90)))
    for c in comps:
        size = max(c["h"], c["w"])
        elong = size / max(1, min(c["h"], c["w"]))
        # dots, dashes (2-3 merged dots) and hamza are small and compact; a thin alif is not.
        # A short word makes its dots relatively large, so the pen-width rule also admits them.
        small = (c["area"] < MARK_AREA * amax and size < MARK_EXTENT * extent) or (size <= MARK_PENS * pen and c["area"] < 0.35 * amax)
        c["is_mark"] = small and elong <= MARK_ELONGATION
    return lab, comps


def attach_marks(lab, comps):
    """Nearest body for each mark, and whether the mark is above or below that
    body's stroke at the mark's horizontal position."""
    bodies = [c for c in comps if not c["is_mark"]]
    trees = {}
    for b in bodies:
        yy, xx = np.nonzero(lab == b["label"])
        trees[b["label"]] = (cKDTree(np.c_[yy, xx]), yy, xx)
    for m in (c for c in comps if c["is_mark"]):
        best = min(bodies, key=lambda b: trees[b["label"]][0].query([m["cy"], m["cx"]])[0])
        _, yy, xx = trees[best["label"]]
        band = np.abs(xx - m["cx"]) <= max(m["w"], 6) * 1.5
        if band.sum() < 5:
            band = np.abs(xx - m["cx"]) <= max(m["w"], 6) * 4
        mid = (yy[band].min() + yy[band].max()) / 2 if band.any() else best["cy"]
        m["body"] = best["label"]
        m["side"] = "above" if m["cy"] < mid else "below"
    return bodies


def check(name, image_path, skeleton_map=None):
    fp = fingerprint(name)
    ink = ink_mask(Image.open(image_path))
    lab, comps = components(ink)
    reasons, flags = [], []
    if not comps:
        return {"verdict": "FAIL", "reasons": ["no ink found"]}
    bodies = attach_marks(lab, comps)
    marks = [c for c in comps if c["is_mark"]]
    above = sum(1 for m in marks if m["side"] == "above")
    below = sum(1 for m in marks if m["side"] == "below")

    if len(bodies) > fp["piece_count"]:
        reasons.append(f"{len(bodies)} letter groups, expected {fp['piece_count']} (extra or broken letter)")
    elif len(bodies) < fp["piece_count"]:
        flags.append(f"{len(bodies)} letter groups, expected {fp['piece_count']} (groups touch or merge; check by eye)")
    lo, hi = fp["marks_above"]
    if not lo <= above <= hi:
        reasons.append(f"{above} marks above, expected {lo}-{hi}" if lo != hi else f"{above} marks above, expected {lo}")
    lo, hi = fp["marks_below"]
    if not lo <= below <= hi:
        reasons.append(f"{below} marks below, expected {lo}-{hi}" if lo != hi else f"{below} marks below, expected {lo}")

    # Touching dot pairs (common in Naskh) count as one component, so «عيد» could pass as «عبد».
    # When the image has two or more marks, size them in units of the smallest one and reject a side
    # that carries more dots than the name allows (only where no hamza is expected on that side).
    if len(marks) >= 2:
        unit = min(m["area"] for m in marks)
        for side in ("above", "below"):
            if fp[f"hamza_{side}"]:
                continue
            units = sum(max(1, round(m["area"] / unit)) for m in marks if m["side"] == side)
            if units > fp[f"dots_{side}"]:
                reasons.append(f"about {units} dots {side}, expected {fp[f'dots_{side}']}")

    per_piece = None
    if skeleton_map:
        per_piece = _per_piece(fp, ink, lab, comps, Image.open(skeleton_map))
        for pp in per_piece:
            if pp.get("problem"):
                reasons.append(f"piece «{pp['piece']}»: {pp['problem']}")

    verdict = "FAIL" if reasons else ("FLAG" if flags else "PASS-PREFILTER")
    return {"verdict": verdict, "reasons": reasons, "flags": flags,
            "found": {"letter_groups": len(bodies), "marks_above": above, "marks_below": below},
            "expected": {"letter_groups": fp["piece_count"], "marks_above": fp["marks_above"],
                         "marks_below": fp["marks_below"], "pieces": fp["pieces"]},
            "per_piece": per_piece,
            "note": "Prefilter only. It cannot read letters; human approval is still required."}


def _per_piece(fp, ink, lab, comps, skel_img):
    """Mode S: align candidate ink box to skeleton ink box, give each candidate
    body the skeleton piece it overlaps most, then compare marks per piece."""
    sk = np.asarray(skel_img.convert("L").resize(ink.shape[::-1], Image.NEAREST))
    sy, sx = np.nonzero(sk > 0); cy, cx = np.nonzero(ink)
    s = max(np.ptp(sy), np.ptp(sx)) / max(np.ptp(cy), np.ptp(cx))
    def to_skel(y, x):
        return ((y - cy.min()) * s + sy.min()).astype(int).clip(0, sk.shape[0]-1), \
               ((x - cx.min()) * s + sx.min()).astype(int).clip(0, sk.shape[1]-1)
    dil = ndimage.grey_dilation(sk, size=(15, 15))
    body_piece = {}
    for c in comps:
        if c["is_mark"]: continue
        yy, xx = np.nonzero(lab == c["label"])
        ty, tx = to_skel(yy, xx)
        vals = dil[ty, tx]; vals = vals[vals > 0]
        body_piece[c["label"]] = int(np.bincount(vals).argmax()) if vals.size else 0
    out = []
    for i, p in enumerate(fp["per_piece"], start=1):
        ms = [m for m in comps if m["is_mark"] and body_piece.get(m["body"]) == i]
        a = sum(1 for m in ms if m["side"] == "above"); b = sum(1 for m in ms if m["side"] == "below")
        prob = []
        if not p["marks_above"][0] <= a <= p["marks_above"][1]: prob.append(f"{a} above, expected {p['marks_above']}")
        if not p["marks_below"][0] <= b <= p["marks_below"][1]: prob.append(f"{b} below, expected {p['marks_below']}")
        if i not in body_piece.values(): prob.append("no ink matched to this piece")
        out.append({"piece": p["text"], "above": a, "below": b, "problem": "; ".join(prob)})
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--skeleton-map")
    ap.add_argument("images", nargs="+")
    a = ap.parse_args()
    res = {p: check(a.name, p, a.skeleton_map) for p in a.images}
    print(json.dumps(res, ensure_ascii=False, indent=1))
    sys.exit(0 if all(r["verdict"] != "FAIL" for r in res.values()) else 1)

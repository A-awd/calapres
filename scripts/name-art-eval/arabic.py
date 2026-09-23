"""Arabic letter facts used by the name-art checks.

Everything here is derived from the typed name only, never from an image, so it
is the ground truth that a generated design must match.

Style-robust invariants of a correctly written name (they survive bending,
elongation, stacking and a change of calligraphic style):
  * the number of connected letter groups ("pieces"), fixed by joining rules;
  * the number of detached marks (dots and hamza), and whether each sits above
    or below its letter.
Two or three dots may be drawn as one dash/caret in Diwani or Thuluth, so a
letter with n dots may appear as 1..n mark components.
"""
import unicodedata

# Letters that never connect to the following letter.
RIGHT_JOINING = set("اأإآٱدذرزوؤةء")
NON_JOINING = set("ء")

# letter -> (dots_above, dots_below, hamza_above, hamza_below)
MARKS = {
    "ا": (0, 0, 0, 0), "أ": (0, 0, 1, 0), "إ": (0, 0, 0, 1), "آ": (0, 0, 1, 0),  # madda counted as one mark above
    "ٱ": (0, 0, 1, 0),
    "ب": (0, 1, 0, 0), "ت": (2, 0, 0, 0), "ث": (3, 0, 0, 0),
    "ج": (0, 1, 0, 0), "ح": (0, 0, 0, 0), "خ": (1, 0, 0, 0),
    "د": (0, 0, 0, 0), "ذ": (1, 0, 0, 0), "ر": (0, 0, 0, 0), "ز": (1, 0, 0, 0),
    "س": (0, 0, 0, 0), "ش": (3, 0, 0, 0), "ص": (0, 0, 0, 0), "ض": (1, 0, 0, 0),
    "ط": (0, 0, 0, 0), "ظ": (1, 0, 0, 0), "ع": (0, 0, 0, 0), "غ": (1, 0, 0, 0),
    "ف": (1, 0, 0, 0), "ق": (2, 0, 0, 0), "ك": (0, 0, 0, 0), "ل": (0, 0, 0, 0),
    "م": (0, 0, 0, 0), "ن": (1, 0, 0, 0), "ه": (0, 0, 0, 0), "ة": (2, 0, 0, 0),
    "و": (0, 0, 0, 0), "ؤ": (0, 0, 1, 0), "ي": (0, 2, 0, 0), "ى": (0, 0, 0, 0),
    "ئ": (0, 0, 1, 0), "ء": (0, 0, 0, 0),
}
# NOTE: ج's dot sits inside/below the bowl; counted as below. ك's inner mark is
# style-dependent and deliberately not required.

TASHKEEL = {chr(c) for c in range(0x064B, 0x0660)} | {"ٰ"}
TATWEEL = "ـ"


def normalize(name: str) -> str:
    """NFC, collapse spaces, strip tatweel. Tashkeel is rejected, not stripped."""
    s = unicodedata.normalize("NFC", name).replace(TATWEEL, "")
    s = " ".join(s.split())
    bad = [c for c in s if c in TASHKEEL or (c != " " and c not in MARKS)]
    if bad:
        raise ValueError(f"unsupported characters: {bad!r}")
    return s


def pieces(name: str):
    """Connected letter groups in reading order, e.g. عبد الرحمن -> [عبد, ا, لر, حمن]."""
    s = normalize(name)
    out, cur = [], ""
    for i, ch in enumerate(s):
        if ch == " ":
            if cur: out.append(cur); cur = ""
            continue
        if ch in NON_JOINING:
            if cur: out.append(cur); cur = ""
            out.append(ch)          # standalone hamza is its own mark, handled below
            continue
        cur += ch
        if ch in RIGHT_JOINING:
            out.append(cur); cur = ""
    if cur: out.append(cur)
    return out


def fingerprint(name: str):
    """Expected structure. Per piece: dots/hamza above and below.
    Standalone hamza (ء) is a mark, not a piece."""
    ps = []
    for p in pieces(name):
        if p == "ء":
            ps.append({"text": p, "is_mark": True})
            continue
        above = sum(MARKS[c][0] for c in p)
        below = sum(MARKS[c][1] for c in p)
        ham_a = sum(MARKS[c][2] for c in p)
        ham_b = sum(MARKS[c][3] for c in p)
        # min components: each dotted letter's dots may merge into one stroke
        min_a = sum(1 for c in p if MARKS[c][0]) + ham_a
        min_b = sum(1 for c in p if MARKS[c][1]) + ham_b
        ps.append({"text": p, "is_mark": False,
                   "marks_above": (min_a, above + ham_a),   # (min, max) components
                   "marks_below": (min_b, below + ham_b)})
    bodies = [p for p in ps if not p["is_mark"]]
    loose = sum(1 for p in ps if p["is_mark"])
    return {
        "name": normalize(name),
        "pieces": [p["text"] for p in bodies],
        "piece_count": len(bodies),
        "per_piece": bodies,
        "marks_above": (sum(p["marks_above"][0] for p in bodies), sum(p["marks_above"][1] for p in bodies)),
        "marks_below": (sum(p["marks_below"][0] for p in bodies), sum(p["marks_below"][1] for p in bodies) + loose),
        "standalone_hamza": loose,
        "dots_above": sum(MARKS[c][0] for p in bodies for c in p["text"]),
        "dots_below": sum(MARKS[c][1] for p in bodies for c in p["text"]),
        "hamza_above": sum(MARKS[c][2] for p in bodies for c in p["text"]),
        "hamza_below": sum(MARKS[c][3] for p in bodies for c in p["text"]) + loose,
    }


if __name__ == "__main__":
    import json, sys
    for n in (sys.argv[1:] or ["مدى", "عبد الرحمن"]):
        print(json.dumps(fingerprint(n), ensure_ascii=False))

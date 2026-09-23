# Arabic name-art checks (zero cost)

Local tools used to check Arabic lettering without calling any paid model. Nothing here is part of
the storefront or the design service.

| File | Purpose |
|---|---|
| `check.py` | Structural prefilter for ANY image of an Arabic word or name (designer artwork, style examples, model output): number of letter groups, dots/hamza above and below, per-group when a skeleton map exists. It does not read letters (no OCR) and cannot tell م from د. A PASS still needs a human reader. |
| `arabic.py` | Facts derived from the typed text only: letter groups by joining rules, expected dots and hamza. |
| `selftest.py` | Synthetic positives/negatives in five fonts, clean and "brush" perturbed. |
| `glyphs.py`, `compose.py`, `review.py` | Exact-letter skeletons (HarfBuzz shaping) in three layouts with gates, and a local review page. |
| `candidates.py` | Font-derived «مثال» candidates, used only to test whether usable style examples could be made for free. |
| `fetch_fonts.sh` | Downloads the OFL fonts from google/fonts and verifies SHA-256. |

Run: `pip install --break-system-packages uharfbuzz fonttools shapely scipy numpy pillow playwright`,
`./fetch_fonts.sh`, then `python3 selftest.py`, `python3 compose.py && python3 review.py`,
`python3 check.py --name "مثال" image.png`.

## Results on 2026-09-23 (Node-free, Python 3, local)

- `selftest.py`: 117 of 120 synthetic cases as expected. Known misses: two «brush» renders where a
  dot fused into its letter (safe direction: false FAIL) and one Alkalami «عيد» case where two touching
  dots look like one (unsafe direction: false PASS). Fonts Aref Ruqaa and Rakkas draw final ن
  WITHOUT its dot; the checker correctly fails them, so "correct by construction" through a font is
  not guaranteed either.
- Skeletons: letter inventory is exact by construction, but layouts can still mislead a reader:
  a dot moved over another letter read «الزحمن», a collision read «عبل», and stacked «مثال»
  candidates put ل to the right so they read «لمثا». Gates now catch the dot cases; reading order
  of stacked groups is not gated. A human must read every image.
- «مثال» candidates: all font-derived renders pass the structural check, but they look typeset and the
  stacked ones read in the wrong order. They are NOT proposed as storefront style examples.

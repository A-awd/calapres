"""Build a local review page (and a PNG of it) for the owner's letter check.

Shows, per name, the accepted skeleton for each designer layout, the typed name
in large plain text next to it, and the gate results. Optional: a results/
folder with generated candidates (<name-key>-<layout>-<model>-<mode>-<n>.png)
is shown beside the skeletons with the check.py verdict.
"""
import html, json, sys
from pathlib import Path
from check import check

HERE = Path(__file__).parent
OUT = HERE / "out"
RES = HERE / "results"
LAYOUT_AR = {"1-block": "١ — كتلة متراكبة", "2-sweep": "٢ — أفقي بذيل ممتد", "3-arch": "٣ — مقوّس حول منحنى"}


def build():
    rep = json.loads((OUT / "report.json").read_text())
    cells = []
    for key, r in rep.items():
        name = r["name"]
        row = [f'<section><h2><span class="typed">{html.escape(name)}</span></h2><div class="grid">']
        for lname, tried in r["designs"].items():
            acc = next((t for t in tried if t.get("accepted")), None)
            if not acc:
                row.append(f'<figure class="none"><figcaption>{LAYOUT_AR[lname]}<br>لا يوجد هيكل اجتاز البوابات</figcaption></figure>')
                continue
            gates = (f'حروف: {"✓" if acc["G1_inventory"] else "✗"} · بنية: {acc["G2_structure"]} · '
                     f'تباعد: {acc["G3_clearance_em"]} · نقاط: {"✓" if acc["G4_dots_ok"] else "✗"}')
            rej = [t["font"] for t in tried if not t.get("accepted")]
            rejtxt = f'<small dir="ltr">rejected fonts: {", ".join(rej)}</small>' if rej else ""
            gen = ""
            for p in sorted(RES.glob(f"{key}-{lname}-*.png")) if RES.exists() else []:
                v = check(name, p, OUT / f"{key}-{lname}.map.png")
                gen += (f'<div class="gen"><img src="../results/{p.name}"><small dir="ltr">{p.stem}: '
                        f'{v["verdict"]} {html.escape("; ".join(v["reasons"] + v["flags"]))}</small></div>')
            row.append(f'<figure><img src="{key}-{lname}.png"><figcaption>{LAYOUT_AR[lname]}<br>'
                       f'<small>{html.escape(gates)}</small><br><small dir="ltr">{acc["font"]}</small> {rejtxt}</figcaption>{gen}</figure>')
        row.append("</div></section>")
        cells.append("".join(row))
    page = f"""<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">
<title>Calapres letter check</title>
<style>
body{{font-family:system-ui,sans-serif;background:#f4f1ec;color:#222;margin:0;padding:16px}}
h1{{font-size:20px;margin:0 0 4px}} p.lead{{margin:0 0 14px;font-size:14px;max-width:980px}}
section{{background:#fff;border-radius:10px;padding:12px;margin-bottom:14px}}
h2{{margin:0 0 8px;font-size:30px}} .grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}}
figure{{margin:0;border:1px solid #ddd;border-radius:8px;padding:6px}} figure img{{width:100%;display:block}}
figcaption{{font-size:14px;margin-top:4px}} small{{color:#555;font-size:12px}}
.gen img{{width:100%;border-top:1px dashed #bbb;margin-top:6px}}
</style>
<h1>فحص الحروف — هياكل الإدخال فقط، ليست التصميم النهائي</h1>
<p class="lead">كل صورة مبنية من حروف الاسم المكتوب نفسها. المطلوب منك هنا سؤال واحد لكل صورة: هل تُقرأ الاسم كما هو، بكل حرف ونقطة وبالترتيب؟ الشكل الفني سيأتي من النموذج لاحقاً.</p>
{''.join(cells)}
</html>"""
    (OUT / "review.html").write_text(page)
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1180, "height": 900})
            pg.goto((OUT / "review.html").resolve().as_uri()); pg.wait_for_timeout(300)
            pg.screenshot(path=str(OUT / "review.png"), full_page=True); b.close()
    except Exception as e:  # screenshot is a convenience only
        print("screenshot skipped:", e, file=sys.stderr)


if __name__ == "__main__":
    build()

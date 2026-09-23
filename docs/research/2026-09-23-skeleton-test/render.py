from pathlib import Path
from playwright.sync_api import sync_playwright
out = Path("out")
svgs = sorted(out.glob("*.svg"))
cells = "".join(f'<figure><img src="{s.name}"><figcaption>{s.stem}</figcaption></figure>' for s in svgs)
(out/"sheet.html").write_text(f'<html><body style="margin:0;background:#ddd;font:14px sans-serif"><div style="display:grid;grid-template-columns:repeat(3,340px);gap:8px;padding:8px">{cells}</div><style>figure{{margin:0;background:#fff}}img{{width:340px;height:340px;display:block}}figcaption{{padding:4px}}</style></body></html>')
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width":1024,"height":1024})
    for s in svgs:
        pg.goto(f"file://{s.resolve()}"); pg.screenshot(path=str(s.with_suffix(".png")))
    pg.set_viewport_size({"width":1060,"height":800}); pg.goto(f"file://{(out/'sheet.html').resolve()}"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(out/"sheet.png"), full_page=True)
    b.close()

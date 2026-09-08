"""Source-preserving Calapres watermark batch. Requires an explicit input manifest."""
import argparse
import hashlib
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms, ImageDraw


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1048576), b''):
            h.update(chunk)
    return h.hexdigest()


def run(inventory, logo_path, root):
    rows = json.loads(inventory.read_text())
    folders = {k: root / v for k, v in {
        'masters': 'صور بالشعار - الدقة الأصلية',
        'stories': 'صور بالشعار - ستوري سناب وإنستجرام',
        'posts': 'صور بالشعار - بوستات إنستجرام',
        'review': 'مراجعة صور الشعار',
    }.items()}
    for folder in folders.values():
        folder.mkdir(exist_ok=False)
    logo = Image.open(logo_path).convert('RGBA')
    alpha = logo.getchannel('A').crop(logo.getbbox())
    # Manually reviewed source-specific positions; y is the top of the lettering.
    ys = [.955, .755, .65, .725, .73, .765, .735, .90, .75, .86,
          .87, .69, .84, .78, .685, .705, .84, .87, .67, .87,
          .815, .91, .90, .90, .955, .84, .86, .83, .72, .76,
          .905, .94, .925, .79, .715, .88, .72, .865, .88, .75,
          .775, .74]
    assert len(rows) == len(ys) == 42
    srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB'))
    previews, manifest = [], []
    for index, (row, yf) in enumerate(zip(rows, ys), 1):
        source = Path(row['path'])
        before_hash = digest(source)
        with Image.open(source) as opened:
            assert opened.getexif().get(274, 1) == 1, 'Nontrivial orientation needs explicit handling'
            icc = opened.info.get('icc_profile')
            src = opened.convert('RGB')
        assert src.size == (row['width'], row['height'])
        w = round(src.width * .20)
        h = round(w * alpha.height / alpha.width)
        mask = alpha.resize((w, h), Image.Resampling.LANCZOS).point(lambda v: round(v * .35))
        xc = .20 if index == 32 else .50
        x, y = round(src.width * xc - w / 2), round(src.height * yf)
        y = min(y, src.height - h - round(src.height * .008))
        roi = np.asarray(src.crop((x, y, x+w, y+h)))
        color = (68, 39, 27) if float(roi.mean()) > 155 else (223, 212, 195)
        output = src.copy()
        output.paste(Image.new('RGB', (w, h), color), (x, y), mask)
        name = f'{index:02d}-' + source.stem.strip()
        master = folders['masters'] / (name + '.png')
        options = {'icc_profile': icc} if icc else {}
        output.save(master, compress_level=2, **options)
        # Read the actual saved master and verify source preservation in strips.
        with Image.open(master) as saved:
            assert saved.size == src.size
            for top in range(0, src.height, 512):
                bottom = min(top+512, src.height)
                diff = np.any(np.asarray(src.crop((0, top, src.width, bottom))) !=
                              np.asarray(saved.crop((0, top, src.width, bottom))), axis=2)
                lo, hi = max(top, y), min(bottom, y+h)
                if hi > lo:
                    diff[lo-top:hi-top, x:x+w] = False
                assert not diff.any(), source.name
        assert digest(source) == before_hash
        # Convert only social derivatives to sRGB; never resize or transform masters.
        if icc:
            social = ImageCms.profileToProfile(output, ImageCms.ImageCmsProfile(io.BytesIO(icc)), srgb, outputMode='RGB')
        else:
            social = output
        exports = {}
        for key, size in [('stories', (1080, 1920)), ('posts', (1080, 1350))]:
            tw, th = size
            scale = min(tw/social.width, th/social.height, 1.0)
            # Keep the watermark above a conservative story UI margin by reducing
            # the whole photo when necessary, never moving it away from the product.
            if key == 'stories':
                low = y + h - social.height / 2
                if low > 0:
                    scale = min(scale, (th * .80 - th / 2) / low)
            nw, nh = round(social.width*scale), round(social.height*scale)
            thumb = social.resize((nw, nh), Image.Resampling.LANCZOS)
            small = social.resize((64, 64))
            border = np.asarray(small)
            edge = np.concatenate((border[0], border[-1], border[:,0], border[:,-1]))
            bg = tuple(int(v) for v in np.median(edge, axis=0))
            canvas = Image.new('RGB', size, bg)
            left, top = (tw-nw)//2, (th-nh)//2
            canvas.paste(thumb, (left, top))
            dest = folders[key] / (name + '.jpg')
            canvas.save(dest, quality=95, subsampling=0, icc_profile=srgb.tobytes())
            with Image.open(dest) as check:
                assert check.size == size
            if key == 'stories':
                assert top + (y+h)*scale <= th*.80+2
            exports[key] = {'path': str(dest.relative_to(root)), 'dimensions': size,
                            'image_rectangle': [left, top, nw, nh], 'cropped': False}
        preview = output.copy()
        preview.thumbnail((280, 500))
        previews.append((index, preview))
        manifest.append({'source': str(source.relative_to(root)), 'source_sha256': before_hash,
                         'master': str(master.relative_to(root)), 'dimensions': src.size,
                         'watermark_box': [x,y,w,h], 'opacity': .35, 'width_fraction': .20,
                         'color': color, 'outside_logo_unchanged': True, 'exports': exports,
                         'position_note': 'lower-left near tray: tight macro crop' if index == 32 else 'center near product'})
        (folders['review']/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
        print(f'Verified {index}/42', flush=True)
    for start in range(0,42,7):
        sheet = Image.new('RGB',(2100,550),'#dddddd')
        draw = ImageDraw.Draw(sheet)
        for col,(number,preview) in enumerate(previews[start:start+7]):
            xx=col*300
            sheet.paste(preview,(xx+(300-preview.width)//2,35))
            draw.text((xx+10,10),str(number),fill='black')
        sheet.save(folders['review']/f'review-{start//7+1}.jpg',quality=94)
    print(json.dumps({'count':len(manifest),'folders':{k:str(v) for k,v in folders.items()}},ensure_ascii=False),flush=True)


if __name__ == '__main__':
    p=argparse.ArgumentParser()
    p.add_argument('inventory',type=Path)
    p.add_argument('logo',type=Path)
    p.add_argument('root',type=Path)
    a=p.parse_args()
    run(a.inventory,a.logo,a.root)

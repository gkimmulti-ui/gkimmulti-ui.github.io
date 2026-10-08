"""Generate local download QR codes from the catalog's exact store URLs.

Install the authoring-only dependency: python -m pip install qrcode[pil]==8.2
Then run: python scripts/generate-store-qr.py
"""
import json
from pathlib import Path

import qrcode

ROOT = Path(__file__).resolve().parents[1]
output = ROOT / "assets" / "store-qr"
output.mkdir(parents=True, exist_ok=True)
apps = json.loads((ROOT / "data" / "apps.json").read_text())
manifest = []
for app in apps:
    for store, key in (("play", "playUrl"), ("appstore", "appStoreUrl")):
        url = app.get(key)
        if not url:
            continue
        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,
                           box_size=8, border=4)
        qr.add_data(url)
        qr.make(fit=True)
        filename = f"{app['slug']}-{store}.png"
        qr.make_image(fill_color="black", back_color="white").save(output / filename)
        manifest.append({"app": app["slug"], "store": store, "url": url,
                         "image": f"assets/store-qr/{filename}"})
(ROOT / "data" / "store-qr.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(f"Generated {len(manifest)} store QR codes.")

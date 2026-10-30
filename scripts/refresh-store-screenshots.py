"""Refresh official screenshots for the existing catalog without changing app copy.

Authoring dependencies: google-play-scraper==1.2.7 and Pillow.
Run before scripts/build.cjs. Identical source images are reused, device duplicates
are removed, and new filenames prevent browsers from showing old screenshots.
An unavailable listing raises an error instead of removing its published images.
"""
import concurrent.futures
import datetime
import io
import json
import time
import re
import socket
import urllib.request
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from PIL import Image
from google_play_scraper import app as play_app

ROOT = Path(__file__).resolve().parents[1]
TODAY = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).date().isoformat()
STAMP = TODAY.replace("-", "")
socket.setdefaulttimeout(30)


def download(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                return response.read()
        except Exception:
            if attempt == 2:
                raise


def identity(url, platform):
    return url.split("=")[0] if platform == "Google Play" else url.rsplit("/", 1)[0]


def valid_image(path):
    try:
        with Image.open(path) as image:
            image.load()
        return True
    except (OSError, ValueError):
        return False


def save_webp(image, path, quality):
    buffer = io.BytesIO()
    image.save(buffer, "WEBP", quality=quality, method=6)
    encoded = buffer.getvalue()
    with Image.open(io.BytesIO(encoded)) as check:
        check.load()
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_bytes(encoded)
    temporary.replace(path)


def screenshots(slug, urls, platform, previous):
    # Google Play repeats the same images for phone and tablet galleries.
    distinct = list(dict.fromkeys(identity(url, platform) for url in urls))
    existing = {identity(item["sourceUrl"], platform): item for item in previous
                if item["platform"] == platform}
    result = []
    store = "play" if platform == "Google Play" else "appstore"
    for index, source in enumerate(distinct, 1):
        if source in existing and all(valid_image(ROOT / existing[source][key]) for key in ("src", "thumb")):
            result.append(existing[source])
            continue
        url = source + ("=w1000" if platform == "Google Play" else "/1000x2200bb.jpg")
        image = Image.open(io.BytesIO(download(url))).convert("RGB")
        image.thumbnail((1000, 2200), Image.Resampling.LANCZOS)
        basename = f"images/screenshots/{slug}-{store}-{STAMP}-{index:02}"
        save_webp(image, ROOT / (basename + ".webp"), 86)
        thumb = image.copy()
        thumb.thumbnail((400, 720), Image.Resampling.LANCZOS)
        save_webp(thumb, ROOT / (basename + "-thumb.webp"), 82)
        result.append({"src": basename + ".webp", "thumb": basename + "-thumb.webp",
                       "sourceUrl": url, "platform": platform,
                       "width": image.width, "height": image.height})
    if not result:
        raise ValueError(f"No screenshots returned: {slug}/{platform}")
    return result


def refresh(entry):
    slug = entry["slug"]
    package = parse_qs(urlparse(entry["playUrl"]).query)["id"][0]
    data = play_app(package, lang="ko", country="kr")
    if data["developer"] != "Kenneth App":
        raise ValueError(f"Unexpected developer for {slug}")
    previous = entry.get("screenshots", [])
    images = screenshots(slug, data["screenshots"], "Google Play", previous)
    record = {"slug": slug, "package": package,
              "storeUrl": entry["playUrl"] + "&hl=ko&gl=KR", "verifiedAt": TODAY,
              "storeTitle": data["title"], "iconSourceUrl": data["icon"]}
    # Always compare the current icon; a valid old file may still be stale.
    if True:
        icon = Image.open(io.BytesIO(download(data["icon"].split("=")[0] + "=w256"))).convert("RGBA")
        icon.thumbnail((256, 256), Image.Resampling.LANCZOS)
        save_webp(icon, ROOT / entry["icon"], 92)
    if entry.get("appStoreUrl"):
        parsed = urlparse(entry["appStoreUrl"])
        country = parsed.path.strip("/").split("/")[0]
        if len(country) != 2:
            country = "us"
        app_id = re.search(r"/id(\d+)", parsed.path).group(1)
        lookup_url = f"https://itunes.apple.com/lookup?id={app_id}&country={country}"
        lookup = json.loads(download(lookup_url))
        if not lookup.get("results"):
            raise ValueError(f"App Store listing unavailable: {slug} ({country})")
        apple = lookup["results"][0]
        if apple.get("artistId") != 6787111565:
            raise ValueError(f"Unexpected App Store developer for {slug}")
        images += screenshots(slug, apple["screenshotUrls"], "App Store", previous)
        entry["appStoreTitle"] = apple["trackName"]
        record["appStore"] = {"storeUrl": entry["appStoreUrl"], "lookupUrl": lookup_url,
                              "country": country, "storeTitle": apple["trackName"],
                              "version": apple["version"], "verifiedAt": TODAY}
    changed = [platform for platform in ("Google Play", "App Store")
               if [identity(s["sourceUrl"], platform) for s in previous if s["platform"] == platform]
               != [identity(s["sourceUrl"], platform) for s in images if s["platform"] == platform]]
    entry["screenshots"] = images
    record["screenshots"] = images
    localized = {}
    regions = {'ko': ('ko','kr'), 'en': ('en','us'), 'ja': ('ja','jp'), 'zh': ('zh-CN','tw'), 'ru': ('ru','us'), 'fil': ('fil','ph')}
    names = {}
    for locale, (language, country) in regions.items():
        listing = data if locale == 'ko' else play_app(package, lang=language, country=country)
        if listing['developer'] != 'Kenneth App':
            raise ValueError('Unexpected localized developer: '+slug+'/'+locale)
        description = listing.get('description','').strip()
        if not description or not listing.get('summary'):
            raise ValueError('Missing store copy: '+slug+'/'+locale)
        names[locale] = listing['title']
        paragraphs = [p.strip() for p in description.split('\\n') if p.strip()]
        excerpt = next((p for p in paragraphs if len(p) > 35), listing['summary'])
        entry['headline'][locale] = listing['summary']
        entry['desc'][locale] = excerpt[:700] + ('…' if len(excerpt)>700 else '')
        entry['category'][locale] = listing['genre']
        entry['tags'][locale] = []
        localized[locale] = {'title':listing['title'], 'summary':listing['summary'], 'description':description,
                             'version':listing.get('version'), 'updated':listing.get('updated'),
                             'sourceUrl':entry['playUrl']+'&hl='+language+'&gl='+country.upper()}
    entry['name'] = names
    entry['playDescription'] = {key: value['description'] for key,value in localized.items()}
    record['localized'] = localized
    print(f"{slug}: {len(images)} screenshots; updated: {', '.join(changed) or 'none'}", flush=True)
    return entry, record


if __name__ == "__main__":
    apps = json.loads((ROOT / "data/apps.json").read_text(encoding="utf-8"))
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        updated = list(executor.map(refresh, apps))
    # Write catalog files only after every official listing has been checked.
    for path, values in (("data/apps.json", [x[0] for x in updated]),
                         ("data/store-sources.json", [x[1] for x in updated])):
        (ROOT / path).write_text(json.dumps(values, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Verified {len(updated)} apps; {sum(len(x[0]['screenshots']) for x in updated)} distinct screenshots.")


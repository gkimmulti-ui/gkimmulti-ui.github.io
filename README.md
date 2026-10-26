# Kenneth App homepage

Static GitHub Pages homepage for https://gkimmulti-ui.github.io/.

## Update the homepage

- App descriptions, localized copy, store links and screenshot metadata: `data/apps.json`
- Featured hero order and screenshot selection: `data/hero.json`
- Website text in Korean, English, Japanese, Chinese, Russian and Filipino: `data/translations.json`
- Layout: `src/index.template.html`
- Styles and interactions: `assets/home.css`, `assets/home.js`
- Current official screenshot URLs and per-store verification dates: `data/store-sources.json`

Run `node scripts/build.cjs` after changing the template or data. Commit the generated `index.html` and `assets/catalog.js` together with source changes. No third-party runtime packages are needed. The initial Korean catalog is rendered in the HTML, so descriptions, image links and store links remain available without JavaScript.

Each screenshot has a small WebP thumbnail and a larger WebP for the image viewer. The screenshot artwork is taken from the official Google Play listings; the 마음장부, 로또, and Light Wall galleries also include iPhone screenshots from their App Store listings. Original image URLs and platform labels are recorded in the source manifest. Website language selection does not translate the text embedded in store screenshots.

Existing policy pages, search verification files, `app-ads.txt` and app-specific pages remain at their original paths.

The self-hosted `Kenneth UI` font is a renamed, character-subset version of Pretendard 1.3.9 (https://github.com/orioncactus/pretendard). Its SIL Open Font License is included in `assets/fonts/OFL.txt`. Additional characters fall back to the device's fonts.

## Previous upstream sync

The previous hourly sync replaced `index.html` and the entire `images/` directory from `KennethApp`. Scheduled overwrite is now disabled so it cannot erase this redesign. The old manual workflow is retained with an explicit, default-off `confirm_overwrite` input. Running it replaces the homepage with the old upstream source; use only for an intentional restore.

The catalog currently contains 17 apps. SaveCity, HowLong?, Star Stock and Deep Dig were added on 2026-10-18, with localized descriptions, official screenshots and Google Play QR codes. All existing Google Play and App Store galleries were compared against their current listings. Identical phone/tablet screenshots are shown only once. The changed galleries are Holy Ground (Google Play), 마음장부 and 로또 (App Store).

마음장부, 로또, and Light Wall have verified App Store links. As of 2026-10-18, 로또 is listed in the US App Store but its Korean listing returns 404; its button and QR use the verified US link and the card explains regional availability. Light Wall is listed as LightWal on the App Store; its description distinguishes the Android lock screen from the iPhone widget app.

To check all catalog screenshots again, install the authoring-only dependencies and run:

```sh
python -m pip install 'google-play-scraper==1.2.7' Pillow
python scripts/refresh-store-screenshots.py
node scripts/build.cjs
```

The refresh preserves images with unchanged source URLs, downloads new images under dated filenames, removes repeated device-gallery entries, and updates the source manifest. An unavailable listing stops the refresh for review. Existing standalone policy pages are not rewritten. Rebuild the subset font when adding new text that needs additional characters.

## Store badges and QR codes

Each app has a download section with official localized Google Play / App Store badge images, a scannable QR code, and a QR image download link. Apps without an App Store URL display a localized “Coming soon” panel. They do not show an active App Store download badge or QR code.

Badge originals are stored in `assets/store-badges/`; their official source URLs are recorded in `data/store-badges.json`. Their proportions and artwork are preserved. QR codes are local PNGs in `assets/store-qr/`, with exact destination URLs in `data/store-qr.json`. There is no third-party QR service, redirect, or tracking dependency.

When adding or changing a store URL, run:

```sh
python -m pip install 'qrcode[pil]==8.2'
python scripts/generate-store-qr.py
node scripts/build.cjs
```

Commit the QR images and manifest with the generated homepage. The build rejects missing or stale QR codes. To mark an App Store release, set `appStoreUrl` in `data/apps.json` and regenerate; the active badge and QR replace the upcoming panel automatically. All download links and QR images work without JavaScript.

## Hero screenshot collection

The top gallery shows one current store screenshot for every app. `data/hero.json` prioritizes new releases and updated galleries, with a zero-based screenshot index within the selected platform. The remaining apps are appended automatically using their first screenshot. Both static HTML and browser rendering read the same catalog metadata, so screenshot refreshes also update the hero. The build rejects featured selections that no longer exist.

The gallery supports native touch scrolling, previous/next buttons, arrow keys, and a pause/play control. It advances every five seconds while visible, pauses on hover, and stops after keyboard focus or manual navigation. Reduced-motion preferences start it paused. App links restore filtered-out cards before navigating. All 17 screenshots and links also work without JavaScript.

## Search visibility (2026-10-26)

`node scripts/build.cjs` now builds 108 static content pages: six catalog homepages and 17 app detail pages in each language. Korean lives at `/`, other languages at `/en/`, `/ja/`, `/zh/`, `/ru/`, `/fil/`; app URLs append `apps/<slug>/`. All descriptions, screenshots, store badges, QR codes and language links are present without JavaScript. Legacy `?lang=` links navigate to the corresponding static URL. URL language always takes precedence over browser settings.

The build generates unique titles/descriptions, self-canonical URLs, reciprocal hreflang links (ISO 639-1 `tl` for Filipino), Organization/WebSite/CollectionPage/MobileApplication/BreadcrumbList metadata, `sitemap.xml` with screenshot URLs, and a Korean `feed.xml`. It preserves the existing app privacy/terms documents and search-engine verification files. App ratings, current prices and download counts are not invented for structured data. Schema describes the content; eligibility for enhanced search results is not promised.

`data/page-manifest.json` records page content hashes and meaningful change dates. Unchanged rebuilds preserve `lastmod`; changed pages get the current date in Asia/Seoul. `BUILD_DATE=YYYY-MM-DD node scripts/build.cjs` can pin the date for a deliberate release. Commit the generated pages and manifest with the sources. The validation command is `python scripts/check-seo.py` (Python standard library only).

Google and Naver can discover the sitemap through `robots.txt`. For owner-account monitoring, submit `https://gkimmulti-ui.github.io/sitemap.xml` to Google Search Console and Naver Search Advisor; `https://gkimmulti-ui.github.io/feed.xml` is available for Naver RSS submission. Verification files being present does not prove the accounts are currently verified or that submission has occurred. Use Google URL Inspection to request indexing of the homepage and key app pages. Search engines decide whether and when to index/rank content.

Naver IndexNow publication notifications use the **public** ownership key in `data/search-config.json` and the matching root `.txt` file. After GitHub Pages finishes publishing, preview only changed content URLs, then submit them:

```sh
python scripts/notify-indexnow.py --since <commit-before-update>
python scripts/notify-indexnow.py --since <commit-before-update> --submit
```

The script verifies the live ownership file and sitemap before sending. HTTP 200 means the notification was received; 202 means key validation is pending. Neither means the URLs are indexed. IndexNow does not submit URLs to Google. Do not repeatedly send unchanged pages or use Google's deprecated sitemap ping endpoint.

Official guidance: [Google multilingual pages](https://developers.google.com/search/docs/specialty/international/localized-versions), [Google recrawling](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl), [Naver sitemap/RSS](https://searchadvisor.naver.com/guide/request-feed), [Naver IndexNow](https://searchadvisor.naver.com/guide/indexnow-request).

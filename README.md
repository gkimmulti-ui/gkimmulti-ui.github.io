# Kenneth App homepage

Static GitHub Pages homepage for https://gkimmulti-ui.github.io/.

## Update the homepage

- App descriptions, localized copy, store links and screenshot metadata: `data/apps.json`
- Website text in Korean, English, Japanese, Chinese, Russian and Filipino: `data/translations.json`
- Layout: `src/index.template.html`
- Styles and interactions: `assets/home.css`, `assets/home.js`
- Source URLs for the 89 official store screenshots, checked 2026-10-03: `data/store-sources.json`

Run `node scripts/build.cjs` after changing the template or data. Commit the generated `index.html` and `assets/catalog.js` together with source changes. No third-party runtime packages are needed. The initial Korean catalog is rendered in the HTML, so descriptions, image links and store links remain available without JavaScript.

Each screenshot has a small WebP thumbnail and a larger WebP for the image viewer. The screenshot artwork is taken from the official Google Play listings; the 마음장부, 로또, and Light Wall galleries also include iPhone screenshots from their App Store listings. Original image URLs and platform labels are recorded in the source manifest. Website language selection does not translate the text embedded in store screenshots.

Existing policy pages, search verification files, `app-ads.txt` and app-specific pages remain at their original paths.

The self-hosted `Kenneth UI` font is a renamed, character-subset version of Pretendard 1.3.9 (https://github.com/orioncactus/pretendard). Its SIL Open Font License is included in `assets/fonts/OFL.txt`. Additional characters fall back to the device's fonts.

## Previous upstream sync

The previous hourly sync replaced `index.html` and the entire `images/` directory from `KennethApp`. Scheduled overwrite is now disabled so it cannot erase this redesign. The old manual workflow is retained with an explicit, default-off `confirm_overwrite` input. Running it replaces the homepage with the old upstream source; use only for an intentional restore.

The catalog currently contains 13 apps. Quiz Aura, Snap Clean: Photo Cleaner, and LUMI DAY - Diary & Journal were added as Android-only apps. 마음장부, 로또, and Light Wall have verified App Store links. Light Wall is listed as LightWal on the App Store; its description distinguishes the Android lock screen from the iPhone widget app.

# Publishing ZenTube to the Chrome Web Store

Full step-by-step guide. First publish takes ~30 minutes including review wait.

---

## 0. One-time prerequisites

### Developer account ($5 one-time fee)
1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with the Google account you want as the publisher
3. Pay the **$5 one-time registration fee** (lifetime, all your extensions)
4. Accept the developer agreement

### Set up Ko-fi & GitHub Sponsors
- **Ko-fi**: already done — your URL is `https://ko-fi.com/H6E01ZT8Z2`
- **GitHub Sponsors** (optional): apply at https://github.com/sponsors → once approved, update the URL in `popup/popup.js` (constant `GITHUB_SPONSORS_URL`) and `options/options.html` (the `<a href>`)

### Privacy policy URL — done ✅

Already published as a public GitHub Gist. Use this URL in the Chrome Web Store:

```
https://gist.github.com/jorgepassetti/18c9ddd28e86bd25d90ea56e24eef7d1
```

The source file lives at `PRIVACY.md` in the project. To edit it later:
```bash
gh gist edit 18c9ddd28e86bd25d90ea56e24eef7d1 PRIVACY.md
```
The URL stays the same; the content updates.

---

## 1. Prepare the ZIP

The store wants a ZIP file where `manifest.json` is at the root.

```bash
cd /Users/jorgepassetti/Documents/personal/mister-apps/extensiones/zentube

# Clean any cruft
rm -f .DS_Store
find . -name ".DS_Store" -delete

# Create the upload zip — exclude store assets and docs
zip -r zentube-v1.0.0.zip . \
  -x "store/*" \
  -x "*.md" \
  -x "*.svg" \
  -x "icons/logo.svg" \
  -x ".git/*" \
  -x ".DS_Store" \
  -x "icons/icon512.png"

# Verify contents
unzip -l zentube-v1.0.0.zip | head -40
```

The ZIP should contain:
- `manifest.json` at root
- `background.js`
- `content/content.js`, `content/content.css`
- `popup/popup.html`, `popup/popup.css`, `popup/popup.js`
- `options/options.html`, `options/options.css`, `options/options.js`
- `icons/icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`, `kofi-button.png`
- `_locales/en/messages.json`, `_locales/es/messages.json`

**Important**: `manifest.json` must be at the **root of the zip**, not inside a `zentube/` folder.

---

## 2. Upload the extension

1. Go to https://chrome.google.com/webstore/devconsole
2. Click **+ New item** (top right)
3. Drop the ZIP file or browse to select it
4. Wait for the upload to finish (~30 seconds)

If it rejects the upload, the error message tells you exactly what's wrong (usually manifest issues).

---

## 3. Fill the store listing

The console will land you on the listing page with several tabs. Fill these:

### Store listing → Product details

| Field | Value |
|---|---|
| **Name** | ZenTube — YouTube Focus |
| **Summary** (132 chars) | Strip YouTube of distractions. Hide feed, recs, Shorts, comments. Focus modes, time limits, Pomodoro. Free forever. |
| **Description** | See below |
| **Category** | Productivity |
| **Language** | English (you can add Spanish after first publish) |

**Description** (paste this):
```
Take YouTube back. One click.

ZenTube strips YouTube of everything that steals your attention: the home feed,
recommendations, Shorts, comments, view counts, end-screen suggestions — all of
it. Pick one of four focus modes or customize each toggle.

FREE FOREVER. No subscription. No ads. No tracking. No account.

CORE FEATURES
• 4 focus modes (Off / Casual / Learning / Deep Work) — one click switches everything
• 13 individual hide toggles for full control
• Blocks Shorts: /shorts/ URLs redirect to the normal player
• Grayscale mode — reduce dopamine-triggering thumbnails
• Hide view counts, like counts, subscriber counts

TIME MANAGEMENT
• Daily time limit — YouTube closes when you hit it
• Schedule blocks — e.g. no YouTube Mon-Fri 9 to 1
• Pomodoro built-in — 25 min focus, 5 min forced break
• Auto-pause when you switch tabs
• Disable autoplay so you decide what plays next

MINDFULNESS
• Mindful pause — "Why are you here?" with a forced delay before YouTube loads
• Custom homepage — replace the feed with a clock, greeting, and your own quote
• Recent intentions log — see what you said you'd do

CHANNEL CONTROL
• Whitelist mode — only allow specific channels
• Blacklist mode — block channels that suck your time

STATS
• Today / This week / Streak / Lifetime
• 14-day visual chart
• Distractions blocked counter

POLISH
• Beautiful dark/light auto-theming
• Keyboard shortcuts
• Export/import settings JSON
• Sync via Chrome (storage.sync) — settings follow your account
• Spanish + English

PRIVACY
Everything stays in your browser. No external servers. No analytics. The
extension only reads and modifies pages on youtube.com. Period.

If ZenTube gives you back hours of your life, consider a one-time tip on Ko-fi
inside the Support tab. Free forever either way.
```

### Store listing → Graphic assets

Upload all of these (already prepared in `store/`):

| Slot | File | Size |
|---|---|---|
| Store icon | `store/icon-128.png` | 128×128 |
| Screenshot 1 | `store/screenshot-1.png` | 1280×800 |
| Screenshot 2 | `store/screenshot-2.png` | 1280×800 |
| Screenshot 3 | `store/screenshot-3.png` | 1280×800 |
| Screenshot 4 | `store/screenshot-4.png` | 1280×800 |
| Small promo tile | `store/promo-small.png` | 440×280 |
| Marquee promo tile (optional but recommended) | `store/promo-marquee.png` | 1400×560 |

### Privacy → Privacy practices

For each permission, justify in 1 sentence:

| Permission | Justification |
|---|---|
| `storage` | Save user settings (focus mode, hide toggles, etc.) locally and via Chrome sync. |
| `tabs` | Detect open YouTube tabs to apply schedule and Pomodoro break overlays. |
| `alarms` | Schedule daily reset, schedule-rule checks, and Pomodoro phase transitions. |
| `host_permissions: *://*.youtube.com/*` | Read and modify YouTube pages to apply hide rules and overlays. This is the entire purpose of the extension. |

**Privacy policy URL**: paste the URL where you hosted `PRIVACY.md`.

**Single purpose**: "Reduce distractions on YouTube by hiding interface elements (feed, recommendations, Shorts, comments, etc.) according to user-configurable rules."

**Data collection**: Select "No, my extension doesn't collect any user data."

### Distribution

| Field | Recommended |
|---|---|
| **Visibility** | Public |
| **Regions** | All regions |
| **Pricing** | Free |

---

## 4. Submit for review

1. Save all changes
2. Click **Submit for review** (top right)
3. Confirm

**Review time:** typically 1–3 business days for the first submission. Updates are usually faster (hours).

You'll get an email when it's approved or if there's an issue. Common reasons for rejection:
- Privacy policy not accessible at the URL provided
- Requesting permissions that aren't justified
- Description that doesn't match the actual functionality

---

## 5. After publishing

Your extension page lives at:
```
https://chrome.google.com/webstore/detail/<EXTENSION_ID>
```

The dashboard shows installs, ratings, and crash reports.

### Updating later
1. Bump `version` in `manifest.json` (must be higher than current, e.g. `1.0.0` → `1.0.1`)
2. Rebuild the ZIP
3. In the developer console, click your item → **Package** → upload new ZIP
4. **Submit for review**

### Add Spanish to the store listing
1. Console → your item → Store listing → "Add another language" → Spanish
2. Paste a translated summary + description
3. Save → Submit for review (just for the listing, no re-package needed)

---

## Quick checklist before clicking Submit

- [ ] $5 developer fee paid
- [ ] Privacy policy hosted at a public URL
- [ ] All 4 screenshots uploaded
- [ ] Small promo tile uploaded
- [ ] Description filled
- [ ] Permission justifications filled
- [ ] "Single purpose" filled
- [ ] Data collection set to "no"
- [ ] Visibility set to Public
- [ ] ZIP version matches `manifest.json` version

That's it. Ship it. 🚀

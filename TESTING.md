# ZenTube — Manual Testing Plan

Static checks (already passed):
- ✅ All JSON files parse cleanly (manifest, both messages.json)
- ✅ All JS files pass `node --check` syntax validation
- ✅ All 145 i18n keys referenced in code exist in both `en` and `es`
- ✅ All file paths referenced in `manifest.json` resolve

## Installing for testing

1. Open `chrome://extensions`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked**, pick the `zentube/` folder
4. Pin the icon to the toolbar

If you see errors in `chrome://extensions` next to ZenTube, click "Errors" — they tell you exactly what's wrong.

## Smoke test (do these first, 3 minutes)

| # | Action | Expected |
|---|---|---|
| 1 | Click the ZenTube icon | Popup opens, shows logo, master toggle, focus modes, stats |
| 2 | Visit `youtube.com` | Floating "ZenTube · Casual · 0m today" pill bottom-right |
| 3 | Look at home feed | Shorts shelves are hidden (Casual mode default) |
| 4 | Click a video | Plays normally, end-screen suggestions hidden |
| 5 | Click "All settings" in popup | Options page opens in new tab |

If all five work, the extension is wired correctly.

## Feature tests

### Focus modes
- [ ] Switch to **Off** → YouTube is normal (no hiding)
- [ ] Switch to **Casual** → Shorts + end-screen hidden, comments visible
- [ ] Switch to **Learning** → home feed empty, no recommendations, no view counts, comments visible
- [ ] Switch to **Deep** → essentially only the player visible, grayscale on

### Schedule
- [ ] Options → Time → Enable "Scheduled blocking"
- [ ] Add a rule: name "Test", days = today, from = now-1min, to = now+2min
- [ ] Go to YouTube → blocked overlay appears with rule name
- [ ] Wait for time to pass → can use YouTube again (max 1 min for the check to fire)

### Pomodoro
- [ ] Options → Mindful → Enable Pomodoro, set work=2, short=1, long=2, cycles=2 (for fast test)
- [ ] Open popup → Pomodoro section appears → click "Start focus"
- [ ] Wait 2 min → automatic break overlay appears, video pauses
- [ ] Wait 1 min → back to work, widget shows countdown
- [ ] Click "Stop" → widget disappears

### Mindful pause
- [ ] Options → Mindful → enable Mindful pause, delay = 5
- [ ] Close all YouTube tabs, open `youtube.com` again
- [ ] Overlay appears with "Take a breath", 5-second countdown
- [ ] Type intention → click Continue → loads YouTube
- [ ] Options → Stats → "Recent intentions" shows what you typed

### Time limit
- [ ] Options → Time → enable Daily time limit, set to 1 minute
- [ ] Watch any video for 1+ minute
- [ ] Limit overlay appears, video pauses

### Channel filters
- [ ] Options → Channels → in Blocked channels, type a channel exactly as shown on a video
- [ ] Visit a video by that channel → "Channel blocked" overlay

### Custom homepage
- [ ] Options → Mindful → enable Custom homepage
- [ ] Go to `youtube.com/` → see clock + greeting + quote (no feed)
- [ ] Press `/` → jumps to YouTube search

### Stats
- [ ] Watch some videos
- [ ] Options → Stats → see today's minutes, week sum, 14-day chart

### Donations
- [ ] Click "Tip on Ko-fi" in popup → opens https://ko-fi.com/H6E01ZT8Z2
- [ ] Options → Support → see Ko-fi button + GitHub Sponsors card

### Spanish localization
- [ ] Chrome → Settings → Languages → set Spanish on top
- [ ] Restart Chrome → reopen popup
- [ ] All UI text appears in Spanish ("Modo de enfoque", "Ocultar rápido", etc.)

### Edit cases
- [ ] Toggle master off → all hiding disappears, YouTube fully restored
- [ ] Toggle master on → everything comes back
- [ ] Reload `chrome://extensions` → settings persist
- [ ] Sign into Chrome on another device → settings sync via `storage.sync`

## Things to watch out for

- **YouTube changes its DOM frequently.** If a hide rule stops working, the CSS selectors in `content/content.css` need updating.
- **Shorts redirect** (`/shorts/X` → `/watch?v=X`) — verify both that the redirect happens AND that the video plays correctly after.
- **Service worker sleep** — Chrome can suspend the service worker. Alarms are persistent so this shouldn't break anything, but if you see "schedule" lag past 1 min, check the alarm fires.
- **Storage quota** — `storage.sync` has 100 KB total. ZenTube uses ~2 KB. Plenty of room.

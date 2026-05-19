# ZenTube — YouTube, but on your terms

Free, open-source Chrome extension that strips YouTube of distractions. No account, no subscription, no tracking.

## Features

### Core
- **4 focus modes**: Off, Casual, Learning, Deep Work — one-click presets
- **13 hide toggles**: home feed, recommendations, comments, Shorts, trending, end-screen, live chat, notifications, search suggestions, view/like/subscriber counts, thumbnails
- **Grayscale mode**: removes color to reduce dopamine hits
- **Shorts blocker**: redirects `/shorts/...` URLs to the normal player

### Time management
- **Daily limit**: set max minutes per day; YouTube closes when you hit it
- **Schedule (planned)**: block YouTube during work hours
- **Auto-pause**: stops playback when you switch tabs
- **No autoplay**: prevents next-video-roulette
- **Lifetime stats**: today, this week, streak, total time on YouTube

### Mindfulness
- **Mindful pause**: forced 5-second delay + "why are you here?" prompt
- **Custom homepage**: replaces YouTube's feed with a clock, greeting, and your own quote
- **Intent log**: see what you said you were going to do (and judge yourself)

### Channel control
- **Whitelist mode**: only allow specific channels
- **Blacklist**: hard-block specific channels

### Polish
- **Beautiful UI**: light/dark auto, modern design, smooth animations
- **Keyboard shortcuts**: toggle Deep Work with `Cmd/Ctrl + Shift + Z`
- **Export/import**: take your settings anywhere
- **Sync via Chrome**: settings follow your Google login
- **i18n**: English + Spanish out of the box

## Install (developer mode)

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Pick the `zentube/` folder
5. Pin the icon and go to youtube.com

## Folder structure

```
zentube/
├── manifest.json          Manifest V3
├── background.js          Service worker — time tracking, stats, commands
├── content/
│   ├── content.js         Injected into youtube.com
│   └── content.css        Hide rules + overlay styles
├── popup/                 Toolbar popup (quick controls)
├── options/               Full settings page
├── icons/                 Logo + PNG icons
└── _locales/              en + es translations
```

## Tech

- Manifest V3, no build step, no dependencies
- Pure HTML/CSS/JS
- Settings sync via `chrome.storage.sync`
- Stats stored locally in `chrome.storage.local`

## Privacy

ZenTube reads and modifies pages on `*.youtube.com`. That's it. No data ever leaves your browser. No analytics. No external servers. No account.

## License

MIT — do what you want.

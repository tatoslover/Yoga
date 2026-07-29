# Mat & Mind

A distraction-free yoga video site: a grid of YouTube practices, played inline on the page. Built with plain HTML, CSS, and vanilla JavaScript — no framework, no build step, no CMS.

## Features

- **Video grid** — one card per practice: thumbnail, title, duration, type/difficulty badges, instructor
- **Inline playback** — click a card and it plays right there via a YouTube embed; no separate page or route
- **Six dark themes** — Forest, Ocean, Beach, Water, Lights, Mountain, switchable from the bottom-right theme picker, persisted in `localStorage`
- **Mobile-first** — single column on phones, 2 columns on iPad portrait, 3 columns on iPad landscape/desktop

## Structure

| File/Directory | Purpose |
|---|---|
| `index.html` | Page structure and markup |
| `style.css` | All styling, themes, and responsive layout |
| `script.js` | Fetches `data/videos.yaml`, renders cards, handles inline playback and theme switching |
| `data/videos.yaml` | The video list — the entire "add/remove a video" workflow |
| `assets/themes/` | Theme background images (`*.jpg`) and picker thumbnails (`*-thumb.jpg`) |
| `serve.py` | Local dev server (adds no-cache headers so edits show up on refresh) |

## Running locally

```bash
python3 serve.py
```

Then open `http://localhost:8000`. A local server is required (rather than opening `index.html` directly) because the page `fetch()`es `data/videos.yaml`, which browsers block over `file://`.

## Adding or removing a video

Edit `data/videos.yaml`. Copy an existing entry, change the fields, done — no build step, no restart needed (just refresh the page).

```yaml
videos:
  - id: "hJbRpHZr_d0"          # YouTube video ID
    title: "30 Min Morning Yoga Flow"
    slug: "morning-yoga-flow"   # used for the #shareable-link hash
    description: "..."
    duration: "30:00"
    type: "Vinyasa"
    difficulty: "Intermediate"
    instructor: "Yoga With Adriene"
    tags: ["morning", "energizing", "flow"]
```

Thumbnails are pulled automatically from YouTube's own CDN (`img.youtube.com/vi/{id}/hqdefault.jpg`) — no thumbnail images to manage.

## License

MIT

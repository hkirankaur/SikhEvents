# Sangat.org — Sikh Events Calendar

A static site: four files, no build step, no backend, no Excel. GitHub
Pages serves exactly what's in this folder — nothing happens outside
GitHub at all.

```
index.html      the page
style.css       all styling
script.js       reads data/events.json and renders/filters the cards
data/events.json   the event list — this is the only file you edit
```

## One-time setup

1. Create a GitHub repo and push everything in this folder to `main`
   (root of the repo — not a subfolder).
2. In the repo: **Settings → Pages → Build and deployment → Source**,
   set it to **Deploy from a branch**, branch **main**, folder **/ (root)**.
   Save.
3. GitHub gives you a URL like `https://<username>.github.io/<repo>/`
   within a minute or two. If you own the domain sangat.org, you can
   point it at this repo later via a custom domain in that same Pages
   settings screen — optional, the site works fine on the github.io
   URL as-is.

That's the entire setup. There's no Action to configure, no secret to
add, no separate build. Every time you push a change to `main`,
GitHub Pages redeploys automatically — usually within a minute.

## Is there an Excel file involved? No.

The earlier version of this site kept an `.xlsx` file in the repo and
used a GitHub Action to convert it to JSON on every push. That's gone.
`data/events.json` is now the single source of truth, and you (or
Claude, on your behalf) edit it directly as a JSON file. No
spreadsheet, no conversion step, nothing to keep in sync.

## How to ask Claude to update the site

You don't need Claude Code or any GitHub integration for this — plain
copy/paste works. In any Claude chat:

1. **Tell Claude what changed** — e.g. "add a new event: Sikh
   Coalition webinar on Dec 3, 2026, virtual, advocacy category" or
   "Lalkaar's date just got announced — Nov 14, 2026, update it." If
   Claude doesn't already have the current file in the conversation,
   paste in the current contents of `data/events.json` first (or
   attach the file) so it edits the real list, not a guess.
2. **Claude gives you back the full, updated `events.json`.** Ask it
   explicitly to output the complete file content, not just the
   changed lines, so you have something to paste as-is.
3. **Go to your GitHub repo → `data/events.json` → the pencil (edit)
   icon.** Select all, paste in what Claude gave you, and commit
   directly to `main` (the default option in GitHub's editor).
4. **GitHub Pages redeploys on its own** — no button to press, no
   Action to watch. Refresh the live site in ~30–60 seconds to confirm.

That's the whole loop: chat with Claude → paste the JSON it gives you
into GitHub's web editor → done. Nothing else touches the repo.

## The events.json schema

Each entry in the `events` array needs these fields. If you're asking
Claude to add or edit an event, this is exactly what it needs to fill in:

| Field | Format | Notes |
|---|---|---|
| `name` | string | Event title |
| `org` | string | Hosting organization |
| `category` | string | Free text — the site buckets it by keyword (see below) |
| `start_date` | `"YYYY-MM-DD"` or `"TBD"` | Cards with a non-date value show a "Date TBA" badge |
| `end_date` | `"YYYY-MM-DD"` or same as start | Only shown if different from `start_date` |
| `venue` | string | Not currently displayed on cards — kept for future use |
| `location` | string | City/state/country shown under the title |
| `format` | string | Include the word "Virtual" to trigger a Virtual badge |
| `status` | string | Free text — see status_bucket below for what drives the badge color |
| `source_url` | string or `""` | Powers the "Details" link; leave `""` if there isn't one yet |
| `notes` | string | Include the word "Instagram" to trigger a "Via Instagram only" badge |
| `status_bucket` | one of: `confirmed`, `tbd`, `recurring`, `not-found` | Controls badge color — pick the closest match |
| `slug` | string | Lowercase, hyphenated, unique — used internally, doesn't need to be pretty |

**Category keyword matching** (in `script.js`'s `categoryBucket()`):
containing "parade" → Parades & processions, "religious"/"samagam" →
Religious observance, "professional"/"tech" → Professional & tech,
"collegiate"/"youth" → Collegiate & youth, "advocacy" → Advocacy &
civil rights, "art"/"cultur"/"humanitarian"/"seva"/"media" → Arts,
culture & seva, anything else → Other. Worth telling Claude which
bucket you want if the event's natural category wording doesn't
obviously contain one of these words.

It's also worth asking Claude to update the top-level `generated_at`
field to the current date when it edits the file, since the site
displays it in the footer as "Calendar last rebuilt."

## Testing locally before you push

Browsers block `fetch()` against `file://` URLs, so open it through a
tiny local server rather than double-clicking `index.html`:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Known limitations

- **"Submit an event" is a `mailto:` link**, not a real public form.
  Someone else's submission doesn't get onto the site automatically —
  you'd still paste it into `events.json` yourself (or via Claude) the
  same way. A real intake form (Google Forms, Formspree, etc.) is a
  separate project if you want strangers to submit directly.
- **One page, client-side filtering** — there's no individual URL per
  event yet, so events aren't individually shareable or indexable by
  search engines. Ask if you want per-event pages added later.

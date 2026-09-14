# Atlas Drill

A map quiz for 58 countries and 18 bodies of water. One file, no build step to run
it, no network at runtime — open `index.html` and go.

Three modes:

- **Find it** — you're given a name, you click the place on the world map.
- **Name it** — a place is highlighted and framed, you type its name.
- **Mixed** — the two shuffled together.

## How it behaves

- **Wrong clicks tell you what you actually hit** — "That's Peru", "That's the Bay
  of Biscay". Every country and every named sea on the map is identifiable, not
  just the ones being quizzed.
- **Two tries, then the answer.** A miss comes back later in the round (up to
  twice) so you have to actually land it.
- **Spelling is forgiving but not sloppy.** `usa`, `UK`, `DRC`, `east sea` and
  `great lakes` all work; a one- or two-character typo works. `ireland` is never
  accepted for Iceland — a name belonging to some other place on the map is
  rejected outright.
- **Small places are hittable.** Singapore, Djibouti and Israel get an invisible
  click target that scales with zoom; Name it auto-frames whatever it highlights.
- Wheel/pinch to zoom, drag to pan, <kbd>Esc</kbd> to reset the view. A
  **Next place** button advances; <kbd>Enter</kbd> does the same on a keyboard.
  Once a question is settled, hovering the map names places — it turns into a
  reference between questions.
- Works on a phone: full-width tap targets, touch-worded prompts, and pinch-zoom.
- Per-place accuracy is kept in `localStorage`, which feeds the **My trouble
  spots** set.

## Layout

```
index.html          the whole app — open this
build/app.html      the source template (__MAPDATA__ is where the map goes)
build/mapdata.json  generated SVG paths + label points
build/build_data.py generates mapdata.json from Natural Earth
build/fetch.sh      downloads the Natural Earth source data
build/build.sh      app.html + mapdata.json -> index.html
build/test.mjs      headless-Chrome checks, desktop
build/test-touch.mjs  same, phone-shaped with touch emulation
```

Editing the app means editing `build/app.html`, then:

```sh
build/build.sh
```

Regenerating the map itself (only needed if you change which places are quizzed,
in the `QUIZ_COUNTRIES` / `QUIZ_WATER` tables):

```sh
build/fetch.sh && python3 build/build_data.py && build/build.sh
```

## Tests

```sh
npm i puppeteer-core
node build/test.mjs        # desktop
node build/test-touch.mjs  # iPhone-sized, touch events only
```

It walks all 76 places twice — clicking each one's label point in Find it, typing
each one's name in Name it — plus a set of confusable names that must be
rejected, and a round that is answered wrong every time and still has to end.
Set `CHROME_PATH` if Chrome isn't in the default macOS location.

## The map

Geometry is [Natural Earth](https://www.naturalearthdata.com/) 1:50m (public
domain), simplified with Douglas–Peucker and drawn in the Natural Earth
projection. Each quiz place also carries a *pole of inaccessibility* — the
interior point farthest from any edge — used to place click targets, because an
ordinary centroid falls outside concave shapes and would put Norway's marker in
Sweden.

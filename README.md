# Atlas Drill

Two study quizzes in one file: a world map and a DNA replication fork. No build
step to run it, no network at runtime — open `index.html` and go.

**Atlas Drill** is a map quiz for 58 countries, 18 bodies of water, and the
religions of 22 world regions. **DNA Lab** is a separate quiz over a
replication-fork diagram. The two are switched between next to the title and
share nothing but the shell — the clock, pause, scoring and results card work
the same in both.

Four modes:

- **Find it** — you're given a name, you click the place on the world map.
- **Name it** — a place is highlighted and framed, you type its name.
- **Mixed** — the two shuffled together.
- **Religions** — the majority religion of a highlighted country, and the
  hearth of each religion. See below.

## How it behaves

- **Wrong clicks tell you what you actually hit** — "That's Peru", "That's the Bay
  of Biscay". Every country and every named sea on the map is identifiable, not
  just the ones being quizzed.
- **It's timed.** A stopwatch runs for the round and your best time per
  mode-and-set is kept. Missing costs you time on its own, since a missed place
  goes back in the queue — but a round with a *skip* in it is timed and never
  recorded, so you can't skip your way to a record.
- **Pause is a real pause.** The clock stops, the map is covered and the place
  name is masked, so a pause buys you a rest and no thinking time. Resuming
  always deals a *different* place; the one you were on goes back in the deck to
  be asked later. Paused seconds don't count, and pausing doesn't disqualify a
  best time. `P` pauses, `Esc` resumes.
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

## Updates and offline

GitHub Pages serves `index.html` with `cache-control: max-age=600` and offers no
way to change that, so for ten minutes after a deploy a refresh could still show
the old page. `sw.js` fixes it from the page side: a service worker that fetches
the document network-first with the HTTP cache bypassed, so **one refresh always
lands on the current build**. Its cached copy is only a fallback for a dead
network — which also means the quiz keeps working offline once opened.

It registers only over http/https; opening `index.html` straight off disk skips
it entirely. Note the worker has to be installed by one visit before it can help,
so the very first upgrade onto a service-worker build still needs a hard refresh.

## Religions

Covers the nine religions on the 3.2/3.7 distribution map: Roman Catholic,
Protestant and Eastern Orthodox Christianity, Sunni and Shia Islam, Buddhism,
Sikhism, Hinduism and Judaism.

Three question types, answered from nine labelled chips or by clicking:

- **Regions** (the default) — the 22 regions from the assignment's region map,
  from Canada and Brazil through Siberia, the Sahel and the three Pacific
  groups. The whole region lights up and you name its religion.
- **Hearths** — click where a religion began.
- **Country by country** — the harder set, 148 countries one at a time.

**Split regions accept more than one answer.** Western Europe is Catholic in
the south and Protestant across the north, so both count, and the feedback says
which is primary and why. Marking a true answer wrong teaches the wrong thing.
Nine of the 22 regions are split this way.

**Majority means the largest group within that place**, not where a religion's
adherents mostly live: Indonesia is Sunni even though most Buddhists live
elsewhere in Asia.

`build/religions.py` holds the data and the reasoning — 22 regions with their
member countries, and 148 countries individually. Every country belongs to at
most one region and the build refuses to run if a name doesn't exist on the map
or lands in two regions. 148 countries are
assigned; 25 are deliberately left out and each one says why (Germany's
Catholic/Protestant split, Lebanon, Oman's Ibadi majority, Nigeria, South
Korea…). A quiz that drills a contested answer is worse than a shorter quiz.
Four entries follow the simplified classroom map rather than census data and
are marked `simplified` in the source — China, Japan, Vietnam and Taiwan as
Buddhist.

**On colour:** nine categories is far past the point where fills can be told
apart, especially for colourblind readers and especially on small countries —
so religion identity is carried by the chip label, never by colour alone. When
a question is settled the map shows *one* religion's countries at a time, which
is the only way that many categories stay readable.

## The one-time notes

Two callouts, each pinned under the control it is about: a bio note under the
**DNA Lab** button, then one under the **Religions** tab. They queue rather
than stack — dismissing one opens the next, the idea box comes last, and the
clock stays frozen until all of them are closed.

Each is positioned from its anchor's live bounding box rather than a fixed
offset, so the arrow keeps pointing at the right control when the header wraps
on a phone, and the card clamps to the window instead of running off the edge.
Seen-state is per note (`atlasdrill.bionote.v1`, `atlasdrill.relnote.v1`), so
dismissing one and leaving still shows the other next visit.

Adding another is a line in the `NOTICES` array: a storage key, the id of the
control to point at, and the text.

## The idea box

A one-question box asking visitors what else to build. It appears once on a
first visit, the X dismisses it without answering (leaving a small corner tab to
reopen), and it never asks again once answered. The clock is frozen while it's
up, so being asked a question doesn't cost anyone a best time.

Answers are POSTed to an Apps Script web app bound to a Google Sheet, live at
the `/exec` URL in `IDEA.URL`. To point it at a different sheet:

1. In the Google Sheet that should collect answers: **Extensions > Apps Script**.
2. Paste in `build/Code.gs`, Save.
3. **Deploy > New deployment > Web app**, Execute as **Me**, Who has access
   **Anyone**. Copy the `/exec` URL.
4. Put that URL in `IDEA.URL` near the bottom of `build/app.html`, then
   `build/build.sh`.

Answers land in an `Ideas` tab with **When / Name / Idea** columns, created on
first submission. The name box is optional — an unnamed answer still sends and
lands with that column blank. Nothing else is collected.

`migrate_()` in Code.gs rewrites sheets written under the older
When / Idea / Page shape into the current one, so the columns can change
without anyone fixing rows by hand. It is a no-op once the sheet is current. While `IDEA.URL` is empty the box never appears, so an unconfigured
build shows visitors nothing rather than a form that goes nowhere.

The body is JSON sent as `text/plain`, which dodges a CORS preflight that Apps
Script wouldn't answer. The reply is opaque, so the page treats "sent without
throwing" as success.

## DNA Lab

A hand-drawn SVG of a replication fork, in place of the map. Eighteen items are
quizzable in the same Find it / Name it / Mixed modes:

- **On the fork** — DNA polymerase, helicase, primase, ligase, nucleotide, and
  the leading and lagging strands.
- **In the inset** — a single nucleotide enlarged below the fork, with its
  three parts: phosphate group, sugar and nitrogenous base. A dashed leader
  ties it to a free nucleotide at the fork so it reads as a zoom rather than a
  second picture. This is where *what DNA is made of* lives, as against *what
  is happening*, and it answers the sides-versus-centre question directly:
  phosphate and sugar make the sides, the base makes the centre.
- **Four terms with no picture** — enzyme, mitosis, meiosis, chromosome. These
  cannot be pointed at, so **Find it leaves them out** and Name it asks them
  from their definition instead. Mixed never deals one as a Find it question.
- **The four bases** — A, T, C and G, asked one way only: here is a base, what
  does it pair with? A single letter is a poor thing to be asked to *name*, so
  they are excluded from Find it and Name it, and Mixed always deals them as
  pairing questions. `T`, `thymine` and `it pairs with t` all answer `A`.

In the picture modes:
click the part you're named, or name the part that's highlighted. Clicking the
wrong one says which part you hit. The strands are clicked anywhere along their
ladder, not on a thin line.

**5′ and 3′ ends are marked** on every strand. They are the reason one new
strand runs continuously and the other has to be built backwards, so leaving
them off made the leading/lagging distinction something to take on faith. A
test checks the marks are antiparallel, since getting them backwards would
teach the opposite of the truth and look perfectly fine.

**No other words are on the drawing.** Every name on it is something to be quizzed,
so printing any of them would be printing an answer. A part labels itself only
once its question is settled.

**Functions** is a third mode, alongside Find it and Name it. The part is lit
up *and* named; what's missing is the job, typed in your own words. Grading
looks for ideas rather than a phrase: ligase wants a joining verb **and**
something being joined, so "glues the fragments together", "seals the gap" and
"glues dna" all pass while "seals" or "glues" on its own does not.

An inline suggestion completes as you type, like a search box — the first
<kbd>Enter</kbd> takes the grey text, a second one answers with it.
**The suggestion pool is shared across all seven parts on purpose**: a pool
holding only the current part's answer would hand it over on the first
keystroke. Pooled, typing "seals" finishes ligase's line and "builds" finishes
polymerase's, so it saves typing without saving thinking. The description is
also withheld in this mode — it *is* the answer here.

**Each part is described as it is asked** (outside Functions), in a line under the word at the
bottom of the screen — it is how the part is taught, not a reward for already
knowing it. In Name it the word is hidden, so the description becomes the clue:
none of the seven name the part they describe, and a test asserts that, since
a careless rewording would hand over the answer.

`build/fork_svg.py` generates the drawing — the ~120 ladder rungs are not worth
hand-writing, and the helix is easier to get right as a loop than as path data.

It follows the classroom worksheet it is quizzing: a ladder duplex with wound
tails, the fork opening left, and **a distinct silhouette per part** — a
rectangular clamp for DNA polymerase, a wedge for helicase, a small upright
oval for ligase sitting in the nick it seals, a tilted oval for primase, and a
ball on a stick for a free nucleotide. No two parts share a shape, because
shape is what is being learnt; an earlier version drew four identical grey
ellipses and taught positions instead.

The mechanism is in the drawing too: one continuous leading strand against
three separate lagging fragments, unpaired base stubs where the templates have
just opened, and free nucleotides waiting at the fork. Structure is drawn in
`currentColor` so it themes with the page; the accent is reserved for whichever
part is under question.

## Analytics

A Google Analytics 4 tag (`G-9RE1BS622W`) sits at the top of `build/app.html`.
It loads only from a real web host — opening `index.html` off disk or serving it
locally is deliberately not counted, so working on the page doesn't show up as
traffic. If the script is blocked by an ad blocker or the page is offline, the
tag quietly does nothing and the quiz is unaffected.

To point it at a different property, change the `ID` constant in that script and
rebuild.

## Layout

```
index.html          the whole app — open this
sw.js               keeps a plain refresh on the current build (see above)
build/app.html      the source template (__MAPDATA__ is where the map goes)
build/mapdata.json  generated SVG paths + label points
build/build_data.py generates mapdata.json from Natural Earth
build/fetch.sh      downloads the Natural Earth source data
build/build.sh      app.html + mapdata.json -> index.html
build/test.mjs      headless-Chrome checks, desktop
build/test-touch.mjs  same, phone-shaped with touch emulation
build/test-refresh.mjs  proves one refresh beats a max-age=600 cache
build/test-timer.mjs  stopwatch, best times, and the skip loophole
build/test-pause.mjs  pause: frozen clock, covered map, fresh place on resume
build/test-analytics.mjs  tag fires on the real host only, never locally
build/test-idea.mjs   the idea box, against a stand-in endpoint
build/test-migrate.mjs  runs Code.gs in node against a fake Sheets API
build/test-religion.mjs  the religions tab, every country key checked
build/test-notice.mjs  the Religions notice, its anchor and its handoff
build/test-dna.mjs    DNA Lab: the switch, the diagram, clicking and typing
build/test-functions.mjs  Functions mode, its grading and its typeahead
build/fork_svg.py     generates the replication-fork drawing
build/religions.py    majority-religion data, hearths, and what's omitted
build/Code.gs         Apps Script to paste into the answers Sheet
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
node build/test-refresh.mjs # cache-busting + offline, over a local server
node build/test-timer.mjs  # stopwatch and personal bests
node build/test-pause.mjs  # pause behaviour
node build/test-analytics.mjs # analytics tag, with hits to Google blocked
node build/test-idea.mjs   # idea box, posting to a local stand-in
node build/test-migrate.mjs # Code.gs column migration, no browser needed
node build/test-religion.mjs # religions tab
node build/test-notice.mjs # the one-time notes
node build/test-signup.mjs # the update list
node build/test-dna.mjs    # DNA Lab
node build/test-functions.mjs # Functions mode
```

That's 495 checks in total. The first suite walks all 76 places twice — clicking each one's label point in Find it, typing
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

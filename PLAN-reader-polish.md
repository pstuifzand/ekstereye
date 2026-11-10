# Plan: reader polish and edge hardening (phase 2)

Status: draft, not started. Successor to `PLAN-reader-hardening.md`, which is landed
(HEAD `20a3155`, deployed to `reader.p83.nl`).
Repo: `~/work/ekstereye` (Vue 2.7 + Vuex 3 + Vite 7, bulma), plus `docker/nginx.conf`.
Scope: client and the image's own nginx config. No changes to the Ekster server.

## Where we are

Verified against the live site and the tree on 2026-11-10:

- `reader.p83.nl` answers 200; the running container's
  `org.opencontainers.image.revision` is `20a3155` (= HEAD) and the served
  `assets/index-BVPjcdQ4.js` matches the local `dist`. Nothing is drifting.
- `npm run lint` and `npm run build` are clean.
- The Ekster server (`~/work/ekster`, `pkg/microsub/protocol.go:104`,
  `pkg/server/microsub.go:251-270`) sends `_is_read` on timeline items and accepts
  both `entry` and `entry[]` on `mark_read`. So read state and batched mark-read are
  honest, not client-side fiction. Do not "fix" them again.
- Gaps that survived the hardening work are listed below, each one checked in the code.

Do not re-open the decisions already taken in the previous plan: no `iframe`
allow-list, no `localStorage` read-state cache, no `sendBeacon`, no `-webkit-line-clamp`
rewrite.

## Goal

Make the reader cost less to load, stop the small set of bugs that still make it feel
unreliable, and put a test floor under the modules that carry the most risk — before
touching anything as large as a framework migration.

## Landing order

`1 → 2 → 3a → 3b → 3c → 3d → 4 → 5`. One commit per step, `Problem: …` subject, one
review, one merge each. Phase 1 is first because it is one file and it is the single
biggest win. Phase 4 (tests) lands before Phase 5, which is the only phase that
restructures rendering.

Deployment is not optional per phase: `master` is the deploy trigger (CI → Docker →
`ghcr.io/pstuifzand/ekstereye:master`), and the container on `p83.nl` never pulls by
itself. Follow the ship recipe in the `ekstereye-reader-verification` skill: rebuild
from a clean tree, compare `assets/index-*.js` with `dist/index.html`, pull and
recreate `reader_web_1`, then compare the container revision and the live hash.

---

### Phase 1 — Compress and guard the edge (`docker/nginx.conf`) — LANDED in `8a67074`

Landed 2026-11-10 and deployed. Live measurements after the deploy: JS 482,670 →
175,694 bytes, CSS 216,997 → 30,800, all four headers present, app mounts under the
CSP in Chromium with zero console entries (`style-src 'self'` held, no
`'unsafe-inline'` fallback needed).

**Problem.** The image's nginx has no `gzip` at all. Measured with
`curl -H 'Accept-Encoding: gzip, br'` against the live host: `index-BVPjcdQ4.js` is
served as 482,670 raw bytes and `index-58ByuI6p.css` as 216,997, while Vite reports
gzip sizes of 177 kB and 30 kB. Every cold load transfers ~700 kB where ~207 kB would
do. The same file also sends no security headers beyond the proxy's HSTS — no CSP,
no `nosniff`, no referrer policy — while the IndieAuth token sits in `localStorage`
and feed HTML is injected into that origin.

**Steps.**

1. `gzip on;` with `gzip_vary on;`, `gzip_comp_level 5;`, `gzip_min_length 256;`.
2. `gzip_proxied any;` — requests arrive through the nginx-proxy container and are
   therefore "proxied"; without this line nginx silently declines to compress them and
   the change looks applied but does nothing.
3. `gzip_types text/html text/css application/javascript application/json
   image/svg+xml text/plain application/manifest+json;` (`text/html` is always
   compressed and need not be listed, but listing it is harmless).
4. Security headers on `location /` and `location = /index.html` (`add_header` does not
   inherit into a location that declares its own, so set them where they must apply):
   - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self';
     img-src 'self' https: data:; font-src 'self' data:; connect-src 'self' https:;
     frame-ancestors 'none'; base-uri 'none'; form-action 'self'`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
5. `connect-src https:` is deliberate: `microsubEndpoint` comes from the user's site's
   `rel=microsub` and is not necessarily this origin. `img-src https:` is required for
   avatars and feed photos. `style-src 'self'` is the risky one — Vue keeps scoped
   styles in the CSS file, but if the login or a Bulma path injects a style attribute,
   fall back to `style-src 'self' 'unsafe-inline'` and record why in the commit.

**Acceptance.**

- `curl -sSI -H 'Accept-Encoding: gzip' https://reader.p83.nl/assets/index-*.js` shows
  `content-encoding: gzip` and `vary: Accept-Encoding`; `--compressed` download is
  under 200 kB for JS and under 40 kB for CSS.
- The four headers appear on `/` and on `/assets/*`.
- Sign-in flow still reaches the IndieAuth authorization page and `/callback` still
  completes (this is the path a wrong CSP breaks first).
- Live hash equals `dist/index.html` and the container revision equals the pushed SHA.

**Risks.** A too-strict CSP white-screens the app on first load; this is why the CSP
step is separate from the gzip step and verified in the login flow, not just on the
timeline. Revert is one commit plus one redeploy.

---

### Phase 2 — Stop shipping 73 kB of lodash for four functions — LANDED in `aee2c00` + `aac11f5`

Landed 2026-11-10. lodash is out (`aee2c00`, JS 482.67 → 408.12 kB, gzip 177.14 →
149.50) and PurgeCSS is in (`aac11f5`, CSS 217.00 → 48.02 kB, gzip 30.21 → 9.01).
Live after the deploy: 148,182 bytes of gzip JS and 9,161 of CSS, hashes matching
`dist/index.html`. The purge was proven by diffing 23 computed properties on 19
elements across both themes, the debug modal, the login screen and four other
modals against an unpurged build: 0 differences.

**Problem.** `src/store.js:4` imports `_` from `"lodash"` and the tree uses exactly
four methods: `_.find` (5×), `_.some` (2×), `_.takeRight` (1×), `_.filter` (1×).
Vite cannot tree-shake the CommonJS build, so the full library (73 kB minified) lands
in the bundle. Separately, `src/main.js:6` imports `bulma/bulma.sass` whole, producing
the 217 kB stylesheet for the ~130 distinct class names the templates actually use.

**Steps.**

1. Replace the four lodash calls with `Array.prototype.find` / `.filter` / `.some` and
   a `slice(-n)` for `takeRight`; delete the import. The call sites are all in
   `store.js` (`newChannels`, `newTimeline`, `newItem in channel`, `createEventSource`,
   `markRead`). No component imports lodash.
2. Add `@fullhuman/postcss-purgecss` to the Vite CSS pipeline with a content glob over
   `index.html` and `src/**/*.{vue,js}`, a safelist for classes built at runtime
   (`is-active`, `is-loading`, `theme-dark`, `channels-open`, the `kind-*` and
   `has-*` families, `timeline-*`, `mark-all-read`, `entry-*`) and `keyframes: true`.
   Several classes are string-concatenated in computed properties, so the safelist has
   to be generous on the first pass and pruned by looking at the dark theme and the
   modals, not by trusting the build.
3. Re-check the dark theme, all five modals, the paging footer and the toast stack after
   both changes: purge and theme regressions are invisible in a green build.

**Acceptance.** `npm run build` reports JS gzip ≤ 155 kB (from 177 kB) and CSS ≤ 40 kB
raw (from 217 kB); the live site renders identically in both themes at 375 px and
1280 px; no console 404s for CSS.

**Risks.** PurgeCSS strips a class that only exists in a computed object or a feed's own
HTML. Feed HTML is sanitized and styled by `.html-body` tag selectors, so tag-level
rules are safe; class-level rules inside feed content are not worth preserving.

---

### Phase 3 — Bugs that survive a reload — ALL LANDED

Landed 2026-11-10: 3a `7dbab6a`, 3b `fd6a790`, 3c `afa53fc`, 3d `be80ebf`, 3e `2d4cc4f`.
Each was reproduced against the mock first and re-checked after: 11 cards instead of 10
with no `Invalid URL` errors, the paragraph under a slow image moves 0 px instead of 297,
all four dialogs trap Tab and close on Escape with focus returned, a 500 on feed search
becomes a toast, and Retry renders the timeline without a reload.

Each step is small, independently revertable, and has one reproduction.

#### 3a — A bad author URL crashes the card (`src/components/Entry.vue:512-522`)

`outside_author_name` calls `new URL(this.item.author.url).hostname` unguarded;
`author_name` (`:532-546`) does guard with `try/catch`, so the same data crashes one
computed and not the other. `new URL('foo')` throws, and a throw inside a computed
aborts the render of that card (a like/repost whose referenced author has a relative
URL). Wrap it the way `author_name` does and fall back to the raw string.

**Acceptance.** A fixture item with `author: {url: 'not a url'}` and `like-of` set
renders a card with the raw string instead of an empty timeline slot.

#### 3b — Add-feed has no failure path (`src/components/FeedFollower.vue:99,127`)

Both `fetch` calls bypass `src/api.js`: a 401 never clears the session, and neither has
a `.catch`, so a network error or a non-JSON answer leaves `loading = true` and the
spinner runs until the modal is closed. Route both through `request()` (it already
attaches the token, parses JSON, and fires the unauthorized handler), keep the existing
`loading` toggles, and surface failures through the store's `notify` toast instead of a
silent no-op. Also key the results at `:30` by feed URL rather than the array index.

**Acceptance.** With the mock answering 500 on `action=search`, the spinner stops, a
toast says why, and the modal stays open for a retry. With 401, the login modal appears.

#### 3c — Escape and focus in modals (`src/App.vue:113-119`)

`Escape` closes only Search and the channel creator. `DebugModal`, `FeedsModal` and
`FeedFollower` ignore it, and none of them traps focus or marks the background inert,
so Tab walks into the timeline behind an open dialog. Give each modal the same three
things: an `Escape` listener that only fires while it is open, focus moved into the
dialog on open and returned to the triggering control on close, and
`aria-modal="true"` plus `role="dialog"` on the card. Keep the handler registration
inside the component so an unopened modal never swallows the key.

**Acceptance.** In Chromium: `Escape` closes each of the three modals; Tab from the last
control in the dialog cycles back to the first; after closing, focus is on the button
that opened it; `j`/`k` do nothing while a modal is open.

#### 3d — Feed images still shift the page (`src/sanitize.js:85-101`)

The sanitizer strips `width` and `height` from `img`. Those attributes are the only
intrinsic-size hint the browser gets for a remote image, so every article image
reflows the text under it as it loads — the opposite of the layout-stability goal in
the previous plan. Keep `width`/`height` when they are plain integers under a sane
bound, drop the rest, and add `aspect-ratio` in CSS for the header image and article
body images where the feed gives no dimensions.

**Acceptance.** A fixture article with a deliberately slow image shows unchanged text
position before and after the image loads (compare
`document.querySelector('.html-body').getBoundingClientRect().top` at 0 ms and after
`load`); the `onerror`/`<script>`/`javascript:` fixtures still render inert.

#### 3e — The error banner cannot retry (`src/App.vue:30-33`)

The plan asked for a dismissible banner with Retry; only dismiss exists. A failed
timeline fetch currently means reloading the page. Store the failed action alongside
the message (channel uid + append flag) and put a Retry button next to the dismiss
that redispatches it; clear the error on success.

**Acceptance.** Force a timeline 500 in the mock, click Retry with the endpoint
restored, and the entries appear without a page reload.

---

### Phase 4 — A test floor (new, `vitest` + `jsdom`)

**Problem.** Verification today is `lint` + `build` + manual Chromium. That is why a
stuck spinner and an unguarded `new URL` survived several rounds of review.

**Steps.**

1. Add `vitest`, `jsdom` and `@vue/test-utils` (Vue 2 build) as dev dependencies and
   `"test": "vitest run"` / `"test:watch"`.
2. Unit-test the pure modules first — they need no network and no store:
   - `sanitize.js`: script, `onerror`, `javascript:` href, iframe, inline style,
     `<svg>`, a `data:image/png` (kept), a `data:text/html` (dropped), relative URL
     resolution against `base`, and the `width`/`height` rule from 3d.
   - `entry-kind.js`: article by name, article by length, media by `photo`, status,
     and the `content` as string / `{text}` / `{html}` shapes.
   - `relative-time.js`: past vs future direction (`now.from(past)` is "in…"; get this
     backwards and every timestamp in the app is wrong), the 7-day boundary, and the
     absolute title.
   - `markRead.js`: batching (3 enqueues → 1 send), `MAX_BATCH` splitting, dedupe of
     the same uid, one retry then drop, and a `keepalive` flush.
3. Store tests with a stubbed `request`: `newTimeline` keeps a uid-only channel and
   re-points it in `newChannels`, `appendTimeline` dedupes by `_id` and stacks the
   previous page, `previousTimelinePage` trims back, `sessionExpired` closes the
   EventSource and clears the token.
4. Wire `npm test` into the CI workflow next to lint and build.
5. Keep the mock-server Chromium recipe as the behavioural layer. The tests are a
   floor under the modules, not a replacement for the paging/mark-read/visual checks.

**Acceptance.** `npm test` runs green in CI on a clean checkout; deleting the guard from
3a or the dedupe in `appendTimeline` turns a test red.

---

### Phase 5 — Reader ergonomics and unbounded DOM

Only after 1–4 land. This phase changes rendering behaviour, so it needs the browser
verification recipe, not just tests.

1. **Cap the rendered window.** `appendTimeline` (`src/store.js:84-96`) grows the list
   without limit; a long scroll on a busy channel builds thousands of cards, each with
   sanitized feed HTML. Keep the page stack for Newer, but cap the rendered list at
   ~300 entries: when appending past the cap, drop from the front and keep a "you are
   N entries in" affordance that scrolls back to the newest page. Measure first — log
   node count at 10 pages on a real channel and put the number in the commit message.
2. **Per-channel view state.** Remember scroll position and filter per channel across a
   switch (`Timeline.vue:62-74` currently resets both on the `channel` watcher). Do not
   put it in the store's `timeline` object; a map keyed by uid in the view is enough.
3. **The tab is anonymous.** Nothing sets `document.title`; the tab says "Ekster Reader"
   in every channel. Set `"<channel name> (<unread>) — Ekster"` and restore on unmount.
4. **`u` toggles unread.** `m` only marks read (`Timeline.vue:245-251`), and a
   mis-keyed `m` is unrecoverable without a reload. The server has no unmark endpoint
   worth relying on, so toggle the in-memory `_is_read` and do not enqueue.
5. **Shortcut discoverability.** `j k o m r l s g` exist and are documented nowhere a
   reader can see. Add a `?` overlay listing them, and put it behind the same modal
   machinery as 3c so the focus rules do not diverge.
6. **`ShortTimeline` is `position: fixed`** (`:41`) with no breakpoint, so it overlays
   the third column on narrow screens. Make it part of the column flow below 1024 px.

**Acceptance.** On the real account: switching channels restores position and filter;
the tab title tracks the channel and clears on Home; `?` opens and closes with
`Escape`; a 10-page scroll keeps the DOM under the cap with no duplicate `_id` and no
scroll jump.

---

### Phase 6 — Vue 3 (separate plan, not this one)

Vue 2.7 reached end of life in December 2023 and receives no security fixes. The reader
is 16 components, one store, and a small router, so this is a weekend of mechanical work
(`createApp`, `defineComponent`, `v-model` → `modelValue`, `<template v-slot>`,
Pinia or a thin store, `flutter`-free CSS unchanged). It is not in this plan because it
should not share a review with behaviour changes. Write it once phases 1–5 are green
and the tests from Phase 4 exist to catch the migration's mistakes.

---

## Verification protocol (every phase)

1. `npm run lint`, `npm run build`, `npm test` all green from a clean tree.
2. Live Chromium against the mock Microsub server for behaviour (the recipe in
   `ekstereye-reader-verification`): a hostile fixture item, three paging steps with
   unchanged `scrollY` and no duplicate `_id`, a batched mark-read proven in the
   request log, and both themes at two widths.
3. Screenshots for anything visual, plus the numbers behind any claim about size,
   density, or count.
4. Deploy and compare the image revision and live `assets/index-*.js` hash with `dist`.

## Risks and rollback

- Phase 1 is a container config change shipped inside the image: a bad CSP white-screens
  the app until the previous image is redeployed. Keep the previous `:sha-` tag handy.
- Phase 2's purge step is the one change that can silently break the dark theme and the
  modals; it is verified visually before merge, not by the build.
- Phase 3d changes what the sanitizer keeps for every entry — the security fixtures from
  Phase 4 must exist first if 3d is done after Phase 4, which is the better order.
- Phase 5 caps the list, which can hide entries a reader expected to scroll back to;
  the page stack and the "N entries in" affordance are the escape hatch.

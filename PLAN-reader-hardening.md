# Plan: harden the Ekster reader (v2 — review incorporated)

Status: reviewed by `openai/gpt-6.1-terra` (see `REVIEW-plan.md`); v2 applies its six
required changes and the landing order it proposed.
Repo: `~/work/ekstereye` (Vue 2.7 + Vuex 3 + Vite 7, bulma)
Scope: client only. No changes to the Ekster server, no new backend endpoints.

## Goal

Fix the two problems that actually hurt: feed HTML is injected unsanitized, and scrolling
the timeline fires one mark-read POST per entry from an unthrottled scroll handler. Then
clear the correctness bugs that make the reader feel unreliable. Durability/cosmetic work
comes last.

Non-goals: migrating off Vue 2, redesigning the layout, offline support.

## Landing order

`3a → 1 → 2 → 5 → 4 → 3b → 6`. One branch, one review, one squash-merged PR per phase.
3a lands first because it is tiny and de-risks Phase 2's acceptance tests.

## Decisions taken up front (from the review)

- **No iframe allow-list.** Strip every `iframe`; render a poster image plus a "watch on
  <host>" link instead. An embed allow-list means per-host logic, sandbox attributes and
  feed-controlled tracking frames in a text reader.
- **No `localStorage` read-state cache.** In-memory `_is_read` for the session; unread
  badges stay server-authoritative. Revisit only if reload-outline-loss is actually
  reported.
- **No `sendBeacon`.** Microsub auth is a bearer header, which beacons cannot send, and
  putting the token in a query string is worse. Final flush uses
  `fetch(..., { keepalive: true })`.

---

### Phase 3a — Small correctness fixes (land first)

1. Keys: `item.id` → `item._id` in `Timeline.vue:3` and `SearchPopup.vue`;
   `ShortTimeline.vue:3` keys on the array index of a `takeRight(10)` window, so rows
   rebind on every SSE item — key on `_id`.
2. Normalize at ingest: in the `newTimeline` mutation, `Vue.set(item, '_is_read',
   Boolean(item._is_read))` for every item. `_is_read` is absent from Microsub JSON, so
   the current `item._is_read = true` writes a non-reactive property in Vue 2 and the
   `.unread` outline never recomputes.
3. `fetchTimeline` (and `fetchChannels`) `return` their fetch promise. Today `Home.vue`
   `.then()` callbacks fire immediately and `scrollTo(0)` runs before items land.
4. SSE dedupe in `new item`: skip if `state.timeline.items` / `globalTimeline.items`
   already contain that `_id`.
5. Timestamps: `niceTime` reads `this.item.published` (Entry.vue:247) while the link
   points at `currentItem.url` — so a like/repost shows the wrapper's age next to the
   origin's link. Make both refer to `currentItem`, drop the dead `refNiceTime`, and put
   the absolute local time in a `title`. Replace `v-html="niceTime"` (Entry.vue:26) with
   `{{ }}`.
6. One global 60 s tick so "3 minutes ago" refreshes.

Acceptance: lint + build clean; a like of an old post shows the origin's age; clicking
"Read more" doesn't double-mark-read.

---

### Phase 1 — Sanitize feed content (security)

Problem: `main_content` (Entry.vue:299-318) returns `content.html` into `v-html`
(Entry.vue:30) and returns `content.text` into the same sink. Any subscribed feed can run
script in the reader's origin, where the IndieAuth token sits in `localStorage`.

1. Add `dompurify`.
2. `src/sanitize.js`: allow-list tags only; forbid `style`, `iframe`, `svg`, `math`,
   `form`, `object`, `embed`, and all `on*`; force `rel="nofollow noopener noreferrer"`
   + `target="_blank"` on links; reject `javascript:`/non-image `data:` URLs.
3. Split the computed: `main_content_html` (sanitized) rendered via `v-html`, and
   `main_content_text` rendered via `{{ }}`. Handle the third branch — `main_content`
   can return a raw object (Entry.vue:307, :316), which currently renders
   `[object Object]`; stringify or fall back to the URL.
4. Keep a scoped `.html-body` rule (`img { max-width: 100%; height: auto }`).

Acceptance: an entry with `<p>ok</p><img src=x onerror="window.__xss=1"><script>…</script>`
renders "ok" and nothing else, `window.__xss` stays undefined; `content.text` = `a & b < c`
renders verbatim. Fixture via a dev-only route or the Debug modal, never committed into a
timeline.

---

### Phase 2 — Mark-read: throttle, batch, one keepalive flush

Problem: `Timeline.handleScroll` (Timeline.vue:63-83) loops `$children` calling
`getBoundingClientRect()` per child and dispatches one POST per item; the bottom test
(:65) adds `documentElement.offsetHeight`, so it is unreachable.

1. `src/markRead.js`: a `Set` of uids per channel; `flush()` posts one batched request per
   channel (`entry[]=…`, already built in store.js:206-208); timer flush at 2000 ms while
   non-empty; final flush on `visibilitychange: hidden` and `beforeunload` via
   `fetch(..., { keepalive: true })`. One retry, then `console.warn` and drop.
2. Gate: confirm the live Microsub endpoint accepts the bracketed `entry[]=` form. That is
   a server quirk visible only in client code — verify with a real request before merging,
   and fall back to repeated `entry=…` params if it does not.
3. Replace the per-child rect loop with an rAF-throttled, early-exiting pass: entries are
   in feed order, so walk from the first unread entry and stop at the first one still
   visible. An `IntersectionObserver` was tried and dropped — on a jump (fast scroll,
   "end" key, programmatic scroll) entries go from *below* the viewport to *above* it
   without ever intersecting, so no threshold crossing fires and they stay unread.
4. A `<div ref="sentinel">` after the list owns "bottom reached"; strip the
   mark-everything-read semantics out of `bottomReached` (store.js:302-321).
5. Remove the blue outline locally on enqueue (reactive via Phase 3a's normalization). No
   optimistic `channel.unread` decrement — `new item in channel` (store.js:112-118) writes
   an absolute value and would overwrite it; let the badge settle from the server, or
   recompute after the batch resolves.
6. `.stop` on the Read-more button and other in-card controls so they don't double-dispatch
   `markRead`.

Acceptance: scrolling a 30-item timeline produces ≤ 2 mark-read requests with multiple
ids each; the scroll handler no longer shows recurring layout work in a profile; rapid
scroll-then-close still flushes (verified in the network panel); the outline clears on
enqueue.

---

### Phase 5 — Network robustness, images, auth chrome

1. `src/api.js` wrapping all eight bare `fetch` calls in store.js: inject the bearer token,
   parse JSON, throw typed errors, expose per-action loading flags, surface failures as a
   dismissible banner with Retry instead of an empty timeline.
2. 401 path: clear `login_data`, `logged_in = false`, **close the EventSource**
   (store.js:74-82), reopen the login modal. Add a real `logout`/`reset` mutation — none
   exists today.
3. `LoginModal` watches `active` (it copies the prop into `show` once at mount,
   LoginModal.vue:80-81), and `Home` re-fetches after a successful sign-in rather than
   only at `mounted` (Home.vue:137-142).
4. Images: avatar fallback when `author_photo` is empty or errors; `loading="lazy"`,
   `decoding="async"`, intrinsic size or `aspect-ratio` to kill layout shift; thumbnails
   where the feed provides one; gallery from `photo_rest` so the header image isn't
   duplicated.

Acceptance: corrupted token → auth error + working Sign in, not "No items in this
timeline"; sign-out returns to the login modal; a reload after sign-in populates the
timeline without a route change.

---

### Phase 4 — Non-destructive pagination

1. `fetchTimeline` gains `{ append: true }`: merge after existing items, update
   `paging.after`, keep a page stack so "Newer" restores the previous page object without
   refetching.
2. Sentinel-triggered append when `paging.after` exists and no request is in flight.
3. Scroll position preserved on append; `scrollTo(0)` only on channel switch.
4. Read state stays in memory (see decisions); badge remains server truth.

Acceptance: reload is honest about unread; deep scroll keeps position; no duplicates
across pages.

---

### Phase 3b — Entry presentation

1. Read-more: keep the `max-height` clamp; the actual bug is that `hasHiddenContent` is
   measured once at mount (Entry.vue:228-236, duplicated :391-406). Add a `ResizeObserver`
   on the content node so late-loading images trigger re-measurement, plus a "Show less"
   collapse.
2. `photo_all` → `photo_rest` for the gallery, with the selected thumb marked active.

Skip the `-webkit-line-clamp` rewrite — it needs `display: -webkit-box` and fights the
existing `.open` class for no user-visible gain.

---

### Phase 6 — Reader ergonomics (only if 1–5 land cleanly)

`j/k` next/prev, `o` open, `m` toggle read, `r` reply, `l` like, `s` search, `g` channels,
`Esc` closes modals. Card actions become real `<button>`/`<a href>` elements with a
visible focus ring.

## Verification protocol (every phase)

1. `npm run lint` and `npm run build` pass; no new build warnings.
2. `npm run dev` + live Chromium against the real Microsub endpoint for the behaviour
   checks above. Nothing is "done" on code reading alone.
3. Hostile/odd feed items come from a dev-only fixture route or the Debug modal.
4. Commit subject style stays `Problem: …`, matching history.

## Risks and rollback

- Sanitizer and mark-read batching touch every entry's render path, but each lives in a
  new module (`sanitize.js`, `markRead.js`) → one-commit revert.
- Read state now lags up to 2 s behind the click; the outline still updates on enqueue.
- `keepalive` and the `entry[]=` form are both server-dependent; both must be proven
  against the live endpoint before merge, not assumed.

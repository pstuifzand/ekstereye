# Review: PLAN-reader-hardening.md

## Phase-by-phase diagnosis

**Phase 1 (sanitize) — correct.** `Entry.vue:299-318` returns `content.html` unchanged and feeds
`content.text` through the same `v-html` at `Entry.vue:30`; the token is in `localStorage`
(`store.js:28`, written at `:197`), so a feed script owns it. `DebugModal` is safe (`:9` uses
`{{ }}`) and `ShortTimeline` uses `v-text` (`:4-6`). Two gaps: the plan's risk paragraph contradicts
step 2 (forbid `iframe`, then allow youtube/vimeo "during implementation") — decide up front. And step 3's split must handle `main_content`'s third branch
(`Entry.vue:307`, `:316`) which returns a raw object → `v-html` yields `[object Object]`; treat it as
text. `v-html="niceTime"` (`Entry.vue:26`) is a second sink, trivial but should be `{{ }}` in the
same PR.

**Phase 2 (mark-read) — correct, but the flush mechanism as written cannot work.** Diagnosis holds:
`Timeline.vue:63-83` loops `$children`, `getBoundingClientRect()` per child (`:72`), one dispatch per
item (`:77`); the bottom test `:65` adds `documentElement.offsetHeight` so it is unreachable, and
`bottomReached` (`store.js:302-321`) marks everything read. Two hard problems:

1. `sendBeacon` cannot set an `Authorization` header. Every Microsub call authenticates with a
   bearer header (`store.js:210-214`, `:158-161`, `:182-186`). Beacon is dead here unless the token
   goes in the query string — worse. Make `fetch(..., {keepalive: true})` the primary path and drop
   the beacon paragraph, including the acceptance line that says "keepalive/sendBeacon verified".
2. Optimistic local marking will not render. `_is_read` does not exist on items when they arrive
   from JSON, so `item._is_read = true` (`Timeline.vue:58`, `:75`, `store.js:315`) adds a
   non-reactive property in Vue 2.7 — the `unread` class (`Entry.vue:257`) will not recompute. This
   needs `Vue.set` at ingest (normalize `_is_read: false` in the `newTimeline` mutation), which the
   plan only schedules in Phase 4 step 4. Move it into Phase 2; Phase 2's "outline updates
   instantly" acceptance otherwise fails.

Also: decrementing `channel.unread` optimistically is pointless — `new item in channel` overwrites
it with an absolute value (`store.js:112-118`). Skip that, or recompute after the batch resolves.
`entry[]=` array support is real client-side (`store.js:206-208`), but that bracket form is a server
quirk, not the Microsub spec's repeated `entry`; the plan asserts "already supported" from client
code alone. Verify against the live endpoint before merging.

**Phase 3 (quick wins) — mostly correct, one false claim.** Keys: `item.id` at `Timeline.vue:3` and
`SearchPopup.vue:27` are undefined for Microsub items, which use `_id` (`Timeline.vue:56`) — right.
SSE dedupe is real (`store.js:100-111`). But *"`niceTime` reads `currentItem.published`"* is wrong:
it reads `this.item.published` (`Entry.vue:247`), and `refNiceTime` (`:249-251`) is dead. The actual
inconsistency is that the timestamp link points at `currentItem.url` (`:26`) while the time comes
from the wrapper item. Decide which is right before "fixing" it. `photo_all` duplication (`:33` vs
`:325-336`, unused `photo_rest`) is correct.

Missing: `ShortTimeline.vue:3` keys on the array index over a `takeRight(10)` window — the list
shifts on every SSE item, so index keys rebind the wrong rows. One-line fix, belongs here.

Read-more: the real bug is `hasHiddenContent` measured once at mount (`Entry.vue:228-236`, duplicated
`:391-406`) with no observer, not the `max-height: 20vh`. Adding `-webkit-line-clamp: 8` also needs
`display: -webkit-box; -webkit-box-orient: vertical` and interacts with `.open` (`:438`). Cheaper:
keep the max-height and add the `ResizeObserver`. Defer clamp/collapse styling.

**Phase 4 (pagination) — description correct.** `fetchTimeline` replaces state wholesale
(`store.js:44-49`, `:171-191`); Home resets scroll on every page (`Home.vue:112-116`). Missed
enabler: `fetchTimeline` never returns its promise, so `Home.vue:107`, `:113`, `:131` `.then()` fire
immediately and `scrollTo(0)` runs before items land. Any append/scroll-preservation work needs that
`return fetch(...)` first.

**Phase 5 (api/auth) — diagnosis correct, fix underspecified.** Eight bare `fetch` calls in
`store.js`, no `api.js`, no 401 path. But: there is no logout/reset mutation at all, and 401 handling
must clear `access_token`, set `logged_in = false`, and close the `EventSource` (`store.js:74-82`);
the plan mentions only `localStorage`. `LoginModal` copies `active` into `show` once at mount
(`LoginModal.vue:80-81`), so "keep the modal re-openable" requires a `watch` on `active` — without
it the Phase 5 acceptance test cannot pass. `Home.vue:137-142` also fetches only if `logged_in` at
mount, so a successful sign-in still leaves an empty page until a route change.

**Phase 6** — fine as optional. All actions are `<a @click>` (`Entry.vue:48-53`), so the focus/keyboard
claim is right.

## Open questions

1. **Drop the read_state cache.** A localStorage copy that the server cannot reconcile becomes a
   second source of truth; 2000 uids/channel plus Vuex writes buys you only an outline colour.
   Cheaper and honest: keep `_is_read` in memory for the session, keep the badge server-authoritative,
   and revisit only if reload-outline-loss is actually reported.
2. **Strip all iframes, link out.** An embed allow-list means per-host logic, `sandbox` attributes,
   tracking pixels and fingerprinting from feed-controlled frames — for a reader whose job is text.
   Link out with the poster image. Make that the decision in the plan, not the PR body.
3. **Yes, Phase 3 before Phase 2** — but split it: 3a = keys, `_is_read` normalization, `niceTime`,
   `fetchTimeline` return; 3b = read-more/photo CSS. 3a de-risks Phase 2's acceptance tests.

## Verdict

**Approve with changes.** Required:
1. Replace sendBeacon with `fetch(..., {keepalive:true})`; fix the acceptance bullet.
2. Normalize `_is_read` via `Vue.set` in `newTimeline` inside Phase 2; drop optimistic unread
   decrement.
3. Fix the `niceTime` claim (`this.item.published`) and decide link-vs-time semantics.
4. Have `fetchTimeline` return its promise before any Phase 4 work.
5. Add `LoginModal` `active` watcher + a real logout/reset mutation to Phase 5.
6. Resolve the iframe contradiction now; drop the read_state cache from Phase 4.

Landing order: 3a → 1 → 2 → 5 → 4 → 3b → 6.

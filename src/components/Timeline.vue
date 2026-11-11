<template>
  <div :class="this.className">
    <div class="timeline-toolbar" v-if="kinds.length > 1 || unreadCount">
      <div class="timeline-filter" v-if="kinds.length > 1">
        <button type="button" :class="{'is-active': kindFilter === 'all'}" @click="setKind('all')">All</button>
        <button type="button" v-for="kind in kinds" :key="kind.kind"
                :class="{'is-active': kindFilter === kind.kind}" @click="setKind(kind.kind)">
          {{ kind.label }}<span class="count">{{ kind.count }}</span>
        </button>
      </div>
      <button v-if="unreadCount" type="button" class="button is-small mark-all-read" @click="markAllRead"
              title="Marks the entries loaded here; older pages stay unread">
        Mark all read<span class="count">{{ unreadCount }}</span>
      </button>
    </div>
    <div class="timeline-window" v-if="hiddenEarlier > 0">
      <button type="button" class="button is-small" @click="showEarlier">
        Show {{ hiddenEarlier }} earlier {{ hiddenEarlier === 1 ? 'entry' : 'entries' }}
      </button>
      <span class="timeline-window-hint">kept out of the page to keep scrolling smooth</span>
    </div>
    <template v-for="(item, index) in visibleItems">
      <div class="timeline-new" v-if="item._id === newSinceId" :key="'new-' + item._id">
        <span>New since your last visit</span>
      </div>
      <div class="timeline--item" :key="item._id" :class="{'selected': index === selectedIndex}">
        <CompactEntry v-if="compact" ref="entries" :item="item" :is-selected="index === selectedIndex"
                      @markRead="markRead(channel.uid, ...arguments)" @select="selectIndex(index)"
                      @reply="$emit('replySelected', item)"/>
        <TimelineEntry v-else ref="entries" :item="item" :is-selected="index === selectedIndex"
                       @debug="debug" @markRead="markRead(channel.uid, ...arguments)" @select="selectIndex(index)"
                       @followFeed="$emit('followFeed', arguments[0])" :is-main-entry="true"/>
      </div>
    </template>
    <div v-if="items.length === 0 && loggedIn && !loading">
      <p class="text-center">No items in this timeline</p>
    </div>
    <div v-if="loading && items.length === 0" class="level">
      <div class="level-item"><span class="timeline-status">Loading…</span></div>
    </div>
    <div class="level timeline-pager" v-if="hasNewer || hasOlder">
      <div class="level-item">
        <button class="button is-small" @click="newer" v-if="hasNewer">Newer</button>
      </div>
      <div class="level-item">
        <button class="button is-small" @click="older" v-if="hasOlder" :disabled="loading">Older</button>
      </div>
    </div>
    <div ref="sentinel" class="timeline-sentinel">
      <span v-if="loading && items.length > 0" class="timeline-status">Loading…</span>
    </div>
  </div>
</template>

<script>
  import TimelineEntry from '../components/Entry'
  import CompactEntry from '../components/CompactEntry.vue'
  import { enqueueMarkRead, flushMarkRead } from '../markRead'
  import { entryKind, KIND_LABELS, KIND_ORDER } from '../entry-kind'

  // Switching channels is a route change, so Home (and this component) is destroyed and
  // rebuilt: per-channel scroll and filter have to live outside the instance to survive
  // the round trip. Session-only on purpose, like the mark-read queue.
  const viewStates = {}

  export default {
    name: "Timeline",
    props: {
      className: String,
      channel: Object,
      timeline: {
        type: Object,
        required: true
      },
      // Only the timeline the reader is working in should claim the bare keys.
      keyboard: {
        type: Boolean,
        default: false
      },
      compact: {
        type: Boolean,
        default: false
      }
    },
    components: {TimelineEntry, CompactEntry},

    data() {
      return {
        state: 'new',
        selectedIndex: -1,
        // Which entry is selected, by id: an index points at a different card as soon
        // as a page is appended or an SSE item arrives at the top.
        selectedId: null,
        kindFilter: 'all',
        newSinceId: null,
        // How many cards below the cap are rendered; raised by "Show earlier".
        renderWindow: 300,
        pendingRestore: null,
        baseTitle: ''
      }
    },

    computed: {
      loggedIn() {
        return this.$store.state.logged_in
      },
      loading() {
        return this.$store.state.loading
      },
      hasNewer() {
        return this.$store.state.timelineStack.length > 0
      },
      hasOlder() {
        return Boolean(this.timeline.paging && this.timeline.paging.after)
      },
      items() {
        return this.timeline.items.filter((item) => {
          return item.type === 'entry' || item.type === 'cite';
        })
      },
      filteredItems() {
        if (this.kindFilter === 'all') {
          return this.items
        }
        return this.items.filter((item) => entryKind(item) === this.kindFilter)
      },
      // The rendered window: a long scroll on a busy channel builds thousands of cards,
      // each with sanitized feed HTML. Cheap to keep in the store, expensive in the DOM.
      visibleItems() {
        const items = this.filteredItems
        if (items.length <= this.renderWindow) {
          return items
        }
        return items.slice(items.length - this.renderWindow)
      },
      hiddenEarlier() {
        return this.filteredItems.length - this.visibleItems.length
      },
      kinds() {
        const counts = {}
        this.items.forEach((item) => {
          const kind = entryKind(item)
          counts[kind] = (counts[kind] || 0) + 1
        })
        return KIND_ORDER
          .filter((kind) => counts[kind])
          .map((kind) => ({kind, label: KIND_LABELS[kind], count: counts[kind]}))
      },
      unreadCount() {
        return this.items.filter((item) => !item._is_read).length
      }
    },

    methods: {
      debug(item) {
        this.$store.dispatch('openDebug', item)
      },
      older() {
        this.loadMore(false)
      },
      loadMore(automatic) {
        // The sentinel stays in view when a page is shorter than the viewport, so guard
        // against firing another request while one is still in flight.
        if (!this.hasOlder || this.loading) {
          return
        }
        // While a filter is on, a page can be all entries the filter hides; loading more
        // because the list looks short would never end. The Older button still works.
        if (automatic && this.kindFilter !== 'all') {
          return
        }
        this.$emit('older', {uid: this.channel.uid, after: this.timeline.paging.after})
      },
      newer() {
        if (!this.hasNewer) {
          return
        }
        this.$emit('newer')
        // Trimming the list while the reader sits at the bottom leaves the sentinel in view,
        // so auto-loading would append the same page straight back. Jump to the top of the
        // page that is now shown instead.
        this.$nextTick(() => {
          const el = this.$el
          if (!el) {
            return
          }
          const top = window.scrollY + el.getBoundingClientRect().top - 80
          window.scrollTo({top: Math.max(0, top)})
        })
      },
      observeSentinel() {
        if (!('IntersectionObserver' in window) || !this.$refs.sentinel) {
          return
        }
        if (this.sentinelObserver) {
          this.sentinelObserver.disconnect()
        }
        this.sentinelObserver = new IntersectionObserver((records) => {
          records.forEach((record) => {
            if (record.isIntersecting) {
              this.loadMore(true)
            }
          })
        }, {rootMargin: '200px'})
        this.sentinelObserver.observe(this.$refs.sentinel)
      },
      isTypingTarget(event) {
        const el = event.target
        if (!el) {
          return false
        }
        const tag = (el.tagName || '').toLowerCase()
        return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
      },
      // A v-for ref array is in mount order, not render order: once an SSE item is
      // prepended or a page is appended, $refs.entries[index] is a different card than
      // visibleItems[index]. The rendered cards are read from the DOM instead, which is
      // always in the order the reader sees.
      entryNodes() {
        if (!this.$el || !this.$el.querySelectorAll) {
          return []
        }
        return Array.from(this.$el.querySelectorAll('.timeline--item'))
      },
      componentFor(id) {
        const list = this.$refs.entries
        const entries = Array.isArray(list) ? list : (list ? [list] : [])
        return entries.find(entry => entry.$props && entry.$props.item &&
          entry.$props.item._id === id) || null
      },
      selectIndex(index) {
        const count = this.entryNodes().length
        if (!count) {
          return
        }
        const next = Math.max(0, Math.min(count - 1, index))
        this.selectedIndex = next
        const selected = this.visibleItems[next]
        this.selectedId = selected ? selected._id : null
        this.$emit('selected', selected || null)
        this.$nextTick(() => {
          this.scrollEntryIntoView(this.entryNodes()[next])
        })
      },
      scrollEntryIntoView(el) {
        if (!el) {
          return
        }
        if (this.compact) {
          const container = this.$el.closest('.reader-list')
          if (container) {
            const itemRect = el.getBoundingClientRect()
            const containerRect = container.getBoundingClientRect()
            if (itemRect.top < containerRect.top || itemRect.bottom > containerRect.bottom) {
              const offset = itemRect.top < containerRect.top
                ? itemRect.top - containerRect.top - 12
                : itemRect.bottom - containerRect.bottom + 12
              container.scrollTo({top: container.scrollTop + offset, behavior: 'smooth'})
            }
            return
          }
        }
        const rect = el.getBoundingClientRect()
        const topMargin = 80 // fixed navbar plus breathing room
        const bottomMargin = 24
        const viewport = window.innerHeight
        // Leave a card alone while it is comfortably visible; recentre only when it is
        // partly hidden or freshly entered from the edge.
        if (rect.top >= topMargin && rect.bottom <= viewport - bottomMargin) {
          return
        }
        const tallest = viewport - topMargin - bottomMargin
        const top = rect.height >= tallest
          ? window.scrollY + rect.top - topMargin
          : window.scrollY + rect.top - Math.max(topMargin, (viewport - rect.height) / 2)
        window.scrollTo({top, behavior: 'smooth'})
      },
      currentEntry() {
        if (!this.entryNodes().length) {
          return null
        }
        if (this.selectedIndex < 0) {
          this.selectIndex(0)
          return this.componentFor(this.selectedId)
        }
        return this.componentFor(this.selectedId)
      },
      handleKey(event) {
        if (!this.keyboard || this.isTypingTarget(event) || event.ctrlKey || event.metaKey || event.altKey) {
          return
        }
        let handled = true
        switch (event.key) {
          case 'j':
            this.selectIndex(this.selectedIndex + 1)
            if (this.selectedIndex === this.visibleItems.length - 1) {
              this.loadMore(true)
            }
            break
          case 'k':
            this.selectIndex(this.selectedIndex - 1)
            break
          case 'o': {
            const entry = this.currentEntry()
            if (entry) {
              window.open(entry.currentItem.url, '_blank', 'noopener')
            }
            break
          }
          case 'm': {
            const entry = this.currentEntry()
            if (entry) {
              entry.markRead()
            }
            break
          }
          case 'r': {
            const entry = this.currentEntry()
            if (entry) {
              entry.openReply()
            }
            break
          }
          case 'l': {
            const entry = this.currentEntry()
            if (entry) {
              entry.like()
            }
            break
          }
          case 'u':
            if (this.selectedId) {
              this.$store.commit('toggleItemUnread', this.selectedId)
            }
            break
          case '?':
            this.$emit('help')
            break
          case 'Escape':
            this.selectedIndex = -1
            this.selectedId = null
            break
          default:
            handled = false
        }
        if (handled) {
          event.preventDefault()
        }
      },
      snapshotNewSince() {
        // Where the unread run begins, taken once when the channel loads: marking items
        // read as you scroll must not move the line.
        if (this.newSinceId !== null) {
          return
        }
        const index = this.items.findIndex((item) => !item._is_read)
        if (index > 0) {
          this.newSinceId = this.items[index]._id
        }
      },
      setKind(kind) {
        this.kindFilter = kind
        this.selectedIndex = -1
        this.selectedId = null
        this.renderWindow = 300
        this.$nextTick(this.rememberViewState)
      },
      showEarlier() {
        // Growing the window inserts cards above the reader. Anchor on the card at the top
        // of the viewport by id -- not on "the first card", which is a different entry
        // after the window grows -- and scroll by however far it moved.
        const nodes = this.entryNodes()
        const atTop = nodes.findIndex((node) => node.getBoundingClientRect().bottom > 0)
        const anchorIndex = atTop < 0 ? 0 : atTop
        const anchor = nodes[anchorIndex]
        const anchorItem = this.visibleItems[anchorIndex]
        const anchorId = anchorItem ? anchorItem._id : null
        const before = anchor ? anchor.getBoundingClientRect().top : null
        this.renderWindow += 300
        this.$nextTick(() => {
          if (!anchorId || before === null) {
            return
          }
          const index = this.visibleItems.findIndex((item) => item._id === anchorId)
          const node = this.entryNodes()[index]
          if (!node) {
            return
          }
          const delta = node.getBoundingClientRect().top - before
          if (delta) {
            window.scrollBy(0, delta)
          }
        })
      },
      saveViewState(uid) {
        if (!uid) {
          return
        }
        viewStates[uid] = {
          scrollY: Math.round(window.scrollY),
          kindFilter: this.kindFilter,
          selectedId: this.selectedId
        }
      },
      restoreViewState() {
        const uid = this.pendingRestore
        if (!uid) {
          return
        }
        const saved = viewStates[uid]
        if (!saved) {
          this.pendingRestore = null
          return
        }
        if (!this.entryNodes().length) {
          // Nothing rendered yet; try again when the timeline arrives.
          return
        }
        this.pendingRestore = null
        if (saved.kindFilter) {
          this.kindFilter = saved.kindFilter
        }
        this.$nextTick(() => {
          if (saved.selectedId) {
            this.selectedId = saved.selectedId
            this.syncSelection()
          }
          if (saved.scrollY) {
            window.scrollTo({top: saved.scrollY})
          }
        })
      },
      updateTitle() {
        const name = this.channel && this.channel.name
        if (!name) {
          document.title = this.baseTitle
          return
        }
        const unread = this.unreadCount
        document.title = unread > 0 ? name + ' (' + unread + ') — Ekster' : name + ' — Ekster'
      },
      syncSelection() {
        // Re-derive the index from the id after the list changed shape; -1 means the
        // selected entry left the timeline (another channel, a filtered-out kind).
        if (this.selectedId === null) {
          return
        }
        const index = this.visibleItems.findIndex((item) => item._id === this.selectedId)
        this.selectedIndex = index
        if (index < 0) {
          this.selectedId = null
        }
      },
      markAllRead() {
        // Only what is on screen: the server has no "everything older" sweep.
        this.items.forEach((item) => this.markRead(this.channel.uid, item))
      },
      markRead(channel, item) {
        if (!item || item._is_read) {
          return
        }
        // Clear the outline now, send the request with the next batch.
        this.$set(item, '_is_read', true)
        enqueueMarkRead(channel, item._id)
      },
      markSeenEntries() {
        // Entries are rendered in feed order, so walk from the first unread one and stop
        // at the first entry that is still visible. Reads stop at that boundary instead
        // of touching every card on every frame.
        const channel = this.channel && this.channel.uid
        // DOM order is render order; $children is mount order and would sweep the wrong
        // entries once a page is appended or an SSE item is prepended.
        const nodes = this.entryNodes()
        const items = this.visibleItems
        for (let i = 0; i < nodes.length; i += 1) {
          const item = items[i]
          if (!item || item._is_read) {
            continue
          }
          if (nodes[i].getBoundingClientRect().bottom > 100) {
            break
          }
          this.markRead(channel, item)
        }
      },
      scheduleSeenCheck() {
        if (this.checkScheduled) {
          return
        }
        this.checkScheduled = true
        window.requestAnimationFrame(() => {
          this.checkScheduled = false
          this.markSeenEntries()
          this.rememberViewState()
        })
      },
      // Recorded continuously rather than only when the channel changes: a sidebar click
      // can destroy this component before any watcher runs, and then the position would
      // be lost. One entry per channel, session-only.
      rememberViewState() {
        const uid = this.channel && this.channel.uid
        if (!uid) {
          return
        }
        viewStates[uid] = {
          scrollY: Math.round(window.scrollY),
          kindFilter: this.kindFilter,
          selectedId: this.selectedId
        }
      },
    },

    created() {
      this.checkScheduled = false
      this.sentinelObserver = null
    },

    mounted() {
      window.addEventListener('scroll', this.scheduleSeenCheck, {passive: true})
      window.addEventListener('keydown', this.handleKey)
      this.baseTitle = document.title
      this.updateTitle()
      // A channel switch is a route change: this component is rebuilt, so the saved state
      // is restored here rather than from the channel watcher.
      if (this.channel && viewStates[this.channel.uid]) {
        this.pendingRestore = this.channel.uid
      }
      this.$nextTick(this.markSeenEntries)
      this.$nextTick(this.observeSentinel)
    },

    watch: {
      timeline() {
        // Appending a page keeps the filter; only the channel decides what is in it.
        // The selection follows its entry by id instead of being dropped: resetting it
        // here sent the reader back to the first card after every auto-loaded page.
        this.snapshotNewSince()
        this.$nextTick(() => {
          this.syncSelection()
          this.restoreViewState()
        })
      },
      channel(next, prev) {
        if (prev && prev.uid && next && prev.uid !== next.uid) {
          this.saveViewState(prev.uid)
        }
        this.selectedIndex = -1
        this.selectedId = null
        this.kindFilter = 'all'
        this.newSinceId = null
        this.renderWindow = 300
        this.pendingRestore = next && next.uid ? next.uid : null
        this.snapshotNewSince()
        this.updateTitle()
      },
      unreadCount() {
        this.updateTitle()
      },
      items() {
        this.$nextTick(this.markSeenEntries)
        this.$nextTick(this.observeSentinel)
      }
    },

    beforeDestroy() {
      window.removeEventListener('scroll', this.scheduleSeenCheck)
      window.removeEventListener('keydown', this.handleKey)
      // Leaving through the sidebar destroys this component without a channel watcher
      // running first, so the position would otherwise never be saved.
      this.saveViewState(this.channel && this.channel.uid)
      if (this.baseTitle) {
        document.title = this.baseTitle
      }
      if (this.sentinelObserver) {
        this.sentinelObserver.disconnect()
      }
      flushMarkRead()
    }
  }
</script>

<style scoped>
  .timeline--item {
    margin-bottom: 16px;
  }

  .timeline--item {
    scroll-margin-top: 70px;
  }

  .timeline-new {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 4px 0 12px;
    font-size: .72rem;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--muted, #7a7a7a);
  }

  .timeline-new::before,
  .timeline-new::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--accent, #5757e8);
    opacity: .35;
  }

  .timeline-new span {
    white-space: nowrap;
  }

  .timeline-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .timeline-filter {
    display: flex;
    gap: 6px;
  }

  .timeline-filter button {
    background: none;
    border: 1px solid var(--line, #dbdbdb);
    border-radius: 999px;
    padding: 2px 10px;
    font-size: .8rem;
    color: var(--fg, #4a4a4a);
    cursor: pointer;
  }

  .timeline-filter button.is-active {
    background: var(--sel-bar, #363636);
    border-color: var(--sel-bar, #363636);
    color: var(--bg, #fff);
  }

  .timeline-filter .count,
  .mark-all-read .count {
    opacity: .6;
    margin-left: 5px;
  }

  /* Marking read is not paging, so it lives above the list with the filters. */
  .mark-all-read {
    margin-left: auto;
  }

  .timeline-sentinel {
    height: 1px;
  }

  .timeline-window {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin: 4px 0 12px;
  }

  .timeline-window-hint {
    color: var(--muted, #7a7a7a);
    font-size: 0.8rem;
  }

  /* Auto-loading appends below the list, which pushed these buttons down the page just as
     the reader reached for them. Pinned to the bottom edge, they stay where the cursor is. */
  .timeline-pager {
    position: sticky;
    bottom: 0;
    z-index: 5;
    margin-top: 8px;
    padding: 10px 0;
    background: var(--bg, #fff);
    border-top: 1px solid var(--line, #e4e4e4);
  }

  .timeline-status {
    font-size: 0.85rem;
    color: #7a7a7a;
  }

  .has-buttons {
    justify-content: end;
    padding: 12px;
  }
</style>

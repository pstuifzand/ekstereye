<template>
  <div :class="this.className">
    <div class="timeline-filter" v-if="kinds.length > 1">
      <button type="button" :class="{'is-active': kindFilter === 'all'}" @click="setKind('all')">All</button>
      <button type="button" v-for="kind in kinds" :key="kind.kind"
              :class="{'is-active': kindFilter === kind.kind}" @click="setKind(kind.kind)">
        {{ kind.label }}<span class="count">{{ kind.count }}</span>
      </button>
    </div>
    <div class="timeline--item" v-for="(item, index) in visibleItems" :key="item._id"
         :class="{'selected': index === selectedIndex}">
      <TimelineEntry ref="entries" :item="item" :is-selected="index === selectedIndex"
                     @debug="debug" @markRead="markRead(channel.uid, ...arguments)" @select="selectIndex(index)"
                     @followFeed="$emit('followFeed', arguments[0])" :is-main-entry="true"/>
    </div>
    <div v-if="items.length === 0 && loggedIn && !loading">
      <p class="text-center">No items in this timeline</p>
    </div>
    <div v-if="loading && items.length === 0" class="level">
      <div class="level-item"><span class="timeline-status">Loading…</span></div>
    </div>
    <div class="level timeline-pager">
      <div class="level-item" v-if="unreadCount">
        <button class="button is-small" @click="markAllRead"
                title="Marks the entries loaded here; older pages stay unread">Mark all read</button>
      </div>
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
  import { enqueueMarkRead, flushMarkRead } from '../markRead'
  import { entryKind, KIND_LABELS, KIND_ORDER } from '../entry-kind'

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
      }
    },
    components: {TimelineEntry},

    data() {
      return {
        state: 'new',
        selectedIndex: -1,
        kindFilter: 'all'
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
      visibleItems() {
        if (this.kindFilter === 'all') {
          return this.items
        }
        return this.items.filter((item) => entryKind(item) === this.kindFilter)
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
      renderedEntries() {
        const list = this.$refs.entries
        if (!list) {
          return []
        }
        return Array.isArray(list) ? list : [list]
      },
      selectIndex(index) {
        const entries = this.renderedEntries()
        if (!entries.length) {
          return
        }
        const next = Math.max(0, Math.min(entries.length - 1, index))
        this.selectedIndex = next
        this.$nextTick(() => {
          this.scrollEntryIntoView(entries[next])
        })
      },
      scrollEntryIntoView(entry) {
        const el = entry && entry.$el
        if (!el) {
          return
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
        const entries = this.renderedEntries()
        if (!entries.length) {
          return null
        }
        if (this.selectedIndex < 0) {
          this.selectIndex(0)
          return entries[0]
        }
        return entries[this.selectedIndex] || null
      },
      handleKey(event) {
        if (!this.keyboard || this.isTypingTarget(event) || event.ctrlKey || event.metaKey || event.altKey) {
          return
        }
        let handled = true
        switch (event.key) {
          case 'j':
            this.selectIndex(this.selectedIndex + 1)
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
          case 'Escape':
            this.selectedIndex = -1
            break
          default:
            handled = false
        }
        if (handled) {
          event.preventDefault()
        }
      },
      setKind(kind) {
        this.kindFilter = kind
        this.selectedIndex = -1
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
        const children = this.$children
        for (let i = 0; i < children.length; i += 1) {
          const child = children[i]
          const item = child.$props.item
          if (!item || item._is_read || !child.$el) {
            continue
          }
          if (child.$el.getBoundingClientRect().bottom > 100) {
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
        })
      }
    },

    created() {
      this.checkScheduled = false
      this.sentinelObserver = null
    },

    mounted() {
      window.addEventListener('scroll', this.scheduleSeenCheck, {passive: true})
      window.addEventListener('keydown', this.handleKey)
      this.$nextTick(this.markSeenEntries)
      this.$nextTick(this.observeSentinel)
    },

    watch: {
      timeline() {
        // Appending a page keeps the filter; only the channel decides what is in it.
        this.selectedIndex = -1
      },
      channel() {
        this.selectedIndex = -1
        this.kindFilter = 'all'
      },
      items() {
        this.$nextTick(this.markSeenEntries)
        this.$nextTick(this.observeSentinel)
      }
    },

    beforeDestroy() {
      window.removeEventListener('scroll', this.scheduleSeenCheck)
      window.removeEventListener('keydown', this.handleKey)
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

  .timeline-filter {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
  }

  .timeline-filter button {
    background: none;
    border: 1px solid #dbdbdb;
    border-radius: 999px;
    padding: 2px 10px;
    font-size: .8rem;
    color: #4a4a4a;
    cursor: pointer;
  }

  .timeline-filter button.is-active {
    background: #363636;
    border-color: #363636;
    color: #fff;
  }

  .timeline-filter .count {
    opacity: .6;
    margin-left: 5px;
  }

  .timeline-sentinel {
    height: 1px;
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

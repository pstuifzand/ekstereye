<template>
  <div :class="this.className">
    <div class="timeline--item" v-for="(item, index) in items" :key="item._id"
         :class="{'selected': index === selectedIndex}">
      <TimelineEntry ref="entries" :item="item" @debug="debug" @markRead="markRead(channel.uid, ...arguments)" @followFeed="$emit('followFeed', arguments[0])"
                     :is-main-entry="true"/>
    </div>
    <div v-if="items.length === 0 && loggedIn && !loading">
      <p class="text-center">No items in this timeline</p>
    </div>
    <div v-if="loading && items.length === 0" class="level">
      <div class="level-item"><span class="timeline-status">Loading…</span></div>
    </div>
    <div class="level timeline-pager">
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
        selectedIndex: -1
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
      }
    },

    methods: {
      debug(item) {
        this.$store.dispatch('openDebug', item)
      },
      older() {
        // The sentinel stays in view when a page is shorter than the viewport, so guard
        // against firing another request while one is still in flight.
        if (!this.hasOlder || this.loading) {
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
              this.older()
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
          const entry = entries[next]
          if (entry && entry.$el && entry.$el.scrollIntoView) {
            entry.$el.scrollIntoView({block: 'nearest'})
          }
        })
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
        // A new page of items (or a channel switch) invalidates the old selection.
        this.selectedIndex = -1
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

  .timeline--item.selected .entry {
    box-shadow: 0 0 0 2px #363636;
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

<template>
  <div :class="this.className">
    <div class="timeline--item" v-for="item in items" :key="item._id">
      <TimelineEntry :item="item" @debug="debug" @markRead="markRead(channel.uid, ...arguments)" @followFeed="$emit('followFeed', arguments[0])"
                     :is-main-entry="true"/>
    </div>
    <div v-if="items.length === 0 && loggedIn">
      <p class="text-center">No items in this timeline</p>
    </div>
    <div class="level">
      <div class="level-item">
        <button class="button" @click="prevPage" v-if="timeline.paging.before">Prev Page</button>
      </div>
      <div class="level-item">
        <button class="button" @click="nextPage" v-if="timeline.paging.after">Next Page</button>
      </div>
    </div>
  </div>
</template>

<script>
  import TimelineEntry from '../components/Entry'
  import { enqueueMarkRead, flushMarkRead } from '../markRead'

  export default {
    name: "Timeline",
    props: ['className', 'channel', 'timeline'],
    components: {TimelineEntry},

    data() {
      return {
        state: 'new'
      }
    },

    computed: {
      loggedIn() {
        return this.$store.state.logged_in
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
      nextPage() {
        if (this.timeline.paging.after) {
          this.$emit('getPage', {uid: this.channel.uid, after: this.timeline.paging.after})
        }
      },
      prevPage() {
        this.$emit('getPage', {uid: this.channel.uid, before: this.timeline.paging.before})
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
    },

    mounted() {
      window.addEventListener('scroll', this.scheduleSeenCheck, {passive: true})
      this.$nextTick(this.markSeenEntries)
    },

    watch: {
      items() {
        this.$nextTick(this.markSeenEntries)
      }
    },

    beforeDestroy() {
      window.removeEventListener('scroll', this.scheduleSeenCheck)
      flushMarkRead()
    }
  }
</script>

<style scoped>
  .timeline--item {
    margin-bottom: 16px;
  }

  .has-buttons {
    justify-content: end;
    padding: 12px;
  }
</style>

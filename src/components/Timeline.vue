<template>
  <div :class="this.className">
    <div class="timeline--item" v-for="item in items" :key="item.id">
      <TimelineEntry :item="item" @debug="debug" @markRead="markRead(channel.uid, ...arguments)" @followFeed="$emit('followFeed', arguments[0])"
                     :is-main-entry="true"/>
    </div>
    <div class="level">
      <div class="level-item">
        <button class="button" @click="prevPage" v-if="timeline.paging.before">Prev Page</button>
      </div>
      <div class="level-item">
        <button class="button" @click="nextPage" v-if="timeline.paging.after">Next Page</button>
      </div>
    </div>
    <DebugModal :active="showDebug" :item="debugItem" @close="showDebug = false"></DebugModal>
  </div>
</template>

<script>
  import TimelineEntry from '../components/Entry'
  import DebugModal from '../components/DebugModal'

  export default {
    name: "Timeline",
    props: ['className', 'channel', 'timeline'],
    components: {TimelineEntry, DebugModal},

    data() {
      return {
        showDebug: false,
        debugItem: null,
        state: 'new'
      }
    },

    computed: {
      items() {
        return this.timeline.items.filter((item) => {
          return item.type === 'entry' || item.type === 'cite';
        })
      }
    },

    methods: {
      debug(item) {
        this.debugItem = item
        this.showDebug = true
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
        return this.$store.dispatch('markRead', {channel: channel, entry: item._id})
          .then(() => {
            item._is_read = true
          }).then(() => {
            this.$store.dispatch('fetchChannels')
          })
      },
      handleScroll() {
        // let bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === document.documentElement.offsetHeight;
        let bottomOfWindow = document.documentElement.scrollTop + window.innerHeight >= this.$el.offsetHeight + document.documentElement.offsetHeight
        if (bottomOfWindow) {
          this.$store.dispatch('bottomReached')
          return
        }

        this.$children.forEach((child) => {
          let rect = child.$el.getBoundingClientRect()
          if (rect.top + rect.height < 100) {
            if (child.$props.item && !child.$props.item._is_read) {
              child.$props.item._is_read = true
              let item = child.$props.item
              this.markRead(this.channel.uid, item).then(() => {
                this.$store.dispatch('fetchChannels')
              })
            }
          }
        })
      }
    },

    created() {
      window.addEventListener('scroll', this.handleScroll);
    },

    beforeDestroy() {
      window.removeEventListener('scroll', this.handleScroll);
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
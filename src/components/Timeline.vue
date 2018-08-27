<template>
  <div :class="this.className">
    <div class="timeline--item" v-for="item in items" :key="item.id">
      <TimelineEntry :item="item" @debug="debug"/>
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
  import TimelineEntry from '@/components/Entry'
  import DebugModal from '@/components/DebugModal'

  export default {
    name: "Timeline",
    props: ['className', 'channel', 'timeline'],
    components: {TimelineEntry, DebugModal},

    data() {
      return {
        showDebug: false,
        debugItem: null
      }
    },

    computed: {
      items() {
        return this.timeline.items.filter((item) => {
          return item.type === 'entry';
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
      }
    },

    mounted() {
      window.onscroll = () => {
        // let bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === document.documentElement.offsetHeight;
        let bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === this.$el.offsetHeight + document.documentElement.offsetHeight + 20;
        if (bottomOfWindow) {
          this.$children.forEach((child) => {
            if (child.$props.item && !child.$props.item._is_read) {
              child.$props.item._is_read = true
              this.$store.dispatch('markRead', child.$props.item.uid)
            }
          })
        }

        this.$children.forEach((child) => {
          let rect = child.$el.getBoundingClientRect()
          if (rect.top + rect.height < 100) {
            if (child.$props.item && !child.$props.item._is_read) {
              child.$props.item._is_read = true
              this.$store.dispatch('markRead', {channel:this.channel.uid, entry: child.$props.item._id }).then(() => {
                this.$store.dispatch('fetchChannels')
              })
            }
          }
        })
      }
    }
  }
</script>

<style scoped>
  .timeline--item {
    margin-bottom: 16px;
  }
</style>
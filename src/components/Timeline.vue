<template>
  <div :class="this.className">
    <div class="mb-20">
      <div class="card">
        <div class="card-header">
          <div class="card-header-title">What are you thinking about?</div>
        </div>
        <div class="card-content">
          <div class="media">
            <div class="media-content">
              <div class="field">
               <div class="control">
                 <textarea class="textarea" v-model="newPost"></textarea>
               </div>
              </div>
              <div class="field">
                <div class="control">
                  <button class="button is-primary" @click="post">Post</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="timeline--item" v-for="item in items" :key="item.id">
      <TimelineEntry :item="item" @debug="debug" @markRead="markRead(channel.uid, ...arguments)" :is-main-entry="true"/>
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
        debugItem: null,
        newPost: '',
        state: 'new'
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
      post() {
        this.$store.dispatch('micropubPost', {
          'type': ['h-entry'],
          'properties': {
            'content': [this.newPost]
          },
        }).then(() => {
          this.newPost = '';
        })
      },
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
          })
      }
    },

    mounted() {
      window.onscroll = () => {
        // let bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === document.documentElement.offsetHeight;
        let bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === this.$el.offsetHeight + document.documentElement.offsetHeight + 20;
        if (bottomOfWindow) {
          let count = 0
          this.$children.forEach((child) => {
            if (child.$props.item && !child.$props.item._is_read) {
              child.$props.item._is_read = true
              let item = child.$props.item
              this.markRead(this.channel.uid, item)
              count++
            }
          })
          if (count > 0) {
            this.$store.dispatch('fetchChannels')
          }
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
    }
  }
</script>

<style scoped>
  .timeline--item {
    margin-bottom: 16px;
  }
  .has-buttons {
    justify-content: end;
    padding:12px;
  }
</style>
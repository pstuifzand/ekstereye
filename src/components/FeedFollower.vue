<template>
  <div :class="modalClasses">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Add feed to {{ channel.name }}</p>
        <button class="delete" aria-label="close" @click="close"></button>
      </header>

      <div class="modal-card-body">
        <div class="field has-addons">
          <div class="control is-expanded">
            <input type="text" class="input is-expanded" id="query" placeholder="Search for feed" v-model="query"
                   ref="query" @keypress.enter="search"/>
          </div>
          <div class="control">
            <button :class="searchClasses" @click="search">Search</button>
          </div>
        </div>

        <div class="channels">
          <div class="select">
            <select class="select" v-model="channel">
              <option :value="ch" v-text="ch.name" :key="ch.uid" v-for="ch in channels"></option>
            </select>
          </div>
        </div>

        <div class="results">
          <feed-chooser :feed="feed" @showFeed="showFeed(feed)" @addFeed="addFeed(feed)" v-for="(feed, i) in feeds" :key="i"/>
        </div>

        <Timeline class="timeline" :timeline="timeline" :channel="channel"></Timeline>
      </div>

      <footer class="modal-card-foot">
      </footer>
    </div>
  </div>
</template>

<script>
  import Timeline from '../components/Timeline';
  import FeedChooser from "./FeedChooser";

  export default {
    name: "FeedFollower",
    components: {FeedChooser, Timeline},
    props: ['isOpen', 'initialChannel', 'initialQuery'],

    data() {
      return {
        channel: {},
        feeds: [],
        timeline: {items: [], paging: {}},
        query: '',
        loading: false
      }
    },

    computed: {
      modalClasses() {
        return {'modal': true, 'is-active': this.isOpen}
      },
      searchClasses() {
        return {'button': true, 'is-primary': true, 'is-loading': this.loading}
      },
      channels() {
        return this.$store.state.channels
      }
    },

    watch: {
      // eslint-disable-next-line no-unused-vars
      isOpen(newVal, oldVal) {
        if (newVal) {
          this.query = this.initialQuery
          this.channel = this.initialChannel

          this.$nextTick(function () {
            this.$refs.query.focus()
          })
        }
      }
    },

    methods: {
      close() {
        this.feeds = []
        this.timeline = {items: [], paging: {}}
        this.query = ''
        this.loading = false

        this.$emit('close')
      },
      search() {
        let url = this.$store.state.microsubEndpoint + '?action=search&query=' + encodeURIComponent(this.query)
        this.loading = true
        return fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + this.$store.state.access_token
          }
        }).then((res) => {
          return res.json()
        }).then((res) => {
          if (!res.results) {
            this.loading = false
            this.feeds = []
            return
          }

          res.results.forEach(item => {
            item.loading = false
          })

          this.feeds = res.results
          this.loading = false
        })
      },
      showFeed(feed) {
        feed.loading = true
        let url = this.$store.state.microsubEndpoint
        let formData = new URLSearchParams();
        formData.set('action', 'preview')
        formData.set('url', feed.url)
        return fetch(url, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': 'Bearer ' + this.$store.state.access_token
          }
        }).then((res) => {
          return res.json()
        }).then((res) => {
          this.timeline = res
          feed.loading = false
        })
      },
      addFeed(feed) {
        feed.loading = true
        let url = this.$store.state.microsubEndpoint + '?action=follow&channel='+this.channel.uid+'&url=' + encodeURIComponent(feed.url)
        return fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + this.$store.state.access_token
          }
        }).then(() => {
          feed.loading = false
          this.$store.dispatch('fetchTimeline', this.channel)
        })
      }
    }
  }
</script>

<style scoped>

  .results {
    display: grid;
    grid-template-columns: 52px auto auto auto;
    grid-gap: 6px;
  }

</style>
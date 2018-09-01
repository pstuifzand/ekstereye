<template>
  <div :class="modalClasses">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Add feed to channel</p>
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

        <div class="results">
          <feed-chooser :feed="feed" @showFeed="showFeed(feed)" v-for="(feed, i) in feeds" :key="i"/>
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
    props: ['isOpen'],

    data() {
      return {
        feeds: [],
        timeline: {items: [], paging: {}},
        channel: {},
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
      }
    },

    watch: {
      // eslint-disable-next-line no-unused-vars
      isOpen(newVal, oldVal) {
        if (newVal) {
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
        this.channel = {}
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
          res.results.forEach(item => {
            item.loading = false
          })
          this.feeds = res.results
          this.loading = false
        })
      },
      showFeed(feed) {
        feed.loading = true
        let url = this.$store.state.microsubEndpoint + '?action=preview&url=' + encodeURIComponent(feed.url)
        return fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + this.$store.state.access_token
          }
        }).then((res) => {
          return res.json()
        }).then((res) => {
          this.channel = feed
          this.timeline = res
          feed.loading = false
        })
      }
    }
  }
</script>

<style scoped>

  .results {
    display: flex;
    flex-direction: column;
  }

</style>
<template>
  <div :class="modalClasses">
    <div class="modal-background"></div>
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Add feed">
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

        <p class="empty-results" v-if="searched && !loading && feeds.length === 0">
          No feeds matched "{{ query }}".
        </p>
        <div class="results">
          <feed-chooser :feed="feed" @showFeed="showFeed(feed)" @addFeed="addFeed(feed)" v-for="feed in feeds" :key="feed.url"/>
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
  import { request } from '@/api';
  import modalA11y from '@/modal-a11y';

  export default {
    name: "FeedFollower",
    mixins: [modalA11y],
    components: {FeedChooser, Timeline},
    props: ['isOpen', 'initialChannel', 'initialQuery'],

    data() {
      return {
        channel: {},
        feeds: [],
        timeline: {items: [], paging: {}},
        query: '',
        loading: false,
        searched: false
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
          this.feeds = []
          this.searched = false

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
        const url = this.$store.state.microsubEndpoint + '?action=search&query=' + encodeURIComponent(this.query)
        this.loading = true
        // Through the shared client so a 401 resets the session and anything else lands
        // in a toast; the bare fetch here left the spinner running and said nothing.
        return request(url, {method: 'POST', token: this.$store.state.access_token})
          .then((res) => {
            this.loading = false
            this.searched = true
            const results = (res && res.results) || []
            results.forEach(item => {
              item.loading = false
            })
            this.feeds = results
          })
          .catch((error) => {
            this.loading = false
            this.feeds = []
            this.$store.dispatch('notify', {
              type: 'error',
              message: 'Could not search for feeds: ' + error.message
            })
          })
      },
      showFeed(feed) {
        feed.loading = true
        const url = this.$store.state.microsubEndpoint
        const formData = new URLSearchParams();
        formData.set('action', 'preview')
        formData.set('url', feed.url)
        return request(url, {
          method: 'POST',
          body: formData,
          token: this.$store.state.access_token
        }).then((res) => {
          this.timeline = res || {items: [], paging: {}}
          feed.loading = false
        }).catch((error) => {
          feed.loading = false
          this.$store.dispatch('notify', {
            type: 'error',
            message: 'Could not preview that feed: ' + error.message
          })
        })
      },
      addFeed(feed) {
        feed.loading = true
        // Same action as the Feeds panel, so a failure here says why instead of vanishing.
        return this.$store.dispatch('followFeed', {channel: this.channel.uid, url: feed.url})
          .then(() => {
            feed.loading = false
            this.$store.dispatch('fetchTimeline', this.channel)
          })
          .catch(() => {
            feed.loading = false
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

  .empty-results {
    padding: 8px 0;
    color: var(--muted, #7a7a7a);
  }

</style>
<template>
  <div :class="modalClasses">
    <div class="modal-background"></div>
    <div class="modal-card follower-card" role="dialog" aria-modal="true" aria-labelledby="follower-title">
      <header class="follower-header">
        <div><h2 id="follower-title">Add a feed</h2><p>Search by name or paste a feed URL.</p></div>
        <button type="button" class="close-button" aria-label="Close" title="Close" @click="close">×</button>
      </header>

      <div class="follower-body">
        <div class="channel-field"><label for="follower-channel">Add to channel</label><div class="select is-small"><select id="follower-channel" v-model="channel">
          <option :value="ch" v-text="ch.name" :key="ch.uid" v-for="ch in channels"></option>
        </select></div></div>
        <form class="search-form" @submit.prevent="search">
          <label for="feed-query">Find a feed</label>
          <div class="search-controls"><input type="search" class="input" id="feed-query" placeholder="Name, website or feed URL" v-model="query" ref="query"/>
            <button type="submit" :class="searchClasses" :disabled="!query || loading">Search</button></div>
        </form>
        <p class="search-status" v-if="loading" role="status">Searching…</p>
        <p class="search-status" v-else-if="searched && feeds.length === 0">No feeds matched “{{ query }}”. Try a different name or URL.</p>
        <div v-if="feeds.length" class="results"><h3>Search results <span>{{ feeds.length }}</span></h3>
          <feed-chooser :feed="feed" @showFeed="showFeed(feed)" @addFeed="addFeed(feed)" v-for="feed in feeds" :key="feed.url"/>
        </div>
        <div v-if="timeline.items && timeline.items.length" class="preview"><h3>Feed preview</h3><Timeline :timeline="timeline" :channel="channel" @followFeed="searchForFeed"></Timeline></div>
      </div>
      <footer class="follower-footer"><span>Preview a feed before following it.</span><button type="button" class="button is-small" @click="close">Done</button></footer>
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
          this.query = this.initialQuery || ''
          this.channel = this.initialChannel || this.channels[0] || {}
          this.feeds = []
          this.timeline = {items: [], paging: {}}
          this.searched = false

          this.$nextTick(function () {
            this.$refs.query.focus()
            // Opened from an entry's Follow: the reader already asked for this URL, so run
            // the search instead of leaving an empty box and a modal that looks broken.
            if (this.query) {
              this.search()
            }
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
        if (!this.query.trim() || this.loading) return Promise.resolve()
        const url = this.$store.state.microsubEndpoint + '?action=search&query=' + encodeURIComponent(this.query)
        this.loading = true
        this.timeline = {items: [], paging: {}}
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
      // The previewed items are normal entries with the usual action row, so their Follow
      // has to mean something here too: search for that author instead of doing nothing.
      searchForFeed(url) {
        this.query = url || ''
        this.timeline = {items: [], paging: {}}
        return this.search()
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
.follower-card { width: min(38rem, 94vw); max-height: min(760px, 88vh); border: 1px solid var(--button-border); border-radius: 10px; background: var(--card); box-shadow: 0 20px 60px #0006; overflow: hidden; }
.follower-header { display: flex; justify-content: space-between; gap: 20px; padding: 22px 24px 18px; border-bottom: 1px solid var(--line); }
.follower-header h2 { margin: 0; color: var(--fg); font-size: 1.1rem; font-weight: 650; letter-spacing: -.02em; }
.follower-header p { margin: 4px 0 0; color: var(--muted); font-size: .8rem; }
.close-button { flex: none; display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font-size: 1.3rem; cursor: pointer; }
.close-button:hover { color: var(--fg); background: var(--hover-bg); }
.follower-body { flex: 1 1 auto; overflow-y: auto; padding: 20px 24px 24px; }
.channel-field, .search-form { display: flex; flex-direction: column; gap: 7px; }
.channel-field { margin-bottom: 22px; }
.channel-field .select { align-self: flex-start; }
.channel-field label, .search-form label { color: var(--muted); font-size: .75rem; font-weight: 600; }
.select select { min-width: 190px; height: 34px; border-color: var(--button-border); border-radius: 6px; background: var(--button-bg); color: var(--fg); }
.search-controls { display: flex; gap: 8px; }
.search-controls .input { height: 36px; min-width: 0; border-radius: 6px; font-size: .875rem; }
.search-controls .input::placeholder { color: var(--muted); opacity: 1; }
.search-controls .input:focus { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.search-controls .button { height: 36px; font-size: .8rem; }
.search-controls .button:disabled { background: var(--button-bg); border-color: var(--button-border); color: var(--muted); opacity: .65; }
.search-status { margin-top: 20px; color: var(--muted); font-size: .85rem; }
.results, .preview { margin-top: 26px; }
.results h3, .preview h3 { margin: 0 0 4px; padding-bottom: 10px; border-bottom: 1px solid var(--line); color: var(--fg); font-size: .8rem; font-weight: 600; }
.results h3 span { margin-left: 5px; color: var(--muted); font-weight: 400; }
.preview h3 { margin-bottom: 16px; }
/* Preview entries should be easier to scan than full-size timeline articles. */
.preview ::v-deep .entry .card-content { padding: 14px; }
.preview ::v-deep .entry .content { font-size: .8125rem; line-height: 1.5; }
.preview ::v-deep .entry .title.is-6 { font-size: 1rem; line-height: 1.3; margin: .25rem 0 .5rem; }
.preview ::v-deep .entry .html-body { font-size: .875rem; line-height: 1.55; }
.preview ::v-deep .entry .avatar, .preview ::v-deep .entry .avatar-fallback { width: 32px; height: 32px; font-size: .8rem; }
.preview ::v-deep .entry .media-left { margin-right: 12px; }
.follower-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 24px; border-top: 1px solid var(--line); color: var(--muted); font-size: .75rem; }
@media (max-width: 500px) { .follower-header, .follower-body, .follower-footer { padding-left: 18px; padding-right: 18px; } }
</style>
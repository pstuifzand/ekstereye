<template>
  <div :class="{modal: true, 'is-active': isOpen}">
    <div class="modal-background"></div>
    <div class="modal-card feeds-card" role="dialog" aria-modal="true" aria-labelledby="feeds-title">
      <header class="feeds-header">
        <div><h2 id="feeds-title">Manage feeds</h2><p>Choose a channel to manage its subscriptions.</p></div>
        <button type="button" class="close-button" aria-label="Close" title="Close" @click="close">×</button>
      </header>

      <section class="feeds-body">
        <div class="feed-controls">
          <div class="channel-field">
            <label for="feeds-channel">Channel</label>
            <div class="select is-small"><select id="feeds-channel" v-model="channel" @change="load">
              <option v-for="ch in channels" :key="ch.uid" :value="ch">{{ ch.name }}</option>
            </select></div>
          </div>
          <button type="button" class="toolbar-button toolbar-primary add-feed" :disabled="!channel.uid" @click="addFeed"><span aria-hidden="true">+</span> Add feed</button>
        </div>
        <div class="list-heading"><h3>Subscriptions</h3><span v-if="!loading && !loadError">{{ feeds.length }}</span></div>
        <p v-if="loading" class="feed-empty" role="status">Loading feeds…</p>
        <div v-else-if="loadError" class="feed-empty" role="alert"><p>Couldn’t load feeds for this channel.</p><button type="button" class="button is-small retry" @click="load">Try again</button></div>
        <div v-else-if="feeds.length === 0" class="feed-empty"><p>No feeds in {{ channel.name || 'this channel' }} yet.</p><span>Add a feed to start following it here.</span></div>
        <ul v-else class="feed-list">
          <li v-for="feed in feeds" :key="feed.url" class="feed-row">
            <div class="feed-text">
              <a :href="feed.url" target="_blank" rel="noopener noreferrer">{{ feed.name || feed.url }}</a>
              <span v-if="feed.name" class="feed-url">{{ feed.url }}</span>
            </div>
            <button type="button" class="remove-button" :disabled="Boolean(removing)" :aria-label="'Remove ' + (feed.name || feed.url)" @click="unfollow(feed)">{{ removing === feed.url ? 'Removing…' : 'Remove' }}</button>
          </li>
        </ul>
      </section>
      <footer class="feeds-footer"><span>Feeds are managed per channel.</span><button type="button" class="button is-small" @click="close">Done</button></footer>
    </div>
  </div>
</template>

<script>
  import modalA11y from '@/modal-a11y'

  export default {
    name: 'FeedsModal',
    mixins: [modalA11y],
    props: ['isOpen', 'initialChannel'],

    data() {
      return {
        channel: {},
        feeds: [],
        loading: false,
        loadError: false,
        loadSequence: 0,
        removing: null
      }
    },

    computed: {
      channels() {
        return this.$store.state.channels || []
      }
    },

    watch: {
      // eslint-disable-next-line no-unused-vars
      isOpen(open, wasOpen) {
        if (!open) {
          return
        }
        this.channel = this.initialChannel && this.initialChannel.uid
          ? this.initialChannel
          : (this.channels[0] || {})
        this.load()
      }
    },

    methods: {
      close() {
        this.$emit('close')
      },
      load() {
        const uid = this.channel && this.channel.uid
        if (!uid) {
          this.loadSequence++
          this.loading = false
          this.loadError = false
          this.feeds = []
          return Promise.resolve([])
        }
        const sequence = ++this.loadSequence
        this.loading = true
        this.loadError = false
        return this.$store.dispatch('fetchFeeds', uid)
          .then(feeds => { if (sequence === this.loadSequence) this.feeds = feeds })
          .catch(() => { if (sequence === this.loadSequence) { this.feeds = []; this.loadError = true } })
          .then(() => { if (sequence === this.loadSequence) this.loading = false })
      },
      // Following is a decision, not a keystroke: hand the URL to the follower, which
      // searches, lists the candidate feeds and previews their items. The old input here
      // went straight to POST ?action=follow, so a typo subscribed you to anything.
      addFeed() {
        this.$emit('browse', this.channel)
      },
      unfollow(feed) {
        const channelUid = this.channel.uid
        this.removing = feed.url
        return this.$store.dispatch('unfollowFeed', {channel: channelUid, url: feed.url})
          .then(() => {
            if (this.channel.uid === channelUid) this.load()
            this.$store.dispatch('fetchTimeline', {uid: channelUid})
          })
          .catch(() => {})
          .then(() => { this.removing = null })
      }
    }
  }
</script>

<style scoped>
.feeds-card { width: min(38rem, 94vw); max-height: min(720px, 88vh); border: 1px solid var(--button-border); border-radius: 10px; background: var(--card); box-shadow: 0 20px 60px #0006; overflow: hidden; }
.feeds-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 22px 24px 18px; border-bottom: 1px solid var(--line); }
.feeds-header h2 { margin: 0; color: var(--fg); font-size: 1.1rem; font-weight: 650; letter-spacing: -.02em; }
.feeds-header p { margin: 4px 0 0; color: var(--muted); font-size: .8rem; }
.close-button { flex: none; display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font-size: 1.3rem; cursor: pointer; }
.close-button:hover { color: var(--fg); background: var(--hover-bg); }
.feeds-body { flex: 1 1 auto; overflow-y: auto; padding: 20px 24px 24px; }
.feed-controls { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 28px; }
.channel-field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.channel-field label { color: var(--muted); font-size: .75rem; font-weight: 600; }
.select select { min-width: 190px; max-width: 100%; height: 34px; border-color: var(--button-border); border-radius: 6px; background: var(--button-bg); color: var(--fg); }
.add-feed { height: 34px; }
.add-feed span { font-size: 1rem; }
.add-feed:disabled { opacity: .5; cursor: not-allowed; }
.list-heading { display: flex; align-items: center; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
.list-heading h3 { color: var(--fg); font-size: .8rem; font-weight: 600; margin: 0; }
.list-heading span { color: var(--muted); font-size: .75rem; }
.feed-empty { padding: 28px 0 12px; color: var(--muted); font-size: .85rem; }
.feed-empty p { color: var(--fg); margin: 0 0 4px; }
.feed-empty span { font-size: .8rem; }
.retry { margin-top: 10px; }
.feed-list { list-style: none; margin: 0; padding: 0; }
.feed-row { display: flex; align-items: center; gap: 16px; padding: 13px 0; border-bottom: 1px solid var(--line); }
.feed-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.feed-text a { color: var(--fg); font-size: .85rem; font-weight: 600; overflow-wrap: anywhere; }
.feed-text a:hover { color: var(--accent); }
.feed-url { color: var(--muted); font-size: .75rem; overflow-wrap: anywhere; }
.remove-button { flex: none; padding: 6px 8px; border: 0; border-radius: 5px; background: transparent; color: var(--muted); font: inherit; font-size: .75rem; cursor: pointer; }
.remove-button:hover { background: var(--hover-bg); color: var(--fg); }
.remove-button:disabled { opacity: .6; cursor: wait; }
.feeds-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 24px; border-top: 1px solid var(--line); color: var(--muted); font-size: .75rem; }
@media (max-width: 500px) { .feeds-header, .feeds-body { padding-left: 18px; padding-right: 18px; } .feeds-footer { padding-left: 18px; padding-right: 18px; } .select select { min-width: 0; width: 100%; } .channel-field { flex: 1; } }
</style>

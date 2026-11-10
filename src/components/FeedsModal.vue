<template>
  <div :class="{modal: true, 'is-active': isOpen}">
    <div class="modal-background"></div>
    <div class="modal-card feeds-card" role="dialog" aria-modal="true" aria-label="Feeds">
      <header class="modal-card-head">
        <p class="modal-card-title">Feeds</p>
        <button class="delete" aria-label="close" @click="close"></button>
      </header>

      <section class="modal-card-body">
        <div class="field is-grouped">
          <div class="control">
            <div class="select">
              <select v-model="channel" @change="load">
                <option v-for="ch in channels" :key="ch.uid" :value="ch">{{ ch.name }}</option>
              </select>
            </div>
          </div>
          <div class="control is-expanded">
            <input
              class="input"
              type="url"
              ref="url"
              placeholder="https://example.com/feed.xml"
              v-model="url"
              @keypress.enter="follow"
            />
          </div>
          <div class="control">
            <button class="button is-primary" :class="{'is-loading': following}" :disabled="!url" @click="follow">Follow</button>
          </div>
        </div>

        <p class="feed-hint">
          Add a feed by URL, or
          <a href="#" @click.prevent="$emit('browse', channel)">search for one</a>.
        </p>

        <p v-if="loading" class="feed-empty">Loading feeds…</p>
        <p v-else-if="feeds.length === 0" class="feed-empty">
          No feeds in {{ channel.name || 'this channel' }} yet.
        </p>
        <ul v-else class="feed-list">
          <li v-for="feed in feeds" :key="feed.url" class="feed-row">
            <div class="feed-text">
              <a :href="feed.url" target="_blank" rel="noopener noreferrer">{{ feed.name || feed.url }}</a>
              <span v-if="feed.name" class="feed-url">{{ feed.url }}</span>
            </div>
            <button class="button is-small" @click="unfollow(feed)">Remove</button>
          </li>
        </ul>
      </section>

      <footer class="modal-card-foot">
        <span class="feed-count">{{ feeds.length }} {{ feeds.length === 1 ? 'feed' : 'feeds' }}</span>
      </footer>
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
        url: '',
        loading: false,
        following: false
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
        this.url = ''
        this.channel = this.initialChannel && this.initialChannel.uid
          ? this.initialChannel
          : (this.channels[0] || {})
        this.load()
        this.$nextTick(() => {
          if (this.$refs.url) {
            this.$refs.url.focus()
          }
        })
      }
    },

    methods: {
      close() {
        this.$emit('close')
      },
      load() {
        const uid = this.channel && this.channel.uid
        if (!uid) {
          this.feeds = []
          return Promise.resolve([])
        }
        this.loading = true
        return this.$store.dispatch('fetchFeeds', uid)
          .then(feeds => { this.feeds = feeds })
          .catch(() => { this.feeds = [] })
          .then(() => { this.loading = false })
      },
      follow() {
        const url = (this.url || '').trim()
        if (!url || !this.channel.uid) {
          return
        }
        this.following = true
        return this.$store.dispatch('followFeed', {channel: this.channel.uid, url: url})
          .then(() => {
            this.url = ''
            this.following = false
            this.load()
            this.$store.dispatch('fetchTimeline', {uid: this.channel.uid})
          })
          .catch(() => { this.following = false })
      },
      unfollow(feed) {
        return this.$store.dispatch('unfollowFeed', {channel: this.channel.uid, url: feed.url})
          .then(() => {
            this.load()
            this.$store.dispatch('fetchTimeline', {uid: this.channel.uid})
          })
          .catch(() => {})
      }
    }
  }
</script>

<style scoped>
  .feeds-card {
    width: min(44rem, 94vw);
  }

  .feed-hint {
    margin: 8px 0 16px;
    color: var(--muted, #7a7a7a);
    font-size: 0.85rem;
  }

  .feed-empty {
    padding: 12px 0;
    color: var(--muted, #7a7a7a);
  }

  .feed-list {
    list-style: none;
    margin: 0;
  }

  .feed-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-top: 1px solid var(--line, #e4e4e4);
  }

  .feed-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .feed-url {
    color: var(--muted, #7a7a7a);
    font-size: 0.78rem;
    overflow-wrap: anywhere;
  }

  .feed-count {
    color: var(--muted, #7a7a7a);
    font-size: 0.85rem;
  }

  /* Bulma paints the head and foot whitesmoke, which is a white slab in the dark theme. */
  .modal-card-head,
  .modal-card-foot {
    background: var(--card, #fff);
    color: var(--fg, #2f2f2f);
    border-color: var(--line, #e4e4e4);
  }

  .modal-card-body {
    background: var(--card, #fff);
    color: var(--fg, #2f2f2f);
  }

  .select select {
    background: var(--card, #fff);
    color: var(--fg, #2f2f2f);
    border-color: var(--line, #e4e4e4);
  }
</style>

<template>
  <section class="thread" aria-label="Conversation" @click.stop>
    <header class="thread-header">
      <h4 class="thread-title">Conversation</h4>
      <button type="button" class="thread-close" @click.prevent="$emit('close')">Close</button>
    </header>

    <p v-if="loading" class="thread-status">Loading conversation…</p>
    <p v-else-if="unsupported" class="thread-status">
      This server does not support threads. Only this post is shown.
    </p>
    <p v-else-if="error" class="thread-status thread-error">
      {{ error }}
      <button type="button" class="thread-retry" @click.prevent="load">Try again</button>
    </p>

    <template v-else>
      <p v-if="thread.missing" class="thread-status">
        {{ thread.missing }} earlier {{ thread.missing === 1 ? 'post' : 'posts' }} on the original site not shown.
      </p>
      <ol class="thread-list">
        <li v-for="row in rows" :key="row.key" class="thread-item"
            :class="{'is-current': isCurrent(row.item)}"
            :style="{marginLeft: Math.min(row.depth, MAX_INDENT) * 20 + 'px'}">
          <div class="thread-meta">
            <a v-if="authorUrl(row.item)" :href="authorUrl(row.item)" target="_blank" rel="noopener noreferrer">{{ authorName(row.item) }}</a>
            <span v-else>{{ authorName(row.item) }}</span>
            &middot;
            <a :href="row.item.url" target="_blank" rel="noopener noreferrer" :title="absolute(row.item)">{{ stamp(row.item) }}</a>
            <span v-if="isCurrent(row.item)" class="thread-you">this post</span>
          </div>
          <h5 v-if="row.item.name" class="thread-name" v-text="row.item.name"></h5>
          <div v-if="html(row.item)" class="content html-body" v-html="html(row.item)"></div>
          <div v-else-if="text(row.item)" class="content html-body is-pre" v-text="text(row.item)"></div>
        </li>
      </ol>
      <p v-if="thread.partial" class="thread-status">
        This is not the whole conversation: only posts this server knows about are shown.
      </p>
    </template>
  </section>
</template>

<script>
import { stamp, absoluteTime } from '@/relative-time'
import { sanitizeHtml } from '@/sanitize'
import { buildThreadRows } from '@/thread'

export default {
  name: 'Thread',

  props: {
    item: { type: Object, required: true }
  },

  data() {
    return {
      MAX_INDENT: 6,
      loading: false,
      unsupported: false,
      error: '',
      items: [],
      thread: {},
      // A slow answer for an entry the reader has already left must not replace the
      // answer for the one on screen.
      requestId: 0
    }
  },

  computed: {
    rows() {
      return buildThreadRows(this.items)
    }
  },

  watch: {
    item() {
      this.load()
    }
  },

  mounted() {
    this.load()
  },

  methods: {
    load() {
      const id = ++this.requestId
      this.loading = true
      this.unsupported = false
      this.error = ''
      const query = this.item._id
        ? { entry: this.item._id, channel: this.channelUid() }
        : { url: this.item.url }
      return this.$store.dispatch('fetchThread', query)
        .then((response) => {
          if (id !== this.requestId) return
          this.items = response.items
          this.thread = response.thread
        })
        .catch((error) => {
          if (id !== this.requestId) return
          this.items = []
          this.thread = {}
          // Microsub has no capability declaration: 400 is how a server without the
          // extension says so, and the entry on its own is the right fallback.
          if (error && error.status === 400) {
            this.unsupported = true
          } else if (error && error.status === 404) {
            this.error = 'The server could not find a conversation for this post.'
          } else {
            this.error = (error && error.message) || 'Could not load the conversation.'
          }
        })
        .then(() => {
          if (id === this.requestId) this.loading = false
        })
    },
    channelUid() {
      const channel = this.$store.state.channel
      return (channel && channel.uid) || ''
    },
    isCurrent(item) {
      if (this.item._id && item._id) return item._id === this.item._id
      return Boolean(item.url) && item.url === this.item.url
    },
    authorName(item) {
      const author = item.author || {}
      if (author.name) return author.name
      if (author.url) {
        try {
          return new URL(author.url).hostname
        } catch (e) {
          return author.url
        }
      }
      return 'anonymouse'
    },
    authorUrl(item) {
      return (item.author && item.author.url) || ''
    },
    // Ancestors fetched from other sites often have no date; stamp() would show today's.
    stamp(item) {
      return item.published ? stamp(item.published) : 'undated'
    },
    absolute(item) {
      return item.published ? absoluteTime(item.published) : ''
    },
    raw(item) {
      const source = item.content || item.summary
      return Array.isArray(source) ? source[0] : source
    },
    // Ancestors come from sites the feed chose, not the user: sanitize like any feed item.
    html(item) {
      const content = this.raw(item)
      if (content && typeof content === 'object' && typeof content.html === 'string') {
        return sanitizeHtml(content.html, item.url)
      }
      return ''
    },
    text(item) {
      const content = this.raw(item)
      if (typeof content === 'string') return content
      return (content && typeof content.text === 'string') ? content.text : ''
    }
  }
}
</script>

<style scoped>
  /* Every colour comes from the theme variables: the global link colour and the browser's
     button font otherwise leak in (purple dates, an oversized Close). */
  .thread { margin: 20px auto 0; max-width: 780px; padding: 0 36px 36px; color: var(--fg); font-size: .95rem; }
  .thread-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line); padding-bottom: 8px; margin-bottom: 12px; }
  .thread-title { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 0; }
  .thread-close { font: inherit; font-size: .75rem; line-height: 1; padding: 5px 10px; border: 1px solid var(--button-border); border-radius: 6px; background: var(--button-bg); color: var(--button-fg); cursor: pointer; transition: background-color .15s, border-color .15s; }
  .thread-close:hover { background: var(--hover-bg); border-color: var(--accent); }
  .thread-status { color: var(--muted); font-size: .8rem; margin: 8px 0; }
  .thread-error { color: var(--danger, #b3261e); }
  .thread-retry { font: inherit; padding: 0; border: 0; background: none; color: var(--accent); text-decoration: underline; cursor: pointer; }
  .thread-list { list-style: none; margin: 0; padding: 0; }
  .thread-item { padding: 10px 14px; border-left: 3px solid var(--line); border-radius: 0 6px 6px 0; margin-bottom: 8px; background: var(--card); }
  .thread-item.is-current { border-left-color: var(--accent); background: var(--sel); }
  .thread-meta { font-size: .75rem; color: var(--muted); }
  .thread-meta a { color: var(--muted); text-decoration: none; }
  .thread-meta a:hover { color: var(--fg); text-decoration: underline; }
  .thread-you { margin-left: 8px; padding: 1px 7px; border-radius: 999px; border: 1px solid var(--accent); color: var(--accent); font-size: .7rem; }
  .thread-name { font-size: 1rem; font-weight: 600; color: var(--fg); margin: 4px 0; }
  .thread-item .content { color: var(--fg); margin-top: 4px; }
  .thread-item .content ::v-deep a { color: var(--accent); }
</style>

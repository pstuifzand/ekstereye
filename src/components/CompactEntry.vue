<template>
  <article class="compact-entry" :class="{selected: isSelected, unread: !item._is_read}" role="button" tabindex="0" :aria-pressed="isSelected" @click="select" @keydown.enter.prevent="select" @keydown.space.prevent="select">
    <div class="compact-meta">
      <span class="compact-author">{{ author }}</span>
      <time v-if="item.published" :title="absoluteTime(item.published)">{{ stamp(item.published) }}</time>
    </div>
    <h2 v-if="item.name" class="compact-title">{{ item.name }}</h2>
    <p v-else-if="refLine" class="compact-title compact-ref">
      <span class="compact-ref-glyph" aria-hidden="true">{{ refGlyph }}</span> {{ refLine }}
    </p>
    <p v-else class="compact-title">{{ excerpt }}</p>
    <p v-if="item.name && excerpt" class="compact-excerpt">{{ excerpt }}</p>
  </article>
</template>

<script>
import { stamp, absoluteTime } from '@/relative-time'
import { entryKind } from '@/entry-kind'
import { refEntry, refGlyph, refTarget, refSummary } from '@/refs'

export default {
  name: 'CompactEntry',
  props: { item: Object, isSelected: Boolean },
  computed: {
    author() {
      return this.item.author && (this.item.author.name || this.item.author.url) || 'Unknown author'
    },
    excerpt() {
      const text = (this.item.content && (this.item.content.text || this.item.content.html) || '')
        .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      return text.length > 150 ? text.slice(0, 147) + '…' : text
    },
    currentItem() {
      if (this.item['like-of'] || this.item['repost-of'] || this.item['bookmark-of']) {
        return this.item.refs && this.item.refs[this.item['like-of'] || this.item['repost-of'] || this.item['bookmark-of']] || this.item
      }
      return this.item
    },
    kind() {
      return entryKind(this.item)
    },
    refGlyph() {
      return refGlyph(this.item)
    },
    // A like or bookmark carries no text of its own, so the row would otherwise be an
    // empty title. Say what happened and to what.
    refLine() {
      if (!refEntry(this.item) || this.item.name || this.excerpt) {
        return ''
      }
      // Only a real refs entry may lend its title or author; without one the bookmark's
      // own author is not the author of the page it points at.
      const refs = this.item.refs || {}
      return refSummary(this.item, refs[refTarget(this.item)] || null)
    }
  },
  methods: {
    stamp,
    absoluteTime,
    select() {
      this.$emit('markRead', this.item)
      this.$emit('select')
    },
    markRead() {
      this.$emit('markRead', this.item)
    },
    like() {
      const url = this.currentItem.url
      if (!url) return
      this.$store.dispatch('micropubPost', {
        post: {type: ['h-entry'], properties: {'like-of': [url]}},
        success: 'Liked', failure: 'Like failed'
      }).catch(() => {})
    },
    openReply() {
      this.$emit('reply')
    }
  }
}
</script>

<style scoped>
.compact-entry {
  padding: 15px 20px;
  margin: 0;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
  cursor: pointer;
  transition: background-color .15s ease;
  outline-offset: -3px;
}
.compact-entry:hover { background: var(--hover-bg); }
.compact-entry.selected { box-shadow: inset 3px 0 var(--accent); background: var(--sel); }
.compact-entry.unread .compact-title { font-weight: 700; }
.compact-meta { display: flex; justify-content: space-between; gap: 8px; color: var(--muted, #7a7a7a); font-size: .76rem; }
.compact-meta time { flex: none; }
.compact-author { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.compact-title { margin: 4px 0 0; color: var(--fg, #2f2f2f); font-size: .875rem; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
.compact-ref-glyph { color: var(--accent, #5757e8); margin-right: 5px; }
.compact-excerpt { margin: 7px 0 0; color: var(--muted, #7a7a7a); font-size: .78rem; line-height: 1.5; }
</style>

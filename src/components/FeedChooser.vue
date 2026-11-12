<template>
  <div class="result">
    <div class="feed-icon"><img v-if="feed.photo && !imageFailed" :src="feed.photo" alt="" @error="imageFailed = true"/><span v-else aria-hidden="true">{{ (feed.name || feed.url || 'F').charAt(0).toUpperCase() }}</span></div>
    <div class="feed-text"><div class="feed-name">{{ feed.name || feed.url }}</div><div v-if="feed.name" class="feed-url">{{ feed.url }}</div></div>
    <div class="feed-actions"><button :class="buttonClasses" :disabled="feed.loading" @click="showFeed">Preview</button>
    <button :class="buttonClasses" :disabled="feed.loading" @click="addFeed">Follow</button></div>
  </div>
</template>
<script>
  export default {
    name: 'feed-chooser',
    props: ['feed'],
    data() { return { imageFailed: false } },

    computed: {
      buttonClasses() {
        return {'button': true, 'is-small': true}
      }
    },

    methods: {
      showFeed(feed) {
        this.$emit('showFeed', feed)
      },
      addFeed(feed) {
        this.$emit('addFeed', feed)
      }
    }

  }
</script>
<style scoped>
.result { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.feed-icon { display: grid; place-items: center; flex: none; width: 36px; height: 36px; overflow: hidden; border-radius: 7px; background: var(--sel); color: var(--muted); font-size: .85rem; font-weight: 600; }
.feed-icon img { width: 100%; height: 100%; object-fit: cover; }
.feed-text { flex: 1; min-width: 0; }
.feed-name { color: var(--fg); font-size: .85rem; font-weight: 600; overflow-wrap: anywhere; }
.feed-url { color: var(--muted); font-size: .75rem; overflow-wrap: anywhere; }
.feed-actions { display: flex; flex: none; gap: 6px; }
@media (max-width: 500px) { .result { flex-wrap: wrap; } .feed-actions { margin-left: 48px; } }
</style>
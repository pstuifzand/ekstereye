<template>
  <div class="channel-list">
    <div class="channel-list-heading"><span>Channels</span><button type="button" class="new-channel" @click="open" aria-label="New channel" title="New channel">+</button></div>
    <div class="channels--channel" v-for="channel in orderedChannels" :key="channel.uid">
      <slot :channel="channel"></slot>
    </div>
  </div>
</template>

<script>
  export default {
    name: "Channels",
    props: ['channels'],
    computed: {
      orderedChannels() {
        // Unread channels first, then alphabetical: a list of twenty-five should not
        // bury the ones with something in them.
        return [...(this.channels || [])].sort((a, b) => {
          const unread = (b.unread || 0) - (a.unread || 0)
          return unread !== 0 ? unread : (a.name || '').localeCompare(b.name || '')
        })
      }
    },
    methods: {
      open() {
        this.$store.dispatch('openChannelCreator')
      }
    }
  }
</script>

<style scoped>
.channel-list { padding: 0 0 20px; }
.channel-list-heading { display: flex; align-items: center; justify-content: space-between; min-height: 32px; margin: 0 4px 8px; padding-left: 8px; color: var(--muted); font-size: .75rem; font-weight: 600; }
.new-channel { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 5px; background: transparent; color: var(--muted); font: inherit; font-size: 1.1rem; cursor: pointer; }
.new-channel:hover { background: var(--hover-bg); color: var(--fg); }
</style>

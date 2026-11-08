<template>
  <div>
    <div class="channels--channel" v-for="channel in orderedChannels" :key="channel.uid">
      <slot :channel="channel"></slot>
    </div>
    <button class="button is-primary is-small" @click="open">New Channel</button>
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

</style>

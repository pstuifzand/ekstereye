<template>
  <div>
    <div class="channels--channel" v-for="channel in channels" :key="channel.uid">
      <slot :channel="channel"></slot>
    </div>
    <button class="button is-primary" @click="open">+ New Channel</button>
  </div>
</template>

<script>
  import ChannelCreator from "./ChannelCreator";
  export default {
    name: "Channels",
    components: {ChannelCreator},
    props: ['channels'],
    methods: {
      open() {
        this.$store.dispatch('openChannelCreator')
      }
    }
  }
</script>

<style scoped>

</style>

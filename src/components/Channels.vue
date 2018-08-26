<template>
  <div :class="this.className">
    <div class="channels--channel" v-for="channel in channels" :key="channel.uid">
      <slot :channel="channel"></slot>
    </div>
  </div>
</template>

<script>
  export default {
    name: "Channels",
    props: ['className', 'channels']
  }
</script>

<style scoped>
</style>
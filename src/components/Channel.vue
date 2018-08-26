<template>
  <div class="channel--name" @click="select(channel)">
    {{ channel.name }} <span :class="{ tag: true, 'is-success': channel.unread > 0}">{{ channel.unread }}</span>
  </div>
</template>

<script>
  export default {
    name: "Channel",

    props: ['channel'],

    methods: {
      select(channel) {
        this.$emit('channel-selected', channel)
      }
    }

  }
</script>

<style scoped>
  .channel--name {
    cursor: pointer;
    padding: 8px;
  }
  .channel--name:hover {
    background: aliceblue;
    color: black;
  }
</style>
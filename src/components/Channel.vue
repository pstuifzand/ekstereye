<template>
  <div class="channel--name">
    <router-link :to='"/channel/" + channel.uid'>
      {{ channel.name }}
      <span :class="{ tag: true, 'is-success': channel.unread > 0}">{{ channel.unread }}</span>
    </router-link>
  </div>
</template>

<script>
  export default {
    name: "Channel",
    props: ['channel']
  }
</script>

<style scoped>
  .channel--name {
    cursor: pointer;
    padding: 8px;
  }
</style>
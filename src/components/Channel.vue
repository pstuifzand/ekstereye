<template>
  <div class="channel--name">
    <router-link :to='"/channel/" + channel.uid' :title="channel.unread + ' unread'">
      <span class="channel--title">{{ channel.name }}</span>
      <span v-if="channel.unread > 0" class="channel--count">{{ shortCount }}</span>
    </router-link>
  </div>
</template>

<script>
  export default {
    name: "Channel",
    props: ['channel'],
    computed: {
      // Twenty thousand unread is a number, not a badge: keep it to three characters
      // of noise next to the name.
      shortCount() {
        const count = this.channel.unread || 0
        if (count >= 1000000) {
          return Math.round(count / 100000) / 10 + 'm'
        }
        if (count >= 1000) {
          return Math.round(count / 100) / 10 + 'k'
        }
        return String(count)
      }
    }
  }
</script>

<style scoped>
  .channel--name {
    cursor: pointer;
    padding: 4px 8px;
  }

  .channel--name a {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    color: #363636;
  }

  .channel--name a:hover .channel--title {
    text-decoration: underline;
  }

  .channel--count {
    font-size: .75rem;
    color: #8a8a8a;
    font-variant-numeric: tabular-nums;
  }
</style>
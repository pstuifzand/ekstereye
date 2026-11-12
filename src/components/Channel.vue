<template>
  <div class="channel--name">
    <router-link :to='"/channel/" + channel.uid' :class="{'is-current': isCurrent}" :aria-current="isCurrent ? 'page' : null" :title="channel.unread + ' unread'">
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
      isCurrent() {
        return this.$store.state.channel && this.$store.state.channel.uid === this.channel.uid
      },
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
    padding: 1px 0;
  }

  .channel--name a {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    color: var(--muted, #8a8a8a);
    min-height: 32px;
    padding: 7px 12px;
    border-radius: 5px;
    font-size: .8125rem;
    line-height: 1.3;
    transition: background .15s, color .15s;
  }

  .channel--name a:hover, .channel--name a.is-current {
    background: var(--sel);
    color: var(--fg);
    text-decoration: none;
  }

  .channel--name a.is-current { font-weight: 600; }
  .channel--title { overflow-wrap: anywhere; }

  .channel--count {
    font-size: .7rem;
    color: var(--muted, #8a8a8a);
    font-variant-numeric: tabular-nums;
    flex: none;
    padding: 1px 2px;
  }
</style>
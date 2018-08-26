<template>
  <div class="home">
    <div class="columns">
      <div class="column is-2">
        <Channels class="channels" :channels="this.$store.state.channels">
          <div slot-scope="{ channel }">
            <Channel :channel="channel" @channel-selected="selectChannel"></Channel>
          </div>
        </Channels>
      </div>
      <div class="column">
        <Timeline class="timeline" :timeline="this.$store.state.timeline" :channel="this.$store.state.channel"
                  @getPage="getPage"></Timeline>
      </div>
    </div>
  </div>
</template>

<script>
  // @ is an alias to /src
  import Timeline from '@/components/Timeline.vue'
  import Channels from '@/components/Channels.vue'
  import Channel from '@/components/Channel.vue'

  export default {
    name: 'home',
    components: {
      Timeline,
      Channels,
      Channel
    },

    data() {
      return {
        showChannels: false
      }
    },

    computed: {
      uid() {
        return this.$route.params.uid || 'home';
      }
    },

    methods: {
      selectChannel(channel) {
        this.$store.dispatch('fetchTimeline', channel)
        this.showChannels = false
        window.scrollTo({top: 0})
      },
      getPage(next) {
        this.$store.dispatch('fetchTimeline', next)
        window.scrollTo({top: 0})
      }
    },

    mounted() {
      if (this.$store.state.logged_in) {
        this.$store.dispatch('fetchChannels')
        this.$store.dispatch('fetchTimeline', {uid: this.uid})
      }
    }
  }
</script>

<style scoped>
  .timeline {
    margin-top: 20px;
    width: 600px;
  }
</style>
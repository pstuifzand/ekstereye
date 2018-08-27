<template>
  <div class="home">
    <Channels class="channels" :channels="this.$store.state.channels">
      <div slot-scope="{ channel }">
        <Channel :channel="channel" @channel-selected="selectChannel"></Channel>
      </div>
    </Channels>

    <Timeline class="timeline" :timeline="this.$store.state.timeline" :channel="this.$store.state.channel"
              @getPage="getPage"></Timeline>
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

    computed: {
      uid() {
        return this.$route.params.uid || 'home';
      }
    },

    methods: {
      selectChannel(channel) {
        this.$store.dispatch('switchChannel', channel).then(() => {
          this.$store.dispatch('fetchTimeline', channel).then(() => {
            window.scrollTo({top: 0})
          })
        })
      },
      getPage(next) {
        this.$store.dispatch('fetchTimeline', next).then(() => {
          window.scrollTo({top: 0})
        })
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
    position: absolute;
    left: 270px;

    padding-bottom: 100px;
  }

  .channels {
    position: fixed;
    top: 52px;
    height: calc(100vh - 52px);
    width: 250px;
    overflow-y: scroll;
    overflow-x: hidden;
    padding-bottom: 100px;
  }
</style>
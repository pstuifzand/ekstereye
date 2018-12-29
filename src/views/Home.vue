<template>
  <div class="home columns">
    <Channels class="channels column" :channels="this.$store.state.channels">
      <div slot-scope="{ channel }">
        <Channel :channel="channel" @channel-selected="selectChannel"></Channel>
      </div>
    </Channels>

    <div class="timeline column is-three-fifths">
      <button class="button" @click="openFeedFollower">Add feed</button>
      <new-post class="mt-20"></new-post>
      <h1 class="title is-5 mt-20">{{ channel.name }}</h1>
      <Timeline style="margin-top:20px" :timeline="this.$store.state.timeline" :channel="channel"
                @getPage="getPage" @followFeed="openFeedFollower(arguments[0])"></Timeline>
    </div>

    <div class="column"></div>

    <channel-creator :is-open="this.$store.state.channelCreatorIsOpen"></channel-creator>
    <feed-follower :is-open="feedFollowerIsOpen" @close="closeFeedFollower" :initial-channel="channel" :initial-query="feedFollowerQuery"></feed-follower>
  </div>
</template>

<script>
  import Timeline from '../components/Timeline.vue'
  import Channels from '../components/Channels.vue'
  import Channel from '../components/Channel.vue'
  import ChannelCreator from '../components/ChannelCreator.vue'
  import FeedFollower from "../components/FeedFollower"
  import NewPost from "../components/NewPost"

  export default {
    name: 'home',
    components: {
      FeedFollower,
      Timeline,
      Channels,
      Channel,
      ChannelCreator,
      NewPost
    },

    data() {
      return {
        feedFollowerIsOpen: false,
        feedFollowerQuery: ''
      }
    },

    computed: {
      uid() {
        return this.$route.params.uid || 'home';
      },
      channel() {
        return this.$store.state.channel
      }
    },

    methods: {
      openFeedFollower(query) {
        // eslint-disable-next-line
        console.log(query)
        this.feedFollowerIsOpen = true
        this.feedFollowerQuery = query
      },
      closeFeedFollower() {
        this.feedFollowerIsOpen = false
      },
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

    watch: {
      '$route'(to, from) {
        if (to === from) {
          this.$forceUpdate()
        }
        this.$store.dispatch('fetchChannels')
        this.$store.dispatch('fetchTimeline', {uid: to.params.uid}).then(() => {
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
    padding-bottom: 100px;
  }

  .channels {
    position: sticky;
    top: 40px;
    max-height: calc(100vh - 40px);
    overflow-y: scroll;
    overflow-x: hidden;
    padding-bottom: 100px;
  }
</style>
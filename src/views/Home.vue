<template>
  <div class="home columns">
    <div class="column" style="padding-top: 20px">
      <button class="channels-toggle button" type="button" @click="showChannels">Channels</button>

      <Channels :class="channelsClass" :channels="this.channels">
        <div slot-scope="{ channel }">
          <Channel :channel="channel" @channel-selected="selectChannel"></Channel>
        </div>
      </Channels>
    </div>

    <div class="timeline column is-three-fifths">
      <div class="level is-mobile">
        <div class="level-left">
          <h1 class="title is-5">{{ channel.name }}</h1>
        </div>
        <div class="level-right timeline-buttons">
          <div class="level-item">
            <button class="button is-small" @click.prevent="openPost">New Post</button>
            <button class="button is-small" @click.prevent="openFeedFollower('')">Add feed</button>
          </div>
        </div>
      </div>
      <new-post class="mt-20" v-if="showPost" @close="showPost = false"></new-post>
      <Timeline style="margin-top:20px" :timeline="this.$store.state.timeline" :channel="channel"
                @getPage="getPage" @followFeed="openFeedFollower(arguments[0])"></Timeline>
    </div>

    <div class="column">
      <short-timeline :timeline="this.$store.state.globalTimeline"></short-timeline>
    </div>

    <channel-creator :is-open="this.$store.state.channelCreatorIsOpen"></channel-creator>
    <feed-follower :is-open="feedFollowerIsOpen" @close="closeFeedFollower" :initial-channel="channel" :initial-query="feedFollowerQuery"></feed-follower>
    <search-popup :is-open="searchPopupIsOpen"></search-popup>
    <DebugModal :active="this.$store.state.debugVisible"
                :item="this.$store.state.debugItem"></DebugModal>
  </div>
</template>

<script>
  import Timeline from '../components/Timeline.vue'
  import Channels from '../components/Channels.vue'
  import Channel from '../components/Channel.vue'
  import ChannelCreator from '../components/ChannelCreator.vue'
  import FeedFollower from "../components/FeedFollower"
  import NewPost from "../components/NewPost"
  import ShortTimeline from "../components/ShortTimeline";
  import SearchPopup from "../components/SearchPopup";
  import DebugModal from "../components/DebugModal";

  export default {
    name: 'home',
    components: {
      FeedFollower,
      Timeline,
      Channels,
      Channel,
      ChannelCreator,
      NewPost,
      ShortTimeline,
      SearchPopup,
      DebugModal
    },

    data() {
      return {
        feedFollowerIsOpen: false,
        feedFollowerQuery: '',
        showPost: false,
        channelsVisible: false,
      }
    },

    computed: {
      uid() {
        return this.$route.params.uid || 'home';
      },
      channel() {
        return this.$store.state.channel
      },
      channels() {
        return this.$store.state.channels
      },
      channelsClass () {
        return {
          'channels-open': this.channelsVisible,
          'channels': true
        }
      },
      searchPopupIsOpen () {
        return this.$store.state.searchPopupIsOpen
      }
    },

    methods: {
      openFeedFollower(query) {
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
      },
      openPost() {
        this.showPost = true
      },
      showChannels () {
        this.channelsVisible = !this.channelsVisible
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
  .home {
    padding: 10px;
  }

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
    display: none;
  }

  .channels-open {
    display: block;
  }

  .timeline-buttons {
    display: flex;
    flex-direction: row;
  }

  .timeline-buttons .level-item .button + .button {
    margin-left: 12px;
  }

  @media screen and (min-width: 600px) {
    .channels-toggle {
      display: none;
    }
    .channels {
      display: block !important;
    }
  }
</style>

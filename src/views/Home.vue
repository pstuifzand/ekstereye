<template>
  <div class="home" :class="{'three-column': threeColumn}">
    <div class="layout-switch-row"><button class="button is-small" type="button" @click="toggleLayout">{{ threeColumn ? 'Current layout' : 'Three-column layout' }}</button></div>
    <div v-if="threeColumn" class="reader-columns">
      <aside class="reader-channels">
        <Channels :channels="channels"><div slot-scope="{ channel }"><Channel :channel="channel" @channel-selected="selectChannel" /></div></Channels>
      </aside>
      <section class="reader-list">
        <h1 class="title is-5">{{ channel.name }}</h1>
        <Timeline :timeline="$store.state.timeline" :channel="channel" :keyboard="true" :compact="true" @selected="selectedItem = $event" @replySelected="openSelectedReply" @older="loadOlder" @newer="loadNewer" @followFeed="openFeedFollower($event)" />
      </section>
      <section class="reader-detail" aria-label="Selected item"><Entry v-if="selectedItem" ref="detailEntry" :item="selectedItem" :is-selected="true" :reader-mode="true" /><p v-else class="detail-empty">Select an item to read it.</p></section>
    </div>
    <div v-else class="home columns">
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
            <button class="button is-small" @click.prevent="feedsIsOpen = true">Feeds</button>
            <button class="button is-small" @click.prevent="shortcutsIsOpen = true" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">?</button>
          </div>
        </div>
      </div>
      <new-post class="mt-20" v-if="showPost" @close="showPost = false"></new-post>
      <Timeline style="margin-top:20px" :timeline="this.$store.state.timeline" :channel="channel" :keyboard="true"
                @older="loadOlder" @newer="loadNewer" @followFeed="openFeedFollower(arguments[0])"
                @help="shortcutsIsOpen = true"></Timeline>
    </div>

    <div class="column">
      <short-timeline :timeline="this.$store.state.globalTimeline"></short-timeline>
    </div>
    </div>

    <channel-creator :is-open="this.$store.state.channelCreatorIsOpen"></channel-creator>
    <feed-follower :is-open="feedFollowerIsOpen" @close="closeFeedFollower" :initial-channel="feedFollowerChannel" :initial-query="feedFollowerQuery"></feed-follower>
    <feeds-modal :is-open="feedsIsOpen" :initial-channel="channel"
                 @close="feedsIsOpen = false" @browse="browseFeeds"></feeds-modal>
    <search-popup :is-open="searchPopupIsOpen"></search-popup>
    <shortcut-help :is-open="shortcutsIsOpen" @close="shortcutsIsOpen = false"></shortcut-help>
    <DebugModal :active="this.$store.state.debugVisible"
                :item="this.$store.state.debugItem"></DebugModal>
  </div>
</template>

<script>
  import Timeline from '../components/Timeline.vue'
  import Entry from '../components/Entry.vue'
  import Channels from '../components/Channels.vue'
  import Channel from '../components/Channel.vue'
  import ChannelCreator from '../components/ChannelCreator.vue'
  import FeedFollower from "../components/FeedFollower"
  import FeedsModal from "../components/FeedsModal"
  import NewPost from "../components/NewPost"
  import ShortTimeline from "../components/ShortTimeline";
  import SearchPopup from "../components/SearchPopup";
  import DebugModal from "../components/DebugModal";
  import ShortcutHelp from "../components/ShortcutHelp";

  export default {
    name: 'home',
    components: {
      FeedFollower,
      FeedsModal,
      Timeline,
      Channels,
      Channel,
      ChannelCreator,
      NewPost,
      ShortTimeline,
      SearchPopup,
      DebugModal,
      ShortcutHelp,
      Entry
    },

    data() {
      return {
        feedFollowerIsOpen: false,
        feedsIsOpen: false,
        feedFollowerQuery: '',
        // The follower opens for whichever channel the reader was looking at, which is not
        // always the sidebar's current one (the Feeds panel has its own selector).
        feedFollowerChannel: null,
        showPost: false,
        channelsVisible: false,
        shortcutsIsOpen: false,
        threeColumn: window.localStorage.getItem('reader-layout') === 'three-column',
        selectedItem: null,
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
      },
      loggedIn () {
        return this.$store.state.logged_in
      }
    },

    methods: {
      openSelectedReply() {
        if (this.$refs.detailEntry) this.$refs.detailEntry.openReply()
      },
      toggleLayout() {
        this.threeColumn = !this.threeColumn
        window.localStorage.setItem('reader-layout', this.threeColumn ? 'three-column' : 'current')
      },
      openFeedFollower(query, channel) {
        this.feedFollowerIsOpen = true
        this.feedFollowerQuery = query || ''
        this.feedFollowerChannel = channel || this.channel
      },
      closeFeedFollower() {
        this.feedFollowerIsOpen = false
      },
      // The Feeds panel no longer follows a pasted URL itself; it hands the channel over
      // so the follower can search, preview and then add.
      browseFeeds(channel) {
        this.feedsIsOpen = false
        this.openFeedFollower('', channel)
      },
      selectChannel(channel) {
        this.selectedItem = null
        this.$store.dispatch('switchChannel', channel).then(() => {
          this.$store.dispatch('fetchTimeline', channel).then(() => {
            window.scrollTo({top: 0})
          })
        })
      },
      loadOlder(query) {
        // Appending keeps the reader where it is; only a channel switch goes to the top.
        return this.$store.dispatch('fetchTimeline', Object.assign({}, query, {append: true}))
      },
      loadNewer() {
        this.$store.commit('previousTimelinePage')
      },
      openPost() {
        this.showPost = true
      },
      load() {
        if (!this.$store.state.logged_in) {
          return
        }
        this.$store.dispatch('fetchChannels')
        this.$store.dispatch('fetchTimeline', {uid: this.uid})
      },
      showChannels () {
        this.channelsVisible = !this.channelsVisible
      },
      handleKey (event) {
        const el = event.target
        const tag = el && el.tagName ? el.tagName.toLowerCase() : ''
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || (el && el.isContentEditable)) {
          return
        }
        if (event.ctrlKey || event.metaKey || event.altKey) {
          return
        }
        if (event.key === 'g') {
          event.preventDefault()
          this.showChannels()
        }
      }
    },

    watch: {
      '$store.state.timeline.items': {
        immediate: true,
        handler(items) {
          if (this.threeColumn && !this.selectedItem && items && items.length) {
            this.selectedItem = items.find(item => item.type === 'entry' || item.type === 'cite') || null
          }
        }
      },
      threeColumn(enabled) {
        if (enabled && !this.selectedItem) {
          const items = this.$store.state.timeline.items || []
          this.selectedItem = items.find(item => item.type === 'entry' || item.type === 'cite') || null
        }
      },
      loggedIn(value) {
        // Signing in from the modal has to load the feed; mounted() already ran.
        if (value) {
          this.load()
        }
      },
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
      window.addEventListener('keydown', this.handleKey)
      this.load()
    },

    beforeDestroy() {
      window.removeEventListener('keydown', this.handleKey)
    }
  }
</script>

<style scoped>
  .home {
    padding: 10px;
  }

  .layout-switch-row { padding: 4px 0; }
  .reader-columns { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(260px, 1fr) minmax(400px, 2fr); gap: 16px; align-items: start; }
  .reader-channels, .reader-list, .reader-detail { min-width: 0; height: calc(100vh - 115px); overflow: auto; position: sticky; top: 70px; }
  .reader-detail { padding: 12px; background: var(--card); border: 1px solid var(--line); }
  .reader-detail .entry-actions { position: sticky; top: 0; z-index: 2; background: var(--card); opacity: 1; }
  .detail-empty { color: var(--muted); padding: 24px; }
  @media (max-width: 900px) { .reader-columns { grid-template-columns: minmax(150px, 1fr) minmax(220px, 2fr); } .reader-detail { grid-column: 1 / -1; position: static; height: auto; } }
  @media (max-width: 600px) { .reader-columns { display: block; } .reader-channels { height: auto; position: static; } .reader-list { height: 55vh; position: static; } .reader-detail { margin-top: 12px; } }

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

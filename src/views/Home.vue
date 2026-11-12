<template>
  <div class="home" :class="{'three-column': threeColumn}">
    <div class="workspace-bar">
      <div class="workspace-label"><span class="workspace-title">Reader</span></div>
      <div class="workspace-actions">
        <div class="layout-switch" role="group" aria-label="Reader layout">
          <button type="button" :class="{'is-active': !threeColumn}" :aria-pressed="!threeColumn" @click="threeColumn && toggleLayout()">Feed</button>
          <button type="button" :class="{'is-active': threeColumn}" :aria-pressed="threeColumn" @click="!threeColumn && toggleLayout()">Split view</button>
        </div>
        <span class="toolbar-divider" aria-hidden="true"></span>
        <button class="toolbar-button toolbar-secondary" @click.prevent="openPost"><ToolbarIcon name="compose" /> <span>New post</span></button>
        <button class="toolbar-button toolbar-secondary" @click.prevent="feedsIsOpen = true"><ToolbarIcon name="feeds" /> <span>Manage feeds</span></button>
        <button class="toolbar-button toolbar-ghost toolbar-icon-button" @click.prevent="shortcutsIsOpen = true" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)"><ToolbarIcon name="help" /></button>
      </div>
    </div>
    <new-post class="mt-20" v-if="showPost && threeColumn" @close="showPost = false"></new-post>
    <div v-if="threeColumn" class="reader-columns">
      <aside class="reader-channels">
        <Channels :channels="channels"><div slot-scope="{ channel }"><Channel :channel="channel" @channel-selected="selectChannel" /></div></Channels>
      </aside>
      <section class="reader-list">
        <div class="section-heading"><h1 class="title is-5">{{ channel.name }}</h1></div>
        <Timeline :timeline="$store.state.timeline" :channel="channel" :keyboard="true" :compact="true" :selected-item="selectedItem" @selected="selectedItem = $event" @replySelected="openSelectedReply" @older="loadOlder" @newer="loadNewer" @followFeed="openFeedFollower($event)" @help="shortcutsIsOpen = true" />
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
      <div class="section-heading"><h1 class="title is-5">{{ channel.name }}</h1></div>
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
  import ToolbarIcon from '../components/ToolbarIcon.vue'
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
      ToolbarIcon,
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

  .workspace-bar { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 60px; padding: 10px 0; border-bottom: 1px solid var(--line); }
  .workspace-label { display: flex; flex-direction: column; gap: 2px; }
  .workspace-eyebrow, .section-eyebrow { color: var(--muted); font-size: .65rem; font-weight: 700; letter-spacing: .12em; }
  .workspace-title { font-size: 1rem; font-weight: 650; letter-spacing: -.02em; }
  .workspace-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .workspace-actions .button { border-radius: 7px; }
  .layout-switch { display: inline-flex; padding: 3px; border-radius: 7px; background: var(--sidebar-bg); }
  .layout-switch button { border: 0; border-radius: 5px; background: transparent; color: var(--muted); font: inherit; font-size: .75rem; padding: 6px 11px; cursor: pointer; transition: background-color .15s, color .15s; }
  .layout-switch button.is-active { background: var(--sel); color: var(--fg); }
  .layout-switch button:hover { color: var(--fg); }
  .section-heading { padding: 4px 0 12px; }
  .section-heading .title { margin: 5px 0 0; }
  .reader-columns { padding-top: 12px; }
  @media (max-width: 700px) { .workspace-bar { align-items: flex-start; flex-direction: column; } .workspace-actions { width: 100%; } }
  .reader-columns { display: grid; grid-template-columns: minmax(190px, 230px) minmax(280px, 360px) minmax(0, 1fr); gap: 0; align-items: start; }
  .reader-channels, .reader-list, .reader-detail { min-width: 0; height: calc(100vh - 135px); overflow: auto; position: sticky; top: 120px; }
  .reader-channels { background: var(--sidebar-bg); padding: 20px 12px; border-right: 1px solid var(--line); }
  .reader-list { background: var(--list-bg); border-right: 1px solid var(--line); padding-top: 16px; }
  .reader-list .section-heading { padding: 4px 20px 14px; }
  .reader-list ::v-deep .timeline-toolbar { padding: 0 16px 12px; margin: 0; }
  .reader-list ::v-deep .timeline--item { margin: 0; }
  .reader-detail { background: var(--reader-bg); }
  .reader-detail .entry-actions { position: sticky; top: 0; z-index: 2; background: var(--reader-bg); opacity: 1; }
  .detail-empty { color: var(--muted); padding: 24px; }
  @media (max-width: 900px) { .reader-columns { grid-template-columns: minmax(150px, 1fr) minmax(220px, 2fr); } .reader-detail { grid-column: 1 / -1; position: static; height: auto; } }
  @media (max-width: 600px) { .reader-columns { display: block; } .reader-channels { height: auto; max-height: 180px; position: static; } .reader-list { height: 45vh; position: static; } .reader-detail { margin-top: 0; } }

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

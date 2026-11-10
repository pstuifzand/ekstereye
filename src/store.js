import Vue from 'vue'
import Vuex from 'vuex'
import Micropub from 'micropub-helper';
import { EventSourcePolyfill } from 'event-source-polyfill'
import { setMarkReadSender } from './markRead'
import { request, setUnauthorizedHandler } from './api'

Vue.use(Vuex)

// Microsub items never carry _is_read, and assigning it to an item that came out of
// JSON is invisible to Vue 2 (properties added after the fact are not reactive), so the
// unread outline would never repaint. Define it as a reactive property at ingest.
function normalizeItem(item) {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    Vue.set(item, '_is_read', Boolean(item._is_read))
  }
  return item
}

function normalizeTimeline(timeline) {
  if (timeline && Array.isArray(timeline.items)) {
    timeline.items.forEach(normalizeItem)
  }
  return timeline
}

let notificationSeq = 0

const store = new Vuex.Store({
  state() {
    let newState = {
      channels: [],
      timeline: {items: [], paging: {}},
      timelineStack: [],
      channel: {},
      logged_in: false,
      micropubEndpoint: '',
      microsubEndpoint: '/microsub',
      channelCreatorIsOpen: false,
      searchPopupIsOpen: false,
      searchItems: [],
      eventSource: null,
      globalTimeline: {items: []},
      debug: false,
      debugItem: {},
      debugVisible: false,
      menuActive: false,
      error: '',
      loading: false,
      notifications: [],
    };
    let loginData = JSON.parse(window.localStorage.getItem('login_data'))
    if (loginData) {
      newState = {...newState, ...loginData}
      newState.logged_in = loginData.access_token && loginData.access_token.length > 0
    }
    let endpoints = JSON.parse(window.localStorage.getItem('endpoints'))
    if (endpoints) {
      newState = {...newState, ...endpoints}
    }
    return newState
  },

  mutations: {
    newChannels(state, channels) {
      state.channels = channels
      // Channels and timeline are fetched in parallel on load. If the timeline landed
      // first it could only keep the uid, never the channel object — re-point it now that
      // the list is here, or the timeline title stays blank for the whole session.
      if (state.channel && state.channel.uid) {
        state.channel = channels.find(item => item.uid === state.channel.uid) || state.channel
      }
    },
    newTimeline(state, {channel, timeline}) {
      // find the channel matching the selected uid, but never drop it when the channel
      // list has not arrived yet: an undefined channel makes the timeline fail to render
      // and the reader shows "No items" while the items are sitting in the store.
      const known = state.channels.find(item => item.uid === channel.uid)
      state.channel = known || channel
      state.timeline = normalizeTimeline(timeline) || {items: [], paging: {}}
      state.timelineStack = []
    },
    appendTimeline(state, {timeline}) {
      // Paging forwards: keep what is already on screen and remember where it ended,
      // so "Newer" can trim back without another request.
      const page = normalizeTimeline(timeline) || {items: [], paging: {}}
      const current = state.timeline || {items: [], paging: {}}
      state.timelineStack.push({length: current.items.length, paging: current.paging})
      const seen = new Set(current.items.map(item => item._id))
      const fresh = (page.items || []).filter(item => !seen.has(item._id))
      state.timeline = {
        items: current.items.concat(fresh),
        paging: page.paging || current.paging
      }
    },
    previousTimelinePage(state) {
      const previous = state.timelineStack.pop()
      if (!previous) {
        return
      }
      state.timeline = {
        items: state.timeline.items.slice(0, previous.length),
        paging: previous.paging
      }
    },
    newAccessToken(state, {me, access_token, scope}) {
      state.logged_in = true
      state.scope = scope
      state.me = me
      state.access_token = access_token
    },
    clearTimeline(state, {channel}) {
      state.channel = channel
      state.timeline = {
        items: [],
        paging: {}
      }
      state.timelineStack = []
    },
    setChannelCreatorState(state, open) {
      state.channelCreatorIsOpen = open
    },
    setSearchPopupState(state, open) {
      state.searchPopupIsOpen = open
      state.searchItems = []
    },
    newEndpoints(state, endpoints) {
      state.micropubEndpoint = endpoints.micropubEndpoint
      state.microsubEndpoint = endpoints.microsubEndpoint
    },
    createEventSource(state, url) {
      if (state.eventSource !== null) {
        state.eventSource.close()
      }
      state.eventSource = new EventSourcePolyfill(state.microsubEndpoint + url, {
        headers: {
          'Authorization': 'Bearer ' + this.state.access_token
        }
      })
      // state.eventSource.addEventListener('open', evt => {
      //   // eslint-disable-next-line
      //   console.log(evt)
      // })
      // state.eventSource.addEventListener('ping', evt => {
      //   // eslint-disable-next-line
      //   console.log(evt)
      // })
      // state.eventSource.addEventListener('message', evt => {
      //   // eslint-disable-next-line
      //   console.log(evt)
      // })
      state.eventSource.addEventListener('error', evt => {
        if (evt.message === "network error") {
          state.eventSource.close()
        }
      })
      state.eventSource.addEventListener('new item', evt => {
        try {
          let newItemMsg = JSON.parse(evt.data)
          const item = normalizeItem(newItemMsg.item)
          const uid = item && item._id
          if (state.channel.uid === newItemMsg.channel) {
            if (!uid || !state.timeline.items.some(it => it._id === uid)) {
              state.timeline.items = [item, ...state.timeline.items]
            }
          }
          if (!uid || !state.globalTimeline.items.some(it => it._id === uid)) {
            state.globalTimeline.items = [...state.globalTimeline.items, item].slice(-10)
          }
        } catch (e) {
          // eslint-disable-next-line
          console.log(e)
        }
      })
      state.eventSource.addEventListener('new item in channel', evt => {
        let msg = JSON.parse(evt.data)
        let channel = state.channels.find(item => item.uid === msg.uid)
        if (channel) {
          channel.unread = msg.unread
        }
      })

      state.eventSource.addEventListener('new channel', evt => {
        let msg = JSON.parse(evt.data)
        let channel = state.channels.find(it => it.uid === msg.channel.uid)
        if (!channel) {
          state.channels.push(msg.channel)
        }
      })

      state.eventSource.addEventListener('update channel', evt => {
        let msg = JSON.parse(evt.data)
        let channel = state.channels.find(it => it.uid === msg.channel.uid)
        if (channel) {
          channel.name = msg.channel.name
        }
      })

      state.eventSource.addEventListener('delete channel', evt => {
        let msg = JSON.parse(evt.data)
        state.channels = state.channels.filter(it => it.uid !== msg.uid)
      })
    },
    newSearchResults(state, items) {
      state.searchItems = (items || []).map(normalizeItem)
    },
    openDebugPopup(state, item) {
      state.debugItem = item
      state.debugVisible = true
    },
    closeDebugPopup(state) {
      state.debugVisible = false
    },
    activateMenu(state) {
      state.menuActive = !state.menuActive
    },
    setError(state, message) {
      state.error = message || ''
    },
    clearError(state) {
      state.error = ''
    },
    setLoading(state, loading) {
      state.loading = Boolean(loading)
    },
    addNotification(state, notification) {
      state.notifications.push(notification)
    },
    removeNotification(state, id) {
      state.notifications = state.notifications.filter(item => item.id !== id)
    },
    logout(state) {
      if (state.eventSource !== null) {
        state.eventSource.close()
        state.eventSource = null
      }
      window.localStorage.removeItem('login_data')
      state.logged_in = false
      state.access_token = ''
      state.me = ''
      state.channels = []
      state.channel = {}
      state.timeline = {items: [], paging: {}}
      state.globalTimeline = {items: []}
      state.searchItems = []
    }
  },

  actions: {
    fetchChannels({commit}) {
      return request(this.state.microsubEndpoint + '?action=channels', {token: this.state.access_token})
        .then(response => {
          commit('newChannels', response.channels)
        })
        .catch(error => commit('setError', error.message))
    },
    switchChannel({commit}, channel) {
      commit('clearTimeline', {channel: channel})
    },
    fetchTimeline({commit}, channel) {
      if (!channel.uid) {
        channel.uid = 'home';
      }
      let url = this.state.microsubEndpoint + '?action=timeline&channel=' + channel.uid
      if (channel.after) {
        url += '&after=' + channel.after;
      }
      if (channel.before) {
        url += '&before=' + channel.before;
      }
      commit('setLoading', true)
      return request(url, {token: this.state.access_token})
        .then(response => {
          if (channel.append) {
            commit('appendTimeline', {timeline: response})
          } else {
            commit('newTimeline', {channel: channel, timeline: response})
          }
          return response
        })
        .catch(error => commit('setError', error.message))
        .then(response => {
          commit('setLoading', false)
          return response
        })
    },
    // Microsub follow/unfollow: GET lists the channel's feeds, POST adds or removes one.
    fetchFeeds(_, channelUid) {
      if (!channelUid) {
        return Promise.resolve([])
      }
      const url = this.state.microsubEndpoint + '?action=follow&channel=' + encodeURIComponent(channelUid)
      return request(url, {token: this.state.access_token})
        .then(response => (response && response.items) || [])
    },
    followFeed({dispatch}, {channel, url}) {
      const endpoint = this.state.microsubEndpoint + '?action=follow&channel=' +
        encodeURIComponent(channel) + '&url=' + encodeURIComponent(url)
      return request(endpoint, {method: 'POST', token: this.state.access_token})
        .then(feed => {
          dispatch('notify', {type: 'success', message: 'Following ' + ((feed && feed.name) || url)})
          return feed
        })
        .catch(error => {
          dispatch('notify', {type: 'error', message: 'Could not follow the feed: ' + error.message})
          throw error
        })
    },
    unfollowFeed({dispatch}, {channel, url}) {
      const endpoint = this.state.microsubEndpoint + '?action=unfollow&channel=' +
        encodeURIComponent(channel) + '&url=' + encodeURIComponent(url)
      return request(endpoint, {method: 'POST', token: this.state.access_token})
        .then(() => {
          dispatch('notify', {type: 'success', message: 'Feed removed'})
        })
        .catch(error => {
          dispatch('notify', {type: 'error', message: 'Could not remove the feed: ' + error.message})
          throw error
        })
    },
    saveEndpoints({commit}, endpoints) {
      window.localStorage.setItem('endpoints', JSON.stringify(endpoints))
      commit('newEndpoints', endpoints)
    },
    tokenResponse({commit}, response) {
      window.localStorage.setItem('login_data', JSON.stringify(response))
      commit('newAccessToken', response)
    },
    isLoggedIn({commit}, response) {
      // eslint-disable-next-line
      console.log(response)
      commit('newAccessToken', response)
    },
    markRead(x, {channel, entry, keepalive}) {
      const entries = Array.isArray(entry)
        ? entry.map(uid => '&entry[]=' + encodeURIComponent(uid)).join("")
        : '&entry=' + encodeURIComponent(entry)
      let url = this.state.microsubEndpoint + '?action=timeline&method=mark_read&channel=' + encodeURIComponent(channel) + entries;
      return request(url, {
        method: 'POST',
        token: this.state.access_token,
        keepalive: Boolean(keepalive)
      })
    },
    configQuery (_, key) {
      let micropub = new Micropub({
        token: this.state.access_token,
        micropubEndpoint: this.state.micropubEndpoint
      })
      return micropub.query(key)
    },
    fetchSyndicationTargets() {
      return this.dispatch('configQuery', 'syndicate-to')
    },
    fetchDestinations() {
      return this.dispatch('configQuery', 'destination')
    },
    // micropub-helper reports every rejection as "did not return a location header", which
    // hides a 401 or a 500 behind a sentence about headers. Post directly so the toast can
    // say what the endpoint actually answered.
    micropubPost({dispatch}, {post, success, failure}) {
      return fetch(this.state.micropubEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + this.state.access_token
        },
        body: JSON.stringify(post)
      })
        .then(response => {
          if (!response.ok) {
            const error = new Error('HTTP ' + response.status)
            error.status = response.status
            throw error
          }
          dispatch('notify', {
            type: 'success',
            message: success || 'Posted',
            url: response.headers.get('Location') || ''
          })
          return response.headers.get('Location') || ''
        })
        .catch(error => {
          const reason = error && error.status
            ? 'HTTP ' + error.status
            : ((error && error.message) || 'network error')
          dispatch('notify', {
            type: 'error',
            message: (failure || 'Posting failed') + ': ' + reason
          })
          // Rethrow so the component keeps its composer open for a retry.
          throw error
        })
    },
    notify({commit}, {type, message, url, duration}) {
      const notification = {
        id: ++notificationSeq,
        type: type === 'error' ? 'error' : 'success',
        message,
        url: url || ''
      }
      commit('addNotification', notification)
      const timeout = duration || (notification.type === 'error' ? 8000 : 4000)
      window.setTimeout(() => commit('removeNotification', notification.id), timeout)
      return notification.id
    },
    dismissNotification({commit}, id) {
      commit('removeNotification', id)
    },
    micropubLikeOf(_, url) {
      this.dispatch('micropubPost', {
        post: {
          'type': ['h-entry'],
          'properties': {
            'like-of': [url]
          }
        },
        success: 'Liked'
      })
    },
    openChannelCreator({commit}) {
      commit('setChannelCreatorState', true)
    },
    closeChannelCreator({commit}) {
      commit('setChannelCreatorState', false)
    },
    openSearch({commit}) {
      commit('setSearchPopupState', true)
    },
    closeSearch({commit}) {
      commit('setSearchPopupState', false)
    },
    startQuery({state, commit}, query) {
      let channel
      if (query.channel) {
        if (query.channel === 'global') {
          channel = 'global'
        } else if (query.channel === 'channel') {
          if (state.channel !== null && state.channel.uid !== null) {
            channel = state.channel.uid
          }
        } else {
          channel = 'global'
        }
      }
      const url = new URL(this.state.microsubEndpoint)
      url.searchParams.set('action', 'search')
      url.searchParams.set('channel', channel)
      url.searchParams.set('query', query.query)
      return request(url.toString(), {
        method: 'POST',
        token: this.state.access_token
      })
      .then(response => {
        if (response && response.items) {
          commit('newSearchResults', response.items)
          return { error: false }
        } else {
          commit('newSearchResults', [])
          return { error: (response && response.error) || 'The search failed.' }
        }
      })
      .catch(error => {
        commit('newSearchResults', [])
        return { error: error.message }
      })
    },
    createChannel(x, name) {
      let url = this.state.microsubEndpoint + '?action=channels&name=' + encodeURIComponent(name)
      return request(url, {
        method: 'POST',
        token: this.state.access_token
      }).then(() => {
        this.dispatch('fetchChannels')
      }).catch(error => x.commit('setError', error.message))
    },
    startEventListening({commit}, url) {
      return commit('createEventSource', url)
    },
    openDebug({commit}, item) {
      return commit('openDebugPopup', item)
    },
    closeDebug({commit}) {
      return commit('closeDebugPopup')
    },
    toggleMenu({commit}) {
      return commit('activateMenu')
    },
    logout({commit}) {
      commit('logout')
      commit('clearError')
    },
    dismissError({commit}) {
      commit('clearError')
    },
    sessionExpired({commit}) {
      commit('logout')
      commit('setError', 'Your session expired. Sign in again.')
    }
  }
})

// A 401 anywhere means the session is gone: reset the app state once, not per request.
setUnauthorizedHandler(() => store.dispatch('sessionExpired'))

// The queue module owns the batching and the flush-on-hide; the store owns the request.
setMarkReadSender((channel, uids, options) =>
  store.dispatch('markRead', {channel: channel, entry: uids, keepalive: options.keepalive}))

export default store

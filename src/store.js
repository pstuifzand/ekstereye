import Vue from 'vue'
import Vuex from 'vuex'
import Micropub from 'micropub-helper';
import { EventSourcePolyfill } from 'event-source-polyfill'
import _ from "lodash"
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

const store = new Vuex.Store({
  state() {
    let newState = {
      channels: [],
      timeline: {items: [], paging: {}},
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
    },
    newTimeline(state, {channel, timeline}) {
      // find the channel matching the selected uid
      channel = _.find(state.channels, item => item.uid === channel.uid)
      state.channel = channel
      state.timeline = normalizeTimeline(timeline)
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
            if (!uid || !_.some(state.timeline.items, it => it._id === uid)) {
              state.timeline.items = [item, ...state.timeline.items]
            }
          }
          if (!uid || !_.some(state.globalTimeline.items, it => it._id === uid)) {
            state.globalTimeline.items = _.takeRight([...state.globalTimeline.items, item], 10)
          }
        } catch (e) {
          // eslint-disable-next-line
          console.log(e)
        }
      })
      state.eventSource.addEventListener('new item in channel', evt => {
        let msg = JSON.parse(evt.data)
        let channel = _.find(state.channels, item => item.uid === msg.uid)
        if (channel) {
          channel.unread = msg.unread
        }
      })

      state.eventSource.addEventListener('new channel', evt => {
        let msg = JSON.parse(evt.data)
        let channel = _.find(state.channels, it => it.uid === msg.channel.uid)
        if (!channel) {
          state.channels.push(msg.channel)
        }
      })

      state.eventSource.addEventListener('update channel', evt => {
        let msg = JSON.parse(evt.data)
        let channel = _.find(state.channels, it => it.uid === msg.channel.uid)
        if (channel) {
          channel.name = msg.channel.name
        }
      })

      state.eventSource.addEventListener('delete channel', evt => {
        let msg = JSON.parse(evt.data)
        state.channels = _.filter(state.channels, it => it.uid !== msg.uid)
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
          commit('newTimeline', {channel: channel, timeline: response})
          return response
        })
        .catch(error => commit('setError', error.message))
        .then(response => {
          commit('setLoading', false)
          return response
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
        ? _(entry).map(uid => '&entry[]=' + encodeURIComponent(uid)).join("")
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
    micropubPost(_, mf2post) {
      let micropub = new Micropub({
        token: this.state.access_token,
        micropubEndpoint: this.state.micropubEndpoint
      })
      return micropub.create(mf2post)
    },
    micropubLikeOf(_, url) {
      this.dispatch('micropubPost', {
        'type': ['h-entry'],
        'properties': {
          'like-of': [url]
        }
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

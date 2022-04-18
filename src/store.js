import Vue from 'vue'
import Vuex from 'vuex'
import Micropub from 'micropub-helper';
import EventSource from 'eventsource'
import _ from "lodash"

Vue.use(Vuex)

export default new Vuex.Store({
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
      state.timeline = timeline
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
      state.eventSource = new EventSource(state.microsubEndpoint + url, {
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
          if (state.channel.uid === newItemMsg.channel) {
            state.timeline.items = [newItemMsg.item, ...state.timeline.items]
          }
          state.globalTimeline.items = _.takeRight([...state.globalTimeline.items, newItemMsg.item], 10)
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
        state.channels = _.remove(state.channels, it => it.uid === msg.uid)
      })
    },
    newSearchResults(state, items) {
      state.searchItems = items
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
    }
  },

  actions: {
    fetchChannels({commit}) {
      fetch(this.state.microsubEndpoint + '?action=channels', {
        headers: {
          'Authorization': 'Bearer ' + this.state.access_token
        }
      })
        .then(response => response.json())
        .then(response => {
          commit('newChannels', response.channels)
        })
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
      fetch(url, {
        headers: {
          'Authorization': 'Bearer ' + this.state.access_token
        }
      })
        .then(response => response.json())
        .then(response => {
          commit('newTimeline', {channel: channel, timeline: response})
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
    markRead(x, {channel, entry}) {
      let entries = '';
      if (Array.isArray(entry)) {
        entries = _(entry).map(uid => '&entry[]=' + encodeURIComponent(uid)).join("")
      } else {
        entries = '&entry=' + encodeURIComponent(entry)
      }
      let url = this.state.microsubEndpoint + '?action=timeline&method=mark_read&channel=' + encodeURIComponent(channel) + entries;
      return fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.state.access_token
        }
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
      return fetch(url.toString(), {
        headers: {
          'Authorization': 'Bearer ' + this.state.access_token
        },
        method: 'POST'
      })
      .then(response => response.json())
      .then(response => {
        if (response.items) {
          commit('newSearchResults', response.items)
          return { error: false }
        } else {
          commit('newSearchResults', [])
          return { error: response.error }
        }
      })
    },
    createChannel(x, name) {
      let url = this.state.microsubEndpoint + '?action=channels&name=' + encodeURIComponent(name)
      return fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.state.access_token
        }
      }).then(() => {
        this.dispatch('fetchChannels')
      })
    },
    bottomReached() {
      // eslint-disable-next-line
      console.log('bottomReached')

      let items = this.state.timeline.items
      // eslint-disable-next-line
      console.log(items)
      let uids = _(items).reject('_is_read').map('_id').value()
      // eslint-disable-next-line
      console.log(uids)

      items.forEach((item) => {
        if (item && !item._is_read) {
          item._is_read = true
        }
      })
      if (uids.length > 0) {
        return this.dispatch('markRead', {channel: this.state.channel.uid, 'entry': uids})
      }
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
    }
  }
})

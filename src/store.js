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
      debug: false,
      logged_in: false,
      micropubEndpoint: '',
      microsubEndpoint: '/microsub',
      channelCreatorIsOpen: false,
      eventSource: null,
      globalTimeline: {items: [{name:'Testing the global timeline'}]}
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
    newEndpoints(state, endpoints) {
      state.micropubEndpoint = endpoints.micropubEndpoint
      state.microsubEndpoint = endpoints.microsubEndpoint
    },
    createEventSource(state, url) {
      state.eventSource = new EventSource(state.microsubEndpoint + url + "&access_token=" + state.access_token, {
        // headers: {
        //   'Authorization': 'Bearer ' + this.state.access_token
        // }
      })
      state.eventSource.addEventListener('open', evt => {
        // eslint-disable-next-line
        console.log(evt)
      })
      state.eventSource.addEventListener('ping', evt => {
        // eslint-disable-next-line
        console.log(evt)
      })
      state.eventSource.addEventListener('message', evt => {
        // eslint-disable-next-line
        console.log(evt)
      })
      state.eventSource.addEventListener('error', evt => {
        // eslint-disable-next-line
        console.log(evt)
      })
      state.eventSource.addEventListener('new item', evt => {
        let item = JSON.parse(evt.data)
        // eslint-disable-next-line
        state.timeline.items = [...state.timeline.items, item]
        state.globalTimeline.items = _.take([item, ...state.globalTimeline.items], 10)
      })
      state.eventSource.addEventListener('new item in channel', evt => {
        // eslint-disable-next-line
        console.log(evt)
        let d = JSON.parse(evt.data)
        let channel = _.find(state.channels, item => item.uid === d.uid)
        if (channel) {
          channel.unread = d.unread
        }
      })
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
      let url = this.state.microsubEndpoint + '?action=timeline&method=mark_read&channel=' + encodeURIComponent(channel) + '&entry=' + encodeURIComponent(entry);
      return fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.state.access_token
        }
      })
    },
    micropubPost(_, mf2post) {
      let micropub = new Micropub({
        token: this.state.access_token,
        micropubEndpoint: this.state.micropubEndpoint
      })
      return micropub.create(mf2post)
    },
    micropubLikeOf(_, url) {
      this.dispatch({
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
      let count = 0
      let uids = []
      let items = this.state.timeline.items
      uids = _.map(_.filter(items, item => !item._is_read), item => item._id)
      items.forEach((item) => {
        if (item && !item._is_read) {
          item._is_read = true
          count++;
        }
      })
      if (count > 0) {
        this.dispatch('markRead', {channel: this.state.channel.uid, 'entry[]': uids})
          .then(() => {
            this.dispatch('fetchChannels')
          })
      }
    },
    startEventListening({commit}, url) {
      commit('createEventSource', url)
    }
  }
})

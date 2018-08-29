import Vue from 'vue'
import Vuex from 'vuex'
import Micropub from 'micropub-helper';

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
      microsubEndpoint: ''
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
    }
  }
})

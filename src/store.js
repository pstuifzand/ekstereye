import Vue from 'vue'
import Vuex from 'vuex'

const baseurl = "https://microsub.stuifzandapp.com/microsub"

Vue.use(Vuex)

export default new Vuex.Store({
  state() {
    let loginData = JSON.parse(window.localStorage.getItem('login_data'))
    return {
      ...loginData,
      channels: [],
      timeline: {items: [], paging: {}},
      channel: {},
      debug: false,
      logged_in: loginData.access_token && loginData.access_token.length > 0
    }
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
      fetch(baseurl + '?action=channels', {
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
      let url = baseurl + '?action=timeline&channel=' + channel.uid
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
      let url = baseurl + '?action=timeline&method=mark_read&channel=' + encodeURIComponent(channel) + '&entry=' + encodeURIComponent(entry);
      return fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.state.access_token
        }
      })
    }
  }
})

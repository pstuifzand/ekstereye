import Vue from 'vue'
import Vuex from 'vuex'


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
      state.timeline = timeline
      state.channel = channel
    },
    newAccessToken(state, {me, access_token, scope}) {
      state.logged_in = true
      state.scope = scope
      state.me = me
      state.access_token = access_token
    }
  },

  actions: {
    fetchChannels({commit}) {
      fetch('https://microsub.stuifzandapp.com/microsub?action=channels', {
        headers: {
          'Authorization': 'Bearer ' + this.state.access_token
        }
      })
        .then(response => response.json())
        .then(response => {
          commit('newChannels', response.channels)
        })
    },
    fetchTimeline({commit}, channel) {
      let url = 'https://microsub.stuifzandapp.com/microsub?action=timeline&channel=' + channel.uid
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
    }
  }
})

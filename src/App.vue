<template>
  <div id="app">
    <nav id="nav" class="navbar is-fixed-top">
      <div class="container">
        <div class="navbar-brand">
          <router-link to="/" class="navbar-item">Ekster</router-link>

          <a role="button" :class="{'navbar-burger':true,'is-active':menuActive}" aria-label="menu" aria-expanded="false" @click="toggleMenu">
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </a>
        </div>
        <div :class="{'navbar-menu':true,'is-active':menuActive}">
          <div class="navbar-end">
            <div class="reader-controls">
              <div class="control-group theme-switch" role="group" aria-label="Colour theme"
                   :title="theme === 'system' ? 'Following the system setting — pick \u263c or \u263e to override' : 'Press the chosen one again to follow the system setting'">
                <button type="button" class="button icon-button"
                        :class="{'is-active': theme === 'light'}"
                        :aria-pressed="theme === 'light' ? 'true' : 'false'"
                        :title="theme === 'light' ? 'Light theme — press again to follow the system setting' : 'Light theme'"
                        @click="setTheme('light')">
                  <span aria-hidden="true">&#9788;</span>
                </button>
                <button type="button" class="button icon-button"
                        :class="{'is-active': theme === 'dark'}"
                        :aria-pressed="theme === 'dark' ? 'true' : 'false'"
                        :title="theme === 'dark' ? 'Dark theme — press again to follow the system setting' : 'Dark theme'"
                        @click="setTheme('dark')">
                  <span aria-hidden="true">&#9790;</span>
                </button>
              </div>
              <div class="control-group size-switch" role="group" aria-label="Text size">
                <button type="button" class="button icon-button" @click="smaller" title="Smaller text">A&minus;</button>
                <button type="button" class="button icon-button" @click="bigger" title="Larger text">A+</button>
              </div>
              <button type="button" class="button search-button" @click="openSearch" title="Search (s)">Search</button>
              <button type="button" class="button signout-button" v-if="loggedIn" :title="me" @click="signOut">Sign out</button>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <div class="container">
      <div class="notification is-danger error-banner" v-if="error" role="alert">
        <button class="delete" aria-label="dismiss" @click="dismissError"></button>
        {{ error }}
        <button class="button is-small retry-button" v-if="canRetry" @click="retryError">
          Retry
        </button>
      </div>
      <router-view/>
    </div>
    <LoginModal :active="!this.$store.state.logged_in"></LoginModal>
    <ToastStack/>
  </div>
</template>

<script>
  import LoginModal from '@/components/LoginModal'
  import ToastStack from '@/components/ToastStack'
  import { preferences, setTheme as applyTheme, stepScale } from '@/preferences'
  import {getConnection, disconnect} from '@/ekConnection'

  export default {
    name: 'App',
    components: {LoginModal, ToastStack},
    mounted() {
      window.addEventListener('keydown', this.handleKey)
      getConnection().then(connection => {
        this.$store.dispatch('useEkConnection', connection)
        if (connection.connected) {
          this.$store.dispatch('startEventListening', '?action=events')
        }
      }).catch(() => {
        // Standalone Ekstereye keeps its existing browser-owned IndieAuth session.
        let item = window.localStorage.getItem('login_data')
        if (item) {
          let loginData = JSON.parse(item)
          this.$store.dispatch('isLoggedIn', loginData)
          this.$store.dispatch('startEventListening', '?action=events')
        }
      })
    },
    beforeDestroy() {
      window.removeEventListener('keydown', this.handleKey)
    },
    computed: {
      menuActive() {
        return this.$store.state.menuActive
      },
      error() {
        return this.$store.state.error
      },
      canRetry() {
        return Boolean(this.$store.state.errorRetry)
      },
      loggedIn() {
        return this.$store.state.logged_in
      },
      me() {
        return this.$store.state.me || ''
      },
      theme() {
        return preferences.theme
      },
      scale() {
        return preferences.scale
      }
    },
    methods: {
      openSearch () {
        this.$store.dispatch('openSearch')
      },
      toggleMenu () {
        this.$store.dispatch('toggleMenu' )
      },
      dismissError () {
        this.$store.dispatch('dismissError')
      },
      retryError () {
        this.$store.dispatch('retryError')
      },
      setTheme (theme) {
        applyTheme(theme)
      },
      smaller () {
        stepScale(-1)
      },
      bigger () {
        stepScale(1)
      },
      signOut () {
        if (this.$store.state.ekHost) {
          disconnect().catch(() => {})
        }
        this.$store.dispatch('logout')
        this.$router.push('/')
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
        if (event.key === 's') {
          event.preventDefault()
          this.openSearch()
        } else if (event.key === 'Escape') {
          this.$store.dispatch('closeSearch')
          this.$store.dispatch('closeChannelCreator')
        }
      }
    }
  }
</script>

<style>
  .error-banner {
    margin: 12px 10px 0;
  }

  .retry-button {
    margin-left: 12px;
  }

  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* No colour here: the scaffolding's #2c3e50 is 1.6:1 on the dark page, and every
       element without its own colour inherited it. `body` already sets --fg. */
    color: inherit;
  }
</style>

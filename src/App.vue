<template>
  <div id="app">
    <nav id="nav" class="navbar is-fixed-top">
      <div class="container">
        <div class="navbar-brand">
          <router-link to="/" class="navbar-item brand"><span class="brand-mark" aria-hidden="true">e</span>Ekster</router-link>

          <a role="button" :class="{'navbar-burger':true,'is-active':menuActive}" aria-label="menu" aria-expanded="false" @click="toggleMenu">
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </a>
        </div>
        <div :class="{'navbar-menu':true,'is-active':menuActive}">
          <div class="navbar-end">
            <div class="reader-controls">
              <button type="button" class="toolbar-button toolbar-search" @click="openSearch" title="Search (Ctrl+K or S)"><ToolbarIcon name="search" /><span>Search</span><kbd>Ctrl K</kbd></button>
              <span class="toolbar-divider" aria-hidden="true"></span>
              <ToolbarMenu label="Appearance">
                <template #trigger><ToolbarIcon :name="theme === 'light' ? 'sun' : theme === 'dark' ? 'moon' : 'monitor'" /></template>
                <div class="toolbar-menu-label">Appearance</div>
                <button v-for="option in themeOptions" :key="option.value" type="button" class="toolbar-menu-item" role="menuitemradio" :aria-checked="theme === option.value ? 'true' : 'false'" @click="chooseTheme(option.value)">
                  <ToolbarIcon :name="option.icon" /><span>{{ option.label }}</span><ToolbarIcon v-if="theme === option.value" name="check" class="menu-check" />
                </button>
                <div class="toolbar-menu-separator"></div>
                <div class="toolbar-size-row"><span>Text size</span><div class="toolbar-size-controls"><button type="button" @click="smaller" title="Smaller text" aria-label="Smaller text">A−</button><button type="button" @click="bigger" title="Larger text" aria-label="Larger text">A+</button></div></div>
              </ToolbarMenu>
              <ToolbarMenu v-if="loggedIn" label="Account">
                <template #trigger><ToolbarIcon name="user" /></template>
                <div class="toolbar-menu-label account-identity" :title="me">{{ me || 'Account' }}</div>
                <button type="button" class="toolbar-menu-item" role="menuitem" @click="signOut"><ToolbarIcon name="logout" /><span>Sign out</span></button>
              </ToolbarMenu>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <div class="container app-content">
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
  import ToolbarIcon from '@/components/ToolbarIcon'
  import ToolbarMenu from '@/components/ToolbarMenu'
  import { preferences, setTheme as applyTheme, stepScale } from '@/preferences'
  import {getConnection, disconnect} from '@/ekConnection'

  export default {
    name: 'App',
    components: {LoginModal, ToastStack, ToolbarIcon, ToolbarMenu},
    data() { return { themeOptions: [{ value: 'system', label: 'System', icon: 'monitor' }, { value: 'light', label: 'Light', icon: 'sun' }, { value: 'dark', label: 'Dark', icon: 'moon' }] } },
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
      chooseTheme (theme) {
        if (theme === 'system') {
          if (this.theme !== 'system') applyTheme(this.theme)
        } else if (theme !== this.theme) {
          applyTheme(theme)
        }
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
        if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
          event.preventDefault()
          this.openSearch()
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
  .brand { font-weight: 700; letter-spacing: -.03em; gap: 9px; }
  .brand-mark { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 7px; background: var(--sel); color: var(--accent); font: 700 19px Georgia, serif; }
  @media (min-width: 1024px) { #nav > .container, .app-content { width: 100%; max-width: none !important; padding-left: 20px; padding-right: 20px; } }
  .error-banner {
    margin: 12px 10px 0;
  }

  .retry-button {
    margin-left: 12px;
  }

  #app {
    font-family: Inter, 'Segoe UI', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* No colour here: the scaffolding's #2c3e50 is 1.6:1 on the dark page, and every
       element without its own colour inherited it. `body` already sets --fg. */
    color: inherit;
  }
</style>

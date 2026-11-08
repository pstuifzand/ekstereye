<template>
  <div id="app">
    <nav id="nav" class="navbar is-primary is-fixed-top">
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
            <div class="buttons">
              <button class="button is-light" @click="openSearch">Search</button>
              <button class="button is-light" v-if="loggedIn" :title="me" @click="signOut">Sign out</button>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <div class="container">
      <div class="notification is-danger error-banner" v-if="error">
        <button class="delete" aria-label="dismiss" @click="dismissError"></button>
        {{ error }}
      </div>
      <router-view/>
    </div>
    <LoginModal :active="!this.$store.state.logged_in"></LoginModal>
  </div>
</template>

<script>
  import LoginModal from '@/components/LoginModal'

  export default {
    name: 'App',
    components: {LoginModal},
    mounted() {
      window.addEventListener('keydown', this.handleKey)
      let item = window.localStorage.getItem('login_data');
      if (item) {
        let loginData = JSON.parse(item)
        this.$store.dispatch('isLoggedIn', loginData)
        this.$store.dispatch('startEventListening', '?action=events')
      }
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
      loggedIn() {
        return this.$store.state.logged_in
      },
      me() {
        return this.$store.state.me || ''
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
      signOut () {
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

  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
  }
</style>

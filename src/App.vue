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
            </div>
          </div>
        </div>
      </div>
    </nav>
    <div class="container">
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
      let item = window.localStorage.getItem('login_data');
      if (item) {
        let loginData = JSON.parse(item)
        this.$store.dispatch('isLoggedIn', loginData)
        this.$store.dispatch('startEventListening', '?action=events')
      }
    },
    computed: {
      menuActive() {
        return this.$store.state.menuActive
      }
    },
    methods: {
      openSearch () {
        this.$store.dispatch('openSearch')
      },
      toggleMenu () {
        this.$store.dispatch('toggleMenu' )
      },
    }
  }
</script>

<style>
  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
  }
</style>

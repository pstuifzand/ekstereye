<template>
  <div id="app">
    <nav id="nav" class="navbar is-primary is-fixed-top">
      <div class="container">
        <div class="navbar-brand">
          <router-link to="/" class="navbar-item">Ekster</router-link>

          <a role="button" class="navbar-burger" aria-label="menu" aria-expanded="false">
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </a>

        </div>
        <div class="navbar-menu">
          <!--<router-link to="/about">About</router-link>-->
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
      let loginData = JSON.parse(window.localStorage.getItem('login_data'))
      this.$store.dispatch('isLoggedIn', loginData)
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

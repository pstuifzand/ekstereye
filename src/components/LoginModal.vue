<template>
  <div :class="classes">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Sign in with your website</p>
        <button class="delete" aria-label="close" @click="close"></button>
      </header>
      <section class="modal-card-body">
        <div class="field">
          <label class="label">Web Sign in</label>
          <div class="control">
            <input class="input" type="text" placeholder="https://example.com/" v-model="url">
          </div>
          <p class="help">Sign in with your website address</p>
        </div>
      </section>
      <footer class="modal-card-foot">
        <button class="button is-success" @click="login">Login</button>
        <button class="button" @click="close">Cancel</button>
      </footer>
    </div>
    <button class="modal-close is-large" aria-label="close" @click="close"></button>
  </div>
</template>

<script>
  import qs from 'qs'

  export default {
    name: "LoginModal",

    props: ['active'],

    data() {
      return {
        show: false,
        url: ''
      }
    },

    computed: {
      classes() {
        return {'modal': true, 'is-active': this.show}
      }
    },

    methods: {
      close() {
        this.show = false
      },
      login() {
        // try to login with
        window.location = 'https://p83.nl/auth?response_type=code&me=https://p83.nl/&redirect_uri=http://192.168.178.21:8080/callback&scope=channels+timeline&state=1234&client_id=https://p83.nl/';
      }
    },

    mounted() {
      this.show = this.active

      if (!this.$route.query.hasOwnProperty('code')) {
        return
      }
      let code = this.$route.query['code']
      if (!code.length) {
        return
      }

      let tokenurl = 'https://p83.nl/authtoken'
      let params = {}
      params['grant_type'] = 'authorization_code'
      params['code'] = code
      params['client_id'] = 'https://p83.nl/'
      params['redirect_uri'] = 'http://192.168.178.21:8080/callback'
      params['me'] = 'https://p83.nl/'

      fetch(tokenurl, {
        method: 'POST',
        body: qs.stringify(params, {arrayFormat: 'brackets'}),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        }
      }).then(response => response.json())
        .then(response => {
          this.$store.dispatch('tokenResponse', response)
          this.active = false
          this.$router.push('/')
        })
    }
  }
</script>

<style scoped>

</style>
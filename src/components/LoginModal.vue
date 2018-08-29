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
  import Micropub from 'micropub-helper';
  import helper from '@/helpers';
  import relScraper from '@/helpers/rel-scraper'

  const CLIENT_ID = 'https://p83.nl/'

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
        const state = helper.generateState()

        let micropub = new Micropub({
          clientId: CLIENT_ID,
          redirectUri: window.location.origin + '/callback',
          me: this.url,
          state: state,
          scope: 'create post channels timeline'
        })

        micropub.getAuthUrl().then(url => {
          let options = {
            loginState: state
          }
          this.$store.dispatch('saveEndpoints', options).then(() => {
            window.location = url
          })
          // eslint-disable-next-line
        }).catch(err => console.log(err))
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

      // FIXME: clientId, redirectUri
      let micropub = new Micropub({
        clientId: CLIENT_ID,
        redirectUri: window.location.origin + '/callback',
        me: this.$route.query['me'],
        state: this.$store.state.loginState,
        scope: 'create post channels timeline',
      })

      relScraper(this.$route.query['me']).then(rels => {
        micropub.options.tokenEndpoint = rels.token_endpoint
        micropub.options.authEndpoint = rels.auth_endpoint
        micropub.options.micropubEndpoint = rels.micropub

        let options = {
          tokenEndpoint: rels.token_endpoint,
          authEndpoint: rels.auth_endpoint,
          micropubEndpoint: rels.micropub,
          microsubEndpoint: rels.microsub
        }

        this.$store.dispatch('saveEndpoints', options)

        micropub
          .getToken(code)
          .then(token => {
            this.$store.dispatch('tokenResponse', {
              access_token: token,
              me: micropub.options.me,
              scope: micropub.options.scope
            })
            this.show = false
            this.$router.push('/')
          })
          // eslint-disable-next-line
          .catch(err => console.log(err));
      })
    }
  }
</script>

<style scoped>

</style>
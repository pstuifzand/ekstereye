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
  import {beginConnection as beginStandaloneConnection, completeConnection, saveConnectionEndpoints} from '@/connection'
  import {beginConnection as beginEkConnection} from '@/ekConnection'

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
      },
      ekHost() {
        return this.$store.state.ekHost
      }
    },

    methods: {
      close() {
        this.show = false
      },
      login() {
        if (this.ekHost) {
          beginEkConnection(this.url).catch(err => this.$store.commit('setError', err.message))
          return
        }
        beginStandaloneConnection(this.url, window.location.origin + '/callback')
          .then(({url, state}) => {
            this.$store.dispatch('saveEndpoints', {loginState: state})
            window.location = url
          })
          .catch(err => this.$store.commit('setError', err.message))
      }
    },

    watch: {
      active(value) {
        // The parent's session can expire while the modal is closed.
        this.show = value
      }
    },

    mounted() {
      this.show = this.active

      if (!Object.prototype.hasOwnProperty.call(this.$route.query, 'code')) {
        return
      }
      completeConnection(this.$route.query, this.$store.state.loginState)
        .then(({endpoints, token}) => {
          saveConnectionEndpoints(endpoints)
          this.$store.dispatch('saveEndpoints', endpoints)
          this.$store.dispatch('tokenResponse', token)
          this.show = false
          this.$router.push('/')
        })
        .catch(err => this.$store.commit('setError', err.message))
    }
  }
</script>

<style scoped>

</style>
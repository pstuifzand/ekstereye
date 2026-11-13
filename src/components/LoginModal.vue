<template>
  <div :class="classes" class="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
    <div class="login-background"></div>
    <form class="login-card" @submit.prevent="login">
      <div class="login-brand"><img class="brand-mark" src="/favicon.svg" alt=""> EKSTER <span class="brand-divider"></span> READER</div>
      <h1 id="login-title">A quieter place<br>to keep up.</h1>
      <p class="login-intro">Your feeds, your favourite voices, and everything worth reading — all in one place.</p>
      <div class="login-form">
        <label class="label" for="login-url">Your website address</label>
        <input id="login-url" class="input" type="url" placeholder="https://example.com" v-model="url" autocomplete="url" required>
        <p class="login-hint">Sign in with your IndieAuth-enabled website.</p>
        <button class="button is-primary login-submit" type="submit">Continue with your website <span aria-hidden="true">→</span></button>
      </div>
      <button type="button" class="login-cancel" @click="close">Close sign-in</button>
    </form>
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
.login-modal { padding: 24px; }
.login-background { position: fixed; inset: 0; background: var(--bg); }
.login-card { position: relative; width: 100%; max-width: 470px; padding: 42px; border: 1px solid var(--line); border-radius: 16px; background: var(--card); color: var(--fg); box-shadow: 0 24px 80px rgba(0, 0, 0, .2); }
.login-brand { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: .68rem; font-weight: 700; letter-spacing: .14em; }
.brand-mark { display: block; width: 32px; height: 32px; border-radius: 9px; }
.brand-divider { height: 14px; width: 1px; background: var(--line); }
h1 { margin: 35px 0 12px; font-size: 2.2rem; font-weight: 700; letter-spacing: -.045em; line-height: 1.12; }
.login-intro { max-width: 340px; color: var(--muted); line-height: 1.6; font-size: .95rem; }
.login-form { margin-top: 32px; }
.login-form .label { font-size: .8rem; margin-bottom: 9px; }
.login-form .input { height: 46px; border-radius: 7px; }
.login-form .input::placeholder { color: var(--muted); opacity: 1; }
.login-form .input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
.login-hint { margin-top: 8px; color: var(--muted); font-size: .78rem; }
.login-submit { display: flex; justify-content: space-between; width: 100%; height: 46px; margin-top: 24px; border-radius: 7px; font-weight: 600; }
.login-cancel { display: block; margin: 22px auto 0; padding: 4px; border: 0; background: transparent; color: var(--muted); cursor: pointer; font: inherit; font-size: .8rem; }
.login-cancel:hover, .login-cancel:focus { color: var(--fg); text-decoration: underline; }
@media (max-width: 500px) { .login-card { padding: 28px; } h1 { font-size: 1.9rem; } }
</style>
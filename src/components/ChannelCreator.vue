<template>
  <div :class="modalClasses">
    <div class="modal-background"></div>
    <form class="modal-card channel-card" role="dialog" aria-modal="true" aria-labelledby="create-channel-title" @submit.prevent="create">
      <header class="channel-header"><div><h2 id="create-channel-title">Create channel</h2><p>Group related feeds in one place.</p></div><button type="button" class="close-button" aria-label="Close" @click="close">×</button></header>
      <section class="channel-body">
        <div class="field">
          <label for="channel-name" class="label">Channel name</label>
          <div class="control"><input type="text" v-model="name" id="channel-name" class="input" placeholder="e.g. Design" required/></div>
        </div>
      </section>
      <footer class="channel-footer">
        <button type="button" class="button is-small" @click="close">Cancel</button>
        <button type="submit" class="button is-primary is-small" :disabled="!name.trim()">Create channel</button>
      </footer>
    </form>
  </div>
</template>

<script>
  import modalA11y from '@/modal-a11y'
  export default {
    mixins: [modalA11y],
    name: "ChannelCreator",
    props:['isOpen'],

    data() {
      return {
        'name': ''
      }
    },


    computed: {
      modalClasses() {
        return {'modal': true, 'is-active': this.isOpen}
      }
    },

    methods: {
      dismissModal() { this.close() },
      close() {
        this.$store.dispatch('closeChannelCreator')
        this.name = ''
      },
      create() {
        this.$store.dispatch('createChannel', this.name)
          .then(() => {
            this.close()
          })
      }
    }

  }
</script>

<style scoped>
.channel-card { width: min(28rem, 94vw); border: 1px solid var(--button-border); border-radius: 10px; background: var(--card); box-shadow: 0 20px 60px #0006; overflow: hidden; }
.channel-header { display: flex; justify-content: space-between; gap: 20px; padding: 22px 24px 18px; border-bottom: 1px solid var(--line); }
.channel-header h2 { margin: 0; color: var(--fg); font-size: 1.1rem; font-weight: 650; letter-spacing: -.02em; }
.channel-header p { margin: 4px 0 0; color: var(--muted); font-size: .8rem; }
.close-button { display: grid; place-items: center; flex: none; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font-size: 1.3rem; cursor: pointer; }
.close-button:hover { color: var(--fg); background: var(--hover-bg); }
.channel-body { padding: 22px 24px 24px; }
.channel-body .label { color: var(--muted); font-size: .8rem; }
.channel-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 24px; border-top: 1px solid var(--line); }
</style>
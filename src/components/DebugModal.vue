<template>
  <div :class="classes">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Debug</p>
        <button class="delete" aria-label="close" @click="close"></button>
      </header>
      <section class="modal-card-body"><pre>{{ JSON.stringify(item, null, 2) }}</pre></section>
      <footer class="modal-card-foot">
        <button class="button" @click="close">Cancel</button>
      </footer>
    </div>
  </div>
</template>

<script>
  export default {
    name: "DebugModal",
    props: ['active', 'item'],
    computed: {
      classes() {
        return {'is-active': this.active, 'modal': true}
      }
    },
    methods: {
      close() {
        this.$emit('close')
      }
    }
  }
</script>

<style scoped>

</style>
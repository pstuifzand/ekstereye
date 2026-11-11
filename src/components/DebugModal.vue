<template>
  <div :class="classes">
    <div class="modal-background"></div>
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Item JSON">
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
  import modalA11y from '@/modal-a11y'

  export default {
    name: "DebugModal",
    mixins: [modalA11y],
    modalOpenProp: 'active',
    modalCloseAction: 'closeDebug',
    props: ['active', 'item'],
    computed: {
      classes() {
        return {'is-active': this.active, 'modal': true}
      }
    },
    methods: {
      close() {
        this.$store.dispatch('closeDebug')
      }
    }
  }
</script>

<style scoped>
  /* Items carry long HTML and image URLs; a non-wrapping <pre> hides most of the JSON
     behind a horizontal scrollbar, which is not "look at the item". */
  .modal-card {
    width: min(56rem, 94vw);
  }

  .modal-card-body pre {
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
    margin: 0;
    padding: 12px;
    border-radius: 4px;
    background: var(--sel, #f4f4f6);
    color: var(--fg, #2f2f2f);
  }
</style>

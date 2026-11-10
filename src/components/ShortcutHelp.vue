<template>
  <div :class="{modal: true, 'is-active': isOpen}">
    <div class="modal-background" @click="close"></div>
    <div class="modal-card shortcuts-card" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <header class="modal-card-head">
        <p class="modal-card-title">Keyboard</p>
        <button class="delete" aria-label="close" @click="close"></button>
      </header>

      <section class="modal-card-body">
        <dl class="shortcut-list">
          <template v-for="shortcut in shortcuts">
            <dt :key="'key-' + shortcut.key"><kbd>{{ shortcut.key }}</kbd></dt>
            <dd :key="'what-' + shortcut.key">{{ shortcut.what }}</dd>
          </template>
        </dl>
      </section>
    </div>
  </div>
</template>

<script>
  import modalA11y from '@/modal-a11y'

  export default {
    name: 'ShortcutHelp',
    mixins: [modalA11y],
    props: ['isOpen'],

    data() {
      return {
        shortcuts: [
          {key: 'j', what: 'Next entry'},
          {key: 'k', what: 'Previous entry'},
          {key: 'o', what: 'Open the entry in a new tab'},
          {key: 'm', what: 'Mark this entry read'},
          {key: 'u', what: 'Toggle read, without telling the server'},
          {key: 'r', what: 'Reply'},
          {key: 'l', what: 'Like'},
          {key: 's', what: 'Open search'},
          {key: 'g', what: 'Back to the newest page'},
          {key: '?', what: 'This list'},
          {key: 'Esc', what: 'Clear the selection, or close this'}
        ]
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
  .shortcuts-card {
    width: min(28rem, 92vw);
  }

  .shortcut-list {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 8px 16px;
    margin: 0;
    align-items: baseline;
  }

  .shortcut-list dt {
    margin: 0;
  }

  .shortcut-list dd {
    margin: 0;
    color: var(--fg, #2f2f2f);
  }

  kbd {
    display: inline-block;
    min-width: 1.6em;
    padding: 1px 6px;
    border: 1px solid var(--line, #e4e4e4);
    border-bottom-width: 2px;
    border-radius: 4px;
    background: var(--card, #fff);
    font-family: monospace;
    font-size: 0.85rem;
    text-align: center;
  }
</style>
